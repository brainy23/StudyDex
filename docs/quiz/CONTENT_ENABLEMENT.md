# Level-based Lab and Arena content — 4 November 2026

Implemented locally on `new-integration-backend` after merge `ac757aa`. No commit,
push, hosting deployment, content import, database mutation or permissions change.
No project dependencies added. The existing named stash has not been applied.

## Final scope

The user first requested content, secure grading and saved attempts, then explicitly
paused quiz backend work and clarified that Mathematics must be enabled in both
Poké Lab and Poké Arena. This implementation enables learning content and ungraded
question previews only. Grading, saved attempts, daily attempt limits, XP and packs
remain paused. No grading installation SQL has been prepared or executed.

## Resulting behavior

- Selection uses the authenticated profile's saved school level, not a URL level.
  Mathematics is supported at P1–P6; Science starts at P3. Only supported subjects
  with topics for that level are shown. Existing topic RLS independently filters
  content by the own-profile level.
- Learn/Flashcards and direct links use the filtered catalogue. Wrong-level or
  mismatched subject/topic links show an unavailable message without fetching that
  topic's learning resources. Invalid subject selection no longer falls back to Science.
- Arena topics come from database topic UUIDs and usable `quiz` questions, replacing
  bundled Science demo keys. Dashboard links using topic UUIDs now use the same flow.
- Availability checks exclude empty question text, unsupported types, fewer than two
  or more than four options, duplicate/mismatched option IDs/text/order and missing
  option text. Questions/options are paginated and batched; a permission error is
  shown with retry instead of silently substituting demo content.
- Arena previews up to five distinct questions, or every available usable question
  for a smaller bank. Options retain `option_order`; selection uses option UUIDs.
  Selecting an option is neutral: no correctness feedback, score, grading explanation,
  attack based on correctness, attempt persistence, XP or reward write.
- The bank has no Standard/Foundation track discriminator. The old Science demo's
  Standard/Foundation picker was removed rather than falsely applying it to database
  questions. Existing Arena artwork, room layouts and subject themes are retained.
- Maths question/example/flashcard line breaks, spaces and Unicode symbols are
  preserved. Optional images remain guarded. Lessons no longer wait on decorative
  Pokémon requests before becoming readable.

## Actual approved database check

The user approved `01_read_only_preflight.sql`, SHA-256
`a543e481225aa6907d13fc4af684cd1af014d2b8ee15d222b423bbefb3b358b7`,
plus scoped project/migration metadata reads. It ran in a repeatable-read, read-only
transaction against project `sbrteylcizwkzetcqdro`, PostgreSQL 17.11, captured
4 November 2026 at 21:44 SGT. Evidence: `preflight_20261104.json`,
`project_20261104.json`, `migrations_20261104.json`.

| Level | Maths regular questions | Science regular questions |
| --- | ---: | ---: |
| P1 | 80 | 0 |
| P2 | 100 | 0 |
| P3 | 110 | 36 |
| P4 | 110 | 56 |
| P5 | 120 | 66 |
| P6 | 110 | 58 |

These are current existing database counts, not the older proposed import package.
All regular questions counted passed this probe's structural checks for answer-key
presence and matching option membership. This does not independently certify every
question's mathematical or curriculum correctness. No raw answer key, explanation
or student record was returned. Aggregate preservation fingerprints were captured.
No imports or data repair were needed for this phase.

`question_answers`, `quiz_attempts` and `quiz_attempt_answers` have RLS enabled and
no policies in this snapshot. Existing broad table grants alone do not override RLS;
do not interpret an empty history response as proof that secure persistence exists.
Any later grading implementation/permissions changes require fresh review and exact
SQL approval. The read-only preflight approval is not deployment approval.

## Changed files

| Files | Purpose |
| --- | --- |
| `src/utils/studyCatalogue.js` | Shared profile-level and supported-subject filtering |
| `src/services/studyService.js` | Filtered student catalogue wrapper; existing explicit public field lists retained |
| `src/services/quizPreviewService.js` | Public question/option availability, pagination, safe ordering, direct-topic validation and five-question previews |
| `src/views/SubjectsView.vue`, `TopicsView.vue`, `StudyModeView.vue` | Correct catalogue selection, counts, topic IDs and unavailable states |
| `src/views/LearnView.vue`, `studyView.vue` | Filtered content access; lesson whitespace and independent buddy loading |
| `src/views/quizView.vue` | Supabase Math/Science previews in the accepted Arena layout; remove local demo grading |
| `src/utils/__tests__/studyCatalogue.spec.js`, `src/services/__tests__/quizPreviewService.spec.js`, `src/views/__tests__/LevelContent.spec.js` | 35 new unit tests |
| `e2e/content.spec.js`, `playwright.content.config.js` | Eight isolated Chrome content journeys using synthetic Auth and public content |

## Verification

- **94 focused unit tests pass**, seven files, including onboarding regressions and
  all 35 new content tests. Checks include P1–P6 filtering, short banks, pagination,
  invalid direct links, ordering, denied reads/retry, null image paths, neutral preview
  selections, Unicode/line breaks and lessons while the buddy request is pending.
- **8 Chrome journeys pass**, synthetic fixtures only: all six levels' Lab/Arena
  selection; P1 Maths Learn → Flashcards → Arena; wrong-level links and retry. Fixtures
  reject live Supabase URLs and assert no answer-key requests or database writes.
- **Build passes**, retaining existing large-chunk and duplicate quiz import warnings.
- **Changed-file ESLint passes**; `git diff --check` passes.
- **Full unit suite: 238 pass, 56 fail, 294 total**, four failed files. No new failing
  test names compared with the saved earlier baseline. Existing failures are in
  `flow.spec.js`, `ArenaView.spec.js`, `StudyView.spec.js` and
  `StudyFlashcards.integration.spec.js`, including old design assertions/weather setup.
- **`pnpm lint` fails** on existing `Timer.vue:45` unused expression and
  `accountService.spec.js:91` assertion message. It stops before full ESLint. No lint
  autofixes were retained; unrelated files were preserved.

Actual commands used:

```sh
pnpm test:unit --run --config /private/tmp/studydex-onboarding-app-20261104/unit.config.mjs
pnpm build --config /private/tmp/studydex-onboarding-app-20261104/build.config.mjs
pnpm exec playwright test --config playwright.content.config.js
pnpm lint
git diff --check
```

The temporary unit/build configs set `envDir: false` and send build/cache output to
temporary storage, preserving local environment files and generated repo folders.
The browser config is in the repo and uses the existing synthetic Vite fixture config.
Logs are `/private/tmp/studydex-content-*-20261104.log`. Standard team commands remain
`pnpm test:unit --run`, `pnpm build`, `pnpm lint`; they were not substituted for evidence
of the environment-isolated agent runs above.

## Unverified and next work

Real authenticated HTTP through production RLS, full manual/mobile visual acceptance,
all real content rendering, account switching during slow requests, and live
cross-device use remain unverified. The preflight verifies metadata/counts rather
than a signed-in user's end-to-end lesson/quiz read.

Later, only after the user resumes it: server-issued grading sessions, own-user
validation, atomic/idempotent attempt+answer writes, own-history reading, daily limit
decision, and separate trusted XP/pack rules. Keep private answer keys server-side.
Existing Town local-only buddy switching, Trainer sample collection and Rewards
sample pack state are unchanged by this content work.
