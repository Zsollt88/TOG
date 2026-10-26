# client/ — React + TypeScript (Vite)

## Layout

- `src/api/` — typed `fetch` wrappers, one file per server resource. Always relative `/api/...`
  URLs; the Vite dev proxy (`vite.config.ts`) forwards them to `http://localhost:5000`.
- `src/types/` — TS mirrors of server DTOs (camelCase, as ASP.NET Core serializes them) and
  UI state unions.
- `src/hooks/` — data-fetching / stateful logic. Components never call `src/api/` directly.
- `src/components/` — presentational components; receive state via props.
- `src/state/` — game-wide client state (empty until Phase 3).

## Conventions

- Model async UI state as a discriminated union on `kind` (see `types/health.ts`), not as
  separate `loading`/`error`/`data` booleans.
- Effects that fetch must abort on cleanup — StrictMode mounts twice in dev.
- Only display what the server's `PlayerView` sends (Phase 2+); never reconstruct hidden info.

## Commands

`npm run dev` · `npm run build` (typecheck + bundle) · `npm run lint` (oxlint)
