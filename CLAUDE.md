# Towns of G'yul

Two-player digital adaptation of a 1v1 tabletop card game: reveal buildings, staff them with
townsfolk, chain production into victory points, race to 50 VP or mill the opponent's deck to
nothing. Hot-seat in one browser first, then real-time over the network.

**Stack:** React + TypeScript (Vite) client · ASP.NET Core (.NET 10 LTS) server · SignalR added
later for realtime · xUnit for tests.

## Hard architectural constraint

`TownsOfGyul.Domain` must never reference ASP.NET Core. The API project translates between DTOs
and Domain objects — nothing in the Domain may know a web server exists. This is what keeps the
rules engine unit-testable with no server running, lets hot-seat and networked play share one
engine, and lets a future AI opponent just be another caller of the same actions.

Keep this file managable in order to avoid unnecessary context loading. This file can not be bigger
than 20 KB.

## Confirmed decisions

- **D1 — Repo root is this folder (`TOG/`).** `Rules.md`, `Cards/`, and `PLAN.md` live beside
  `client/` and `server/` in one repo.
- **D2 — Turn flow: strict alternation, one action per player.** Both players untap/draw at a
  shared Upkeep, then alternate single actions. A player who passes is out for the rest of the
  round and is skipped; the round ends when both have passed, then a shared Scoring phase runs.
- **D3 — Unlimited copies of a card are legal**, in both the building zone and the deck.
- **D4 — Split card source.** Markdown stays the authoring format for card *text*; a
  hand-authored JSON file holds the structured *effects*, keyed by card id. Merged at startup.
- **D5 — Town-specific and neutral cards.** Each player picks one town; towns are not exclusive
  (both players may pick the same one), and more towns will be added later. A town-specific card
  can only go in the building zone and deck of its own town; a neutral card can go in any town's.
  The MVP has only town-specific cards (`8th`, `Ice Tusk`). Neutral cards come later. Towns are
  data, not an enum: `CardDefinition.TownId` is the card's `Cards/` folder name (`null` = neutral),
  so a new town is a new folder with no Domain code change.

## Domain model decisions

> Currently living here because `server/src/TownsOfGyul.Domain/` doesn't exist yet. **Relocate
> this whole section to `server/src/TownsOfGyul.Domain/CLAUDE.md` once that folder is scaffolded
> (Phase 1) and leave a one-line pointer here instead of a duplicate.**

- **Definitions vs. instances.** D3 makes card identity load-bearing — six Furnaces in a building
  zone are six *instances* of one *definition*, and several cards depend on counting them
  (`Furnace operator` produces per active Furnace; `Hunter` forbids more than two of itself in
  play). The Domain models both: an immutable `CardDefinition` catalog entry (with
  `BuildingDefinition`/`PersonDefinition`/`EventDefinition` subtypes) and a mutable
  `CardInstance` game-state entity, many of which may share one `DefinitionId`. `IsFaceUp` and
  `IsUsed` are independent state on an instance — "used" is the Upkeep-cleared tap, "face-up" is
  whether a building has been revealed.
- **Building cost is computed, not stored.** A building's cost is a function of game state (how
  many same-level buildings are already face-up), not a property of the card — modeled as
  `IBuildingCostCalculator(GameState, BuildingLevel)`, not a field on the card record. Persons and
  Events *do* carry real per-card costs, which is why they're separate record types rather than
  one record with a permanently-null cost field. Capacity is likewise face-up-only: buildings that
  are face-down occupy slots and count toward level limits but grant no capacity or production.
- **The effect model — three axes, not just "what happens."** `EffectDefinition` needs
  `Trigger` (OnPlay | OnActivate | OnScoring | Continuous), `Duration` (Instant | ThisRound |
  NextOpponentRound | WhileInPlay), and `Target` (nullable — null means the effect touches no
  card), on top of the action itself. Concrete cards force each axis: `Lava spinner`'s
  recurring `OnScoring` VP differs from `Trading burrow`'s instant `OnPlay` VP; `Delayed cargo`
  suppresses production *next round* while `Chant of the Father` only buffs *this* round.
  `TargetSpec` separates *what* is touched (`Owner`, `Filter`, `Count`) from *who decides*
  (`Selection`: `Automatic` — engine resolves at resolution time, e.g. "all of your Hunters" —
  or `PlayerChosen` — the payload carries the picks and the engine only validates them, e.g.
  `Trading burrow`, `Chief Engineer`). See `PLAN.md` §3.3. Prefer giving actions a
  target/X payload over a suspended `PendingChoice` state machine — it keeps the engine a pure
  `(state, action) => state` function that SignalR doesn't have to serialize and resume across
  reconnects. A `CustomEffectId` registry is the escape hatch for cards that won't decompose into
  the primitive vocabulary.
- **The Golden Rule ("card text overrides rules") is implemented as named hook points, not a
  literal instruction.** Rules are defaults; effects register as modifiers at five named hooks:
  `CostCalculation` · `ProductionCalculation` · `CapacityCalculation` · `ScoringCalculation` ·
  `DrawStep`. Naming them up front is what stops the Golden Rule from becoming an open-ended
  rabbit hole — a new effect should modify one of these five, not invent a sixth ad hoc.

## Open Rules Questions

A house-rules register — decide these deliberately rather than by whatever the code happens to do
first. Append anything newly discovered here rather than settling it ad hoc.

1. **Simultaneous 50 VP** in one Scoring phase — who wins? Not hypothetical: `Enterance of the
   Deep World` grants 10 VP *and* mills 20 of your own deck, so a VP win and a self-deck-out can
   land in the same phase. Which takes precedence, and is a draw possible?
2. **Deck copy limits** — D3 says unlimited. Worth confirming there is no per-card cap, given
   `Hunter` self-limits to two in play (which implies no global rule exists).
3. **The "blocked" card state** appears in `Fisher of dead fish` ("face-up, non-blocked") and is
   created by `Blizzard`, but is absent from `Rules.md`. Needs defining — it's why
   `EffectDefinition` carries a `SetStatus` action.
4. **Deck-out timing** — `Rules.md` checks it at the *start of Upkeep*, not continuously. Confirm
   mid-round milling (`Power of Ice`, `Irritating polution`, `Enterance of the Deep World`) doesn't
   end the game until the next Upkeep.
5. **`Work harder`** — ability text is truncated mid-sentence ("Pay X common resource and all of
   your townfols from the Worker faction") and has no verb. Needs a ruling before it can be
   authored.
6. **`Hunter`'s self-limit** — "You do not have more than two Hunter in the play area at the same
   time" is a `PlayRestriction`, not an effect. Confirm it blocks *playing* a third rather than
   discarding one.

## Coding Conventions

Formatting — indentation, brace style, line endings, `var` usage — is already governed by
`.editorconfig` (4-space C#/general, 2-space JS/TS/JSON/CSS, LF endings, Allman braces). Don't
restate formatting rules here; this section is for conventions `.editorconfig` can't express.

- Every suggestion should based on the SOLID principles.
- Do not use one liner expressions.
- Use only short and talkative comments.

## Repo map

```
TOG/
├── CLAUDE.md                            # this file — always loaded
├── Cards/                                # card text authoring source — see Cards/CLAUDE.md
│   ├── 8th/                              # rival town (spans all 5 factions)
│   └── Ice Tusk/                         # rival town (spans all 5 factions)
├── Rules.md                              # tabletop rules this implements
├── README.md                             # public project pitch/stack/roadmap
├── PLAN.md                               # gitignored phase-by-phase build roadmap (scratch)
├── client/                               # NOT YET SCAFFOLDED — Vite + React + TS
│   └── src/{api,components,hooks,state,types}/
└── server/                               # NOT YET SCAFFOLDED
    ├── src/
    │   ├── TownsOfGyul.Domain/           # pure C# rules engine, zero web deps
    │   ├── TownsOfGyul.CardData/         # card catalog + JSON seed data
    │   └── TownsOfGyul.Api/              # ASP.NET Core Web API (+ Hubs/ later)
    └── tests/
        ├── TownsOfGyul.Domain.Tests/
        └── TownsOfGyul.Api.IntegrationTests/
```

## Future CLAUDE.md checklist

Add these as each folder is scaffolded (phases per `PLAN.md` §4) — don't pre-create them empty:

| Folder | Add CLAUDE.md at | Covers |
|---|---|---|
| `client/` | Phase 0 | React/TS conventions, component/hook/state patterns |
| `server/src/TownsOfGyul.Domain/` | Phase 1 | Domain model rules — receives the "Domain model decisions" section above |
| `server/src/TownsOfGyul.CardData/` | Phase 1–2 | Seed JSON authoring/merge conventions |
| `server/src/TownsOfGyul.Api/` | Phase 2 | Controller/DTO conventions, `PlayerView` redaction pattern |
