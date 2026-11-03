# StudyDex integration update — 4 November 2026

Target: `integration/user-registration`. Backup: `backup/integration-before-admin-tutorial-landing-2026-11-04` at `39caa6b`. The user authorized committing and pushing integration for group testing. No merge into `main` or hosting deployment is included.

## What this session preserves

The earlier committed work includes saved starter selection, per-account Pokémon collections, shared Town/Trainer/Lab buddy selection, persistent pack-opening receipts and reward badges. The previously approved Pokémon backend is already deployed; this branch merge ran no Supabase SQL and changed no shared records or permissions.

Keep Mathematics/Science selection, Learn/Flashcards, roadmap/plant demo, shared timer, optional practice without resets and ungraded question previews. Normal study/quiz/streak earning and secure grading are still unfinished. No welcome packs or client-awarded XP were added.

## Branches reviewed and merged

| Remote branch/tip | Latest update (Singapore) | Result |
| --- | --- | --- |
| `admin` / `8f2f087` | 2 November | Merged in `bbcbe40`: authenticated, clearly labelled local demo only. Dashboard, students, decks and quizzes use sample data. No student navigation link or live CRUD. |
| `designed-poke-arena-tutorial` / `6226f1e` | 3 November | Merged in `147a4a8`: navigation styling incorporated while retaining existing accessible Town tutorial, reward badges and accurate ungraded-preview wording. |
| `landing` / `d193131` | 3 November | Merged in `3f7f04a`: expanded public introduction, room artwork and all ten avatar styles. The user chose an explicitly unsaved style preview. Account avatar and starter persistence remain separate. |

The requested underscore spelling refers to the actual remote branch `designed-poke-arena-tutorial`.

Other recent branches: `designed-poke-arena` (`4edbee6`) and its component work are already integrated. Josh's rewards were already selectively integrated and hardened around the saved backend; avoid replacing them with the prototype wholesale. `Home-Screen` (`9470ada`, 1 November) adds phone sounds and an enabled developer time tester. Defer that merge: the time tester should stay out of the child-facing app, and sound playback needs rejection handling/cleanup before selective adoption. Older branches were not merged automatically.

## Conflicts and resolutions

- **Admin:** `package.json`, `pnpm-lock.yaml`, `src/lib/supabase.js`, `src/router/index.js`. Kept integration's existing dependencies, pinned Supabase package, configured client and protected routes; added lazy local-demo routes in `adminDemoRoutes.js`. Removed duplicate Bootstrap imports introduced by the automatic merge in `main.js`.
- **Tutorial:** `StudydexBubbleNav.vue`, `TutorialGuide.vue`. Preserved badges, keyboard controls, reduced motion, focus-managed dialog, request cancellation and safe preview text. Kept one canonical filename/import casing for Linux deployments.
- **Landing:** `package.json`, `pnpm-lock.yaml`, `landing-info.vue`, `landing.vue`, `src/router/index.js`. Kept auth, signup/starter flow and profile summary. Added protected avatar preview. `/tutorialguide` redirects to `/tutorial`; removed the duplicate incoming tutorial component.
- No new dependencies were required and no lockfile changes retained.

## Main files changed

- `src/views/admin/`, `src/data/adminQuizData.js`, `src/components/common/adminNav.vue`, `src/assets/admincommon.css`: imported local prototypes; prominent demo notice; Back to Town instead of a nonfunctional logout; fixed local Remove button and incoming unused-code lint errors. Deck creation now explicitly previews a draft rather than claiming to publish it.
- `src/router/adminDemoRoutes.js`, `src/router/index.js`: protected lazy admin and avatar routes; tutorial compatibility redirect. No invented admin role or browser flag grants database authority.
- `src/components/common/StudydexBubbleNav.vue`: incoming navigation classes with current reward behavior retained.
- `src/components/landing-info/landing-info.vue`: incoming page sections, working signup/login links, accurate feature availability, existing illustrations instead of missing screenshots, responsive layout and disposed carousel/request lifecycle. Single-image sections hide unnecessary carousel controls.
- `src/components/landing/landing.vue`: keeps saved profile greeting; Start opens avatar preview, with Go straight to Town available.
- `src/components/characterdesign/characterdesign.vue`, `public/avatars/`, `public/heads/`: ten-style preview, no profile/local choice writes; accessible names/selection, reduced motion and mobile panel sizing. Only the selected animation sheet is loaded, avoiding eager loading of all ten large sheets.
- `src/router/__tests__/flow.spec.js`, `e2e/branch-merge.spec.js`, `playwright.branches.config.js`: protected-route checks and new merged-flow browser coverage.

## Verification

- Production build passed. Existing large chart/application bundle warnings remain.
- **341 unit tests / 37 files passed.**
- **11 Chrome fixture journeys passed:** 3 branch-integration journeys, 6 rewards journeys, 2 Mathematics journeys (P1/P6).
- New browser checks cover public landing images/mobile overflow/signup, all ten unsaved styles, mobile avatar panel, tutorial completion, admin routes/detail navigation and absence of content writes. Desktop avatar screenshot inspected.
- `pnpm lint` was run and fails on three pre-existing Oxlint errors: `Timer.vue:45`, `accountService.spec.js:91`, `registrationService.spec.js:52`. It stops before ESLint. A separate full ESLint run reports three pre-existing Timer errors (component name and unused `status`/`id`). Incoming/changed-file ESLint passes. No unrelated automatic edits retained.
- No recognizable secret-key/private-key or service-role JWT strings found in the changed source/doc files scanned before push. Environment files were not read. This limited pattern scan is not a full historical credential audit.
- Build/unit commands used temporary configs with `envDir: false` and temporary output/cache paths; Chrome tests use the committed synthetic-fixture config. No new live Supabase checks were run.

## Limitations and priorities

1. **Group acceptance test:** sign up/confirm email, choose a starter, enter Town, reload/sign in again and inspect the saved collection. Live signed-in/cross-device flows were not exercised by the agent during this merge.
2. **Real earning:** trusted study events, quiz grading/attempt persistence and normal reward grants still need backend work and separately approved exact SQL. The deployed pack-opening backend does not imply that ordinary study/quiz awards exist yet.
3. **Admin backend:** this is not production administration. Sample students/decks may reset on navigation; quiz drafts persist locally in this browser. Deck detail is placeholder content. No real bans/deletions/publishing exist. Establish server-controlled administrator authorization before connecting any CRUD or private grading content; never authorize via editable user metadata.
4. **Avatar persistence:** ten-style selection is preview only by explicit user choice. Saved accounts continue using the three existing supported avatar values. Persisting ten styles needs a separately reviewed database/product change.
5. Fix the existing Timer/test lint failures, then consider chart bundle optimization. Real landing screenshots can replace the labelled illustrations later. Dashboard still uses sample progress data.

## Team testing

```sh
git switch integration/user-registration
git pull --ff-only origin integration/user-registration
pnpm install --frozen-lockfile
pnpm dev
pnpm test:unit --run
pnpm build
pnpm lint
STUDYDEX_E2E_BROWSER_CHANNEL=chrome pnpm exec playwright test --config playwright.branches.config.js
STUDYDEX_E2E_BROWSER_CHANNEL=chrome pnpm exec playwright test --config playwright.rewards.config.js
STUDYDEX_E2E_BROWSER_CHANNEL=chrome pnpm exec playwright test --config playwright.math.config.js
```

Commit or stash your own changes before switching. Use the team's existing local environment configuration; never commit credentials. The browser suites use synthetic sessions/content and do not change the shared database. For manual admin preview, sign in and open `/admin-home` directly. For styles, use Landing → Start or `/characterdesign`.
