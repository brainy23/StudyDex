# Arena design merge and Mathematics visibility

3 November 2026 (Asia/Singapore). Prepared for review, **not committed or pushed**.

## Location and Git state

- Target: `integration/user-registration`, now in the original project folder: `/Users/javanchua/Documents/SMU/IS216 WAD2/Group Project/StudyDex`.
- Original target HEAD: `f07328e5b2e689c6ea9da32611e35cd5de052878`.
- Backup: `backup/integration-before-latest-arena-2026-11-03`, pointing to that original HEAD.
- Incoming: `origin/designed-poke-arena` at `4edbee64267e26c860608a7d796e4c217564a92b`. Includes the fetched QuestPhone/components changes.
- Merge uses `--no-commit --no-ff`: conflict resolution and fixes are staged for review, with no merge commit yet. HEAD remains the original target until you authorize a commit.
- The resolved merge was transferred back from the temporary worktree without a commit or push. The temporary checkout is detached and retains a complete snapshot. All 35 original audit/note files were preserved; the older handoff is `docs/HANDOFF.before-arena-merge-2026-11-03.md`. The transfer backup is `/private/tmp/studydex-transfer-20261103-_spp6yqx`.
- Latest admin, landing and tutorial branch updates were reviewed earlier but are not included in this merge.

## What changed

Mathematics is enabled when the saved student's level has accessible published topics. Subject selection uses the real catalogue, so Mathematics works for P1–P6 and Science is unavailable at levels without Science topics. English remains an unavailable placeholder unless real content exists.

Topic selection and Learn/Study mode selection are now subject-neutral. Mathematics uses its actual topic IDs and level-filtered lesson/card/question requests. Canonical `topic_id` links and legacy `topic` links both work. Unknown/mismatched topic/subject links do not fall back to another subject. Permission errors stay visible instead of substituting invented demo content.

New selectors, classroom artwork, clock/weather presentation and QuestPhone are included. The classroom presentation is extracted to `StudyClassroom.vue` around the existing `StudyLearn` engine. The roadmap, examples, plant concept interaction, completion handling, keyboard support and reduced-motion behavior remain. Learn/Flashcards share their existing review and focus-timer state; the new mobile controls use a readable two-column layout.

Formal Arena remains connected to the actual Supabase question/options bank as an **ungraded preview**. The incoming local Science grading/demo bank is not used. Optional public-flashcard practice stays optional and preserves progress regardless of outcome; no automatic fast-rating encounters or loss resets. No scoring/attempt/reward backend was added.

A stale cached-slot render during topic changes was guarded, resolving the previously observed null `topic.name` unit errors.

## Conflict resolutions

| File | Resolution |
| --- | --- |
| `src/components/study/StudyLearn.vue` | Retained the integration learning engine and valid roadmap/plant imports; moved new scene artwork into a separate presentation wrapper. No missing ClassroomPokemon/Environment imports. |
| `src/router/index.js` | Preserved auth, tutorial, account and legacy-topic handling; added authenticated selection routes. |
| `src/views/quizView.vue` | Preserved public-field Supabase question previews, stable option IDs, explicit ungraded state and arrival handling; root entry opens the new selector. |
| `src/views/studyView.vue` | Preserved shared timer/review/practice/transition behavior; added new classroom presentation and selector entry; guarded stale slots. |

## Main files

- `src/views/{SubjectsView,TopicsView,StudyModeView}.vue`: real catalogue-driven selection and Mathematics navigation.
- `src/composables/useStudySelection.js`: shared safe profile/catalogue loading, errors and stale-response protection.
- `src/components/study/StudyClassroom.vue`: incoming classroom artwork/interactions with slots for the real learning engine.
- `src/views/{studyView,quizView,LearnView}.vue`, `src/router/{index,selectionRoutes}.js`: integrated entry, compatibility and preserved shared workflows.
- Incoming `QuestPhone.vue`, `ClockWeather.vue`, `HomeView2.vue`, selection CSS and artwork: merged presentation updates.
- `src/views/__tests__/SelectionViews.spec.js`, router flow tests: P1–P6 enablement, routing, errors, unavailable content and compatibility.
- `e2e/math-selection.spec.js`, `e2e/fixtures/lab.js`, `playwright.math.config.js`, `vite.fixture.config.js`: isolated synthetic browser verification; local credentials are never loaded by the fixture server.

## Validation

- Full unit suite: **246 passed across 26 files**, exit 0; no unhandled errors. Fifteen selection regression cases cover P1–P6 and both study/quiz flows.
- Focused Chrome browser checks: **2 passed**, mobile P1 (390px) and desktop P6 (1440px). Covered selection, Learn, flashcards, timer deadline preservation, answer reveal retention, ungraded quiz choices, no private-key requests, and GET-only content requests. These use synthetic responses, not real students or live RLS.
- Production build: passed using the actual Vite configuration plus a temporary override disabling environment-file loading and writing output outside protected `dist/`. Existing large-dashboard/chart bundle warning remains.
- Changed-file ESLint: passed. Required `pnpm lint` still exits 1 on three existing Oxlint findings; a separate full ESLint check reports four existing errors. No unrelated autofixes were retained.
- Dependencies installed from the existing frozen integration lockfile in this worktree; **no package/version additions**.
- Full legacy browser suite and live authenticated student access were not rerun. Old browser scenarios that assume the previous root picker need their navigation updated to the new selection screens before treating that suite as certification.

No database SQL, migrations, imports, RLS/grants, credentials, student records or production writes were performed in this task. The earlier audit's actual counts are context, not a live-authenticated test of this merge.

## Review and test

Use this original project folder in VS Code; it is now the active integration checkout. Restart the existing dev server if needed. Existing local environment files were left untouched and were not read or copied. The exact tested index was verified after transfer; only these handoff/location notes changed afterward. Tests were not repeated solely for the location change.

After dependencies/configuration are present:

```sh
pnpm dev
pnpm test:unit --run
STUDYDEX_E2E_BROWSER_CHANNEL=chrome pnpm exec playwright test --config playwright.math.config.js
```

The documented unit run used an equivalent temporary Vitest configuration with environment-file loading disabled; browser fixtures are self-contained and never use a real project URL/key. Build output for the verification is under `/private/tmp/studydex-merged-build-20261103`. Browser artifacts are in the OS temporary `studydex-math-e2e` directory. Temporary storage is not a durable backup; save/commit only after reviewing and explicitly authorizing it.

Manual follow-up: inspect the new art with real long Mathematics lessons, verify actual account-level access, Science navigation, touch/keyboard behavior and all intended supported browsers. Trusted grading/persistence and the database privilege audit findings remain separate backend tasks. No commit or push without approval.

## Local checkpoint authorization — 4 November 2026

The user has now authorized committing this resolved integration merge locally before rewards work. Earlier uncommitted wording describes its review state. No push, rewards merge or database operation is included in this checkpoint.
