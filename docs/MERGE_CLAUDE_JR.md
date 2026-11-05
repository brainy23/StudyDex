# Combined frontend merge — 6 November 2026

Branch: `Testing-merge-claude+JR`.

The merge combines `claude-frontend` at `a892c07` with
`clonetestingblooop` at `d310212` using the requested rule:

- Clone supplies behaviour: editable quiz answers, previous/next navigation,
  unanswered-question checks, saved reward review, Pokémon progression and
  evolution, account-persisted weather choices, and improved collection navigation.
- Claude supplies presentation: theme tokens, readable type and controls, Town
  labels/HUD, responsive registration, Learn/Study layouts, the mobile Trainer
  menu, and the existing collection page layout.

The weather chooser follows Clone: an unanswered profile preference opens it;
saved choices are reused across devices. The modal retains Claude's presentation.
Trainer has a single responsive HUD. Its shared Pokémon progress panel remains
visible, with enough width for readable XP and level text. The mobile room menu
uses Clone's destinations, including Pokédex.

The saved-reward display entry point is restored alongside Clone's new reward
queue. Focus/deck completions can display their existing receipts without making
another award call. New regression tests cover that compatibility and the merged
weather/mobile navigation flows. Browser fixtures execute the incoming quiz and
location RPCs against isolated PostgreSQL and do not contact production Supabase.

Validation passed: 251 focused unit tests, 16 PostgreSQL integration checks,
9 browser checks, the production build, scoped ESLint and diff whitespace checks.
The full legacy test suite and all viewport/page combinations were not verified.
Existing large-bundle and duplicate quiz import build warnings remain.

No live Supabase deployment is part of this merge. Clone's new APIs require its
database setup from `docs/pokemon-progression.md`, `docs/quiz-xp-rewards.md` and
`docs/device-location-preference.md`; browser checks use the isolated schema.
Clone's Boss reward path retains its progression/XP-event semantics rather than
the former `record_learning_boss` history entry path. The existing untracked
`docs/RESPONSIVE_HANDOFF.md` is left untouched and is not included in this merge.
