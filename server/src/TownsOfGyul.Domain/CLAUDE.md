# TownsOfGyul.Domain — model decisions

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
  `Trading burrow`, `Chief Engineer`). See `../../../PLAN.md` §3.3. Prefer giving actions a
  target/X payload over a suspended `PendingChoice` state machine — it keeps the engine a pure
  `(state, action) => state` function that SignalR doesn't have to serialize and resume across
  reconnects. A `CustomEffectId` registry is the escape hatch for cards that won't decompose into
  the primitive vocabulary.
- **The Golden Rule ("card text overrides rules") is implemented as named hook points, not a
  literal instruction.** Rules are defaults; effects register as modifiers at five named hooks:
  `CostCalculation` · `ProductionCalculation` · `CapacityCalculation` · `ScoringCalculation` ·
  `DrawStep`. Naming them up front is what stops the Golden Rule from becoming an open-ended
  rabbit hole — a new effect should modify one of these five, not invent a sixth ad hoc.

This project must never reference ASP.NET Core (see root `CLAUDE.md`).
