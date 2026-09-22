# Cards/ — card text authoring source

Markdown here is the authoring format for card *text* (see `../CLAUDE.md` D4). A committed
converter will emit `server/src/TownsOfGyul.CardData/Seed/cards.text.json` from these files once
`TownsOfGyul.CardData` exists; a hand-authored `cards.effects.json` supplies the structured
effects separately, keyed by card id.

Two sets exist today, `8th/` and `Ice Tusk/` — rival sets, not factions; each spans all five
factions (Worker, Scientist, Religious, Leader, Merchant).

## Format

Each card is a `##Card Name##` header followed by `Field: value,` lines.

## Normalize toward these field names and spellings

The existing files have drift — when editing or adding cards, use the canonical form on the left,
not the variants on the right:

| Canonical | Drifted variants seen in the files |
|---|---|
| `Gold` | `Gold cost:` |
| `Scientist` | `Scientiest` |
| `Religious` | `Religous` |
| `Townsfolks` | `Townfolks` (note even the filenames disagree: `8th_Townfolks.md` vs `Ice_Tusk_Townsfolks.md`) |
| `Captain` | `Captian` |

Fix these in place as you touch a card entry — don't leave new drift, and don't invent a third
spelling.

## Blocked on a ruling

Two cards can't be fully normalized yet because their text needs a decision first — see
`../CLAUDE.md` "Open Rules Questions" items 5 and 6:

- **`Work harder`** — ability text is truncated mid-sentence and has no verb.
- **`Hunter`** — its self-limit belongs in `PlayRestriction`, not as a parsed effect; don't encode
  it as an `Ability:` effect line.

## See also

- `../Rules.md` — the tabletop rules this card content implements.
- `../CLAUDE.md` — repo-wide architecture and coding conventions, relevant once this content
  starts feeding the C# converter/seed pipeline.
