# Towns of G'yul

A two-player digital adaptation of **Towns of G'yul**, a 1v1 tabletop card game about
growing a town: reveal buildings, staff them with townsfolk, chain production into
victory points, and race your opponent to 50 VP — or mill their deck to nothing.

Playable hot-seat in a single browser first, then over the network in real time.

## Tech stack

| Layer | Choice |
|---|---|
| Client | React + TypeScript, built with Vite |
| Server | ASP.NET Core (.NET 10 LTS) Web API |
| Realtime | SignalR (added in Phase 5) |
| Tests | xUnit |

### Architecture

The rules engine lives in **`TownsOfGyul.Domain`**, a pure C# library that
**never references ASP.NET Core**. The API project translates between DTOs and
Domain objects; nothing in the Domain knows a web server exists.

That one constraint buys three things:

- the full rules engine is unit-testable with no server running,
- hot-seat and networked play are the *same* engine reached by different transports,
- a future AI opponent is just another caller of the same actions.

Card abilities are modelled as a small closed vocabulary of effects, hand-authored
per card rather than parsed from prose — the standard approach in digital card
games, because card text is a targeting-and-timing problem, not a text problem.

## Project structure

```
TOG/
├── client/                         # Vite + React + TS
│   └── src/{api,components,hooks,state,types}/
├── server/
│   ├── TownsOfGyul.sln
│   ├── src/
│   │   ├── TownsOfGyul.Domain/     # pure rules engine, zero web dependencies
│   │   ├── TownsOfGyul.CardData/   # card catalog + JSON seed data
│   │   └── TownsOfGyul.Api/        # ASP.NET Core Web API (+ Hubs/ later)
│   └── tests/
│       ├── TownsOfGyul.Domain.Tests/
│       └── TownsOfGyul.Api.IntegrationTests/
├── Cards/                          # card text — the authoring source
└── Rules.md                        # the tabletop rules this implements
```

## Running locally

> Requires the [.NET 10 SDK](https://dotnet.microsoft.com/download) and
> [Node.js 22 LTS](https://nodejs.org/).

```bash
# API — http://localhost:5000 (Swagger at /swagger)
cd server
dotnet run --project src/TownsOfGyul.Api

# Client — http://localhost:5173, proxies /api to the server
cd client
npm install
npm run dev
```

```bash
# Tests
cd server
dotnet test
```

## Roadmap

- [ ] **Phase 0** — tooling scaffolding, `GET /api/health` reachable from the client
- [ ] **Phase 1** — core domain model and rules engine (no UI, no web)
- [ ] **Phase 2** — minimal Web API over the engine
- [ ] **Phase 3** — React hot-seat UI *(first fully playable milestone)*
- [ ] **Phase 4** — card ability/effect coverage pass
- [ ] **Phase 5** — real-time networked multiplayer over SignalR
- [ ] **Phase 6** — polish: card art, rule-based AI opponent, deployment

Screenshots land here once Phase 3 exists.

## Design source

The game design lives alongside the code: [`Rules.md`](Rules.md) for the tabletop
rules, [`Cards/`](Cards/) for card text. Card abilities are authored in Markdown and
paired with structured effect definitions in the server's seed data.

## License

[MIT](LICENSE)
