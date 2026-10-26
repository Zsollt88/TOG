#!/usr/bin/env node
// Passive token-usage tracker for Claude Code sessions on this project.
// Reads session transcripts, stores per-session totals in a ledger, prints a report.
//
// Usage:
//   node tools/token-usage/token-usage.mjs [--since YYYY-MM-DD] [--root <path>] [--no-save] [--json]

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const LEDGER_PATH = path.join(SCRIPT_DIR, "ledger.json");
const PROJECTS_DIR = path.join(os.homedir(), ".claude", "projects");

// Sessions started in the repo's parent folder count too, so default to it.
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, "..", "..", "..");

// Matches shell commands that actually read the file, not ones that only find it.
const PLAN_BASH_READ = /\b(cat|head|tail|sed|less|more|grep|awk)\b[^|;&]*PLAN\.md/;

// ---------- CLI ----------

function parseArgs(argv) {
  const options = { since: null, root: DEFAULT_ROOT, save: true, json: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--since") {
      options.since = argv[++i];
    } else if (arg === "--root") {
      options.root = path.resolve(argv[++i]);
    } else if (arg === "--no-save") {
      options.save = false;
    } else if (arg === "--json") {
      options.json = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

// ---------- Transcript discovery ----------

// Claude Code names a project folder by replacing every non-alphanumeric char with "-".
function encodeProjectPath(projectPath) {
  return projectPath.replace(/[^a-zA-Z0-9]/g, "-");
}

function findProjectDirs(root) {
  if (!fs.existsSync(PROJECTS_DIR)) {
    return [];
  }

  const prefix = encodeProjectPath(root);
  const names = fs.readdirSync(PROJECTS_DIR);
  const matching = names.filter((name) => name.startsWith(prefix));

  return matching.map((name) => path.join(PROJECTS_DIR, name));
}

function findSubagentFiles(projectDir, sessionId) {
  const subagentDir = path.join(projectDir, sessionId, "subagents");

  if (!fs.existsSync(subagentDir)) {
    return [];
  }

  const names = fs.readdirSync(subagentDir).filter((name) => name.endsWith(".jsonl"));

  return names.map((name) => path.join(subagentDir, name));
}

function findSessions(root) {
  const sessions = [];

  for (const projectDir of findProjectDirs(root)) {
    const mainFiles = fs.readdirSync(projectDir).filter((name) => name.endsWith(".jsonl"));

    for (const fileName of mainFiles) {
      const sessionId = path.basename(fileName, ".jsonl");

      sessions.push({
        sessionId,
        mainFile: path.join(projectDir, fileName),
        subagentFiles: findSubagentFiles(projectDir, sessionId),
      });
    }
  }

  return sessions;
}

function readJsonl(filePath) {
  const entries = [];
  const lines = fs.readFileSync(filePath, "utf8").split("\n");

  for (const line of lines) {
    if (line.trim() === "") {
      continue;
    }

    // A session still being written can end in a partial line.
    try {
      entries.push(JSON.parse(line));
    } catch {
      continue;
    }
  }

  return entries;
}

// ---------- Cost weighting ----------

// Price multipliers relative to plain input tokens (Anthropic pricing, 2026-10).
const WEIGHTS = {
  input: 1,
  cacheWrite5m: 1.25,
  cacheWrite1h: 2,
  cacheReadDefault: 0.1,
  output: 5,
};

// Models whose cache reads deviate from the default 0.1x.
const CACHE_READ_WEIGHT = {
  "claude-opus-5-5": 0.05,
  "claude-fable-5-1": 0.025,
};

// Converts one API call's usage into "input-equivalent tokens" (IET):
// the number of plain input tokens that would have cost the same.
//
// usage fields:
//   input_tokens, output_tokens, cache_read_input_tokens,
//   cache_creation_input_tokens  (total cache writes),
//   cache_creation.ephemeral_5m_input_tokens / ephemeral_1h_input_tokens  (may be missing)
// model: e.g. "claude-opus-5-5"; cache-read pricing differs per model.
function weightedTokens(usage, model) {
  const cacheCreation = usage.cache_creation;
  let cacheWrites = 0;

  if (cacheCreation) {
    cacheWrites += (cacheCreation.ephemeral_5m_input_tokens ?? 0) * WEIGHTS.cacheWrite5m;
    cacheWrites += (cacheCreation.ephemeral_1h_input_tokens ?? 0) * WEIGHTS.cacheWrite1h;
  } else {
    // No breakdown: assume the 1-hour cache, which Claude Code sessions use.
    cacheWrites += (usage.cache_creation_input_tokens ?? 0) * WEIGHTS.cacheWrite1h;
  }

  const cacheReadWeight = CACHE_READ_WEIGHT[model] ?? WEIGHTS.cacheReadDefault;

  let total = 0;
  total += (usage.input_tokens ?? 0) * WEIGHTS.input;
  total += cacheWrites;
  total += (usage.cache_read_input_tokens ?? 0) * cacheReadWeight;
  total += (usage.output_tokens ?? 0) * WEIGHTS.output;

  return total;
}

// ---------- Session analysis ----------

// One API response is written once per content block, so dedupe by message id.
function collectApiCalls(entries, calls) {
  for (const entry of entries) {
    const isAssistant = entry.type === "assistant";
    const usage = entry.message?.usage;

    if (!isAssistant || !usage) {
      continue;
    }

    calls.set(entry.message.id, { model: entry.message.model, usage });
  }
}

function toolUsesOf(entry) {
  const content = entry.message?.content;

  if (entry.type !== "assistant" || !Array.isArray(content)) {
    return [];
  }

  return content.filter((block) => block.type === "tool_use");
}

function isPlanRead(toolUse) {
  const input = toolUse.input ?? {};

  if (toolUse.name === "Read" || toolUse.name === "Grep") {
    const target = input.file_path ?? input.path ?? "";
    return target.endsWith("PLAN.md");
  }

  if (toolUse.name === "Bash") {
    return PLAN_BASH_READ.test(input.command ?? "");
  }

  return false;
}

// An @PLAN.md mention in the prompt attaches the file without any tool call.
function isPlanAttachment(entry) {
  if (entry.type !== "attachment") {
    return false;
  }

  const attachedPath = entry.attachment?.filename ?? entry.attachment?.path ?? "";
  return attachedPath.endsWith("PLAN.md");
}

function detectPlanRead(entries) {
  for (const entry of entries) {
    if (isPlanAttachment(entry)) {
      return true;
    }

    if (toolUsesOf(entry).some(isPlanRead)) {
      return true;
    }
  }

  return false;
}

function mostFrequent(values) {
  const counts = new Map();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  let best = null;
  let bestCount = 0;

  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }

  return best;
}

// Claude Code's own dollar figure for the session; the last entry is the final total.
function lastReportedCost(entries) {
  let cost = null;

  for (const entry of entries) {
    if (entry.type === "cost-state" && typeof entry.totalCostUSD === "number") {
      cost = entry.totalCostUSD;
    }
  }

  return cost;
}

function summarizeSession(session) {
  const mainEntries = readJsonl(session.mainFile);
  const calls = new Map();
  let planRead = detectPlanRead(mainEntries);

  collectApiCalls(mainEntries, calls);

  for (const subagentFile of session.subagentFiles) {
    const subEntries = readJsonl(subagentFile);
    collectApiCalls(subEntries, calls);
    planRead = planRead || detectPlanRead(subEntries);
  }

  const timestamps = mainEntries.map((entry) => entry.timestamp).filter(Boolean).sort();
  const branches = mainEntries.map((entry) => entry.gitBranch).filter(Boolean);

  let iet = 0;
  let outputTokens = 0;

  for (const call of calls.values()) {
    iet += weightedTokens(call.usage, call.model);
    outputTokens += call.usage.output_tokens ?? 0;
  }

  return {
    sessionId: session.sessionId,
    start: timestamps[0] ?? null,
    end: timestamps[timestamps.length - 1] ?? null,
    branch: mostFrequent(branches) ?? "unknown",
    apiCalls: calls.size,
    subagents: session.subagentFiles.length,
    outputTokens,
    iet: Math.round(iet),
    usd: lastReportedCost(mainEntries),
    planRead,
  };
}

// ---------- Ledger ----------

// The ledger outlives transcripts, which Claude Code deletes after cleanupPeriodDays.
function loadLedger() {
  if (!fs.existsSync(LEDGER_PATH)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(LEDGER_PATH, "utf8"));
}

function mergeIntoLedger(ledger, summaries) {
  for (const summary of summaries) {
    ledger[summary.sessionId] = summary;
  }

  return ledger;
}

function saveLedger(ledger) {
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2) + "\n");
}

// ---------- Report ----------

function formatNumber(value) {
  if (value === null || value === undefined) {
    return "-";
  }

  return Math.round(value).toLocaleString("en-US");
}

function formatUsd(value) {
  if (value === null || value === undefined) {
    return "-";
  }

  return "$" + value.toFixed(2);
}

function printTable(headers, rows) {
  const widths = headers.map((header, col) => {
    const cellWidths = rows.map((row) => String(row[col]).length);
    return Math.max(header.length, ...cellWidths);
  });

  const renderRow = (cells) => cells.map((cell, col) => String(cell).padEnd(widths[col])).join("  ");

  console.log(renderRow(headers));
  console.log(widths.map((width) => "-".repeat(width)).join("  "));

  for (const row of rows) {
    console.log(renderRow(row));
  }

  console.log();
}

function aggregate(sessions) {
  const totals = { sessions: sessions.length, apiCalls: 0, iet: 0, usd: 0, usdKnown: 0 };

  for (const session of sessions) {
    totals.apiCalls += session.apiCalls;
    totals.iet += session.iet;

    if (session.usd !== null) {
      totals.usd += session.usd;
      totals.usdKnown += 1;
    }
  }

  return totals;
}

function groupBy(sessions, keyOf) {
  const groups = new Map();

  for (const session of sessions) {
    const key = keyOf(session);

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(session);
  }

  return groups;
}

function groupRows(groups) {
  const rows = [];

  for (const [key, sessions] of groups) {
    const totals = aggregate(sessions);
    const ietPerCall = totals.apiCalls > 0 ? totals.iet / totals.apiCalls : 0;
    const ietPerSession = totals.iet / totals.sessions;

    rows.push([
      key,
      totals.sessions,
      totals.apiCalls,
      formatNumber(totals.iet),
      formatNumber(ietPerSession),
      formatNumber(ietPerCall),
      formatUsd(totals.usd),
    ]);
  }

  return rows;
}

function printReport(sessions) {
  const sorted = [...sessions].sort((a, b) => String(a.start).localeCompare(String(b.start)));

  console.log("\nSESSIONS  (IET = input-equivalent tokens)\n");
  printTable(
    ["Date", "Session", "Branch", "Calls", "IET", "IET/call", "API-eq $", "PLAN.md"],
    sorted.map((s) => [
      String(s.start).slice(0, 10),
      s.sessionId.slice(0, 8),
      s.branch,
      s.apiCalls,
      formatNumber(s.iet),
      formatNumber(s.apiCalls > 0 ? s.iet / s.apiCalls : 0),
      formatUsd(s.usd),
      s.planRead ? "read" : "-",
    ]),
  );

  const groupHeaders = ["Group", "Sessions", "Calls", "IET", "IET/session", "IET/call", "API-eq $"];

  console.log("BY BRANCH (phase)\n");
  printTable(groupHeaders, groupRows(groupBy(sorted, (s) => s.branch)));

  console.log("BY PLAN.md USAGE\n");
  printTable(groupHeaders, groupRows(groupBy(sorted, (s) => (s.planRead ? "PLAN.md read" : "not read"))));

  console.log("Note: correlation only. Sessions differ in task, size and difficulty.");
  console.log("API-eq $ is the API-price equivalent, not a subscription charge. Use /usage for plan limits.\n");
}

// ---------- Main ----------

function main() {
  const options = parseArgs(process.argv.slice(2));
  const summaries = findSessions(options.root).map(summarizeSession);

  let ledger = mergeIntoLedger(loadLedger(), summaries);

  if (options.save) {
    saveLedger(ledger);
  }

  let sessions = Object.values(ledger);

  if (options.since) {
    sessions = sessions.filter((s) => String(s.start) >= options.since);
  }

  if (options.json) {
    console.log(JSON.stringify(sessions, null, 2));
  } else {
    printReport(sessions);
  }
}

main();
