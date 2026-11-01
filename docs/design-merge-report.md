# StudyDex design and tutorial integration

2 November 2026 · local branch `integration/user-registration`

## Branches and backup

The original target is preserved at `517fd50` on **`backup/integration-user-registration-before-design-merge-2026-11-02`**.

| Selected branch | Source tip | Local merge commit | Result |
| --- | --- | --- | --- |
| `origin/designed-poke-arena` | `bd8c434` | `a5c0609` | Merged first, with the approved behavior choices below. |
| `origin/designed-poke-arena-tutorial` | `fd8f465` | `2ed8758` | Merged second; no text conflicts. |

`origin/designed_poke_components` points to `bd8c434`, so its changes are included. No force push, hard reset, push to GitHub, or merge into `main` was performed.

## Conflicts and approved resolutions

Only the first merge had text conflicts:

| File | Competing implementations | Resolution approved by the user |
| --- | --- | --- |
| `src/views/studyView.vue` | Existing Learn/Flashcards flow and shared timer versus an incoming flashcard-only room with an independent timer and automatic boss trigger. | Preserved Learn, roadmap, plant demonstration, topic links and shared timer. Added the incoming room presentation and optional boss practice. Returning from practice preserves deck progress and the paused timer, regardless of the result or an early exit. |
| `src/views/quizView.vue` | Database-backed ungraded previews versus hardcoded demo questions and client-side scoring. | Applied the battle scene to the existing database question flow. Topic Quiz and Boss Battle remain separate; secure assessment grading and rewards stay disabled. |

## Integration fixes

- Added `StudyFlashcardRoom.vue` and `ArenaBattleScene.vue` as presentation components, keeping learning and assessment data in the existing controllers.
- Kept the original flashcard recall controls, added Hard for later repetition, and added validated deck snapshots for optional practice. There is no automatic fast-rating punishment or timer reset.
- Adapted `SurpriseBossView.vue` and `bossEncounter.js` to account-bound, tab-local practice derived only from public flashcard answers. This is distinct from graded database assessments; it saves no assessment score or XP.
- Fixed four `useTimeOfDay` import-casing mismatches and explicitly recorded the `TutorialGuide.vue` filename casing for case-sensitive deployment systems.
- Removed duplicate Bootstrap imports, restored the landing page's referenced clock icon, and corrected stale common-navbar destinations. Town Study, Quiz and Bag buttons now use the existing Lab, Arena and Trainer House routes, matching the bubble navigation.
- Kept the tutorial behind authentication and removed the incoming `VITE_SKIP_AUTH` bypass. Fixed replay, guide-image failures, blocked browser storage, modal keyboard behavior and reduced motion. The tutorial waits for the initial weather-location choice.
- Preserved the authenticated dashboard greeting and clearly labeled its sample statistics. Fixed the narrow-screen room grid, compact timer layout and Arena scene overlap. Rear-facing sprites respect reduced motion and have a static-image fallback.
- Kept a single Pinia installation and the existing app-root Arena transition. No new Pinia stores, duplicate study timer, dependency installation, package-version change or lockfile change was needed.

## Supabase checks: read-only

The configured project matches the project inspected through the Supabase plugin. Table metadata and columns match the application's existing explicit field lists and foreign-key relationships. The service layer, database files and environment files were not changed.

Metadata reported the same counts before and after integration:

| Existing table | Rows reported |
| --- | ---: |
| Topics | 18 |
| Flashcards | 231 |
| Questions | 259 |
| Question options | 1,036 |
| Topic learning goals | 111 |
| Topic concepts | 115 |

RLS remains enabled. No SQL, migrations, reseeding, content import or database writes were performed. Private answer-key rows and credentials were not retrieved or added to browser code.

These checks verify schema compatibility and reported content counts. They **do not verify a signed-in student's live RLS access**. Browser tests use synthetic auth/content responses; no saved live test session was configured, and the user selected plugin-only read-only checks.

The read-only advisor also reports existing missing policies on session/assessment/reward tables and disabled leaked-password protection. Metadata shows RLS enabled with no client policies on the private answer-key table; client code never queries it. No policies or authentication settings were changed.

## Validation

| Check | Result |
| --- | --- |
| Vitest | **231 tests passed across 25 files.** |
| Isolated Chrome browser suite | **29 passed**, with no skipped or flaky tests. |
| Production build | **Passed**, retaining the existing large chart/dashboard bundle warning. |
| ESLint, without autofix | No new findings; four existing errors remain in unchanged landing/timer files. |
| Oxlint, without autofix | No new findings; three existing errors remain in unchanged timer/account/registration test files. |
| Static integration checks | No unresolved exact-case local imports, missing literal public assets, or merge markers. One Pinia setup. |

Browser coverage includes the public landing page, Learn/roadmap/plant demo, flashcard completion and Hard ratings, all three Arena entry points, Skip/Escape/reduced motion, preserved topics and Back, tutorial replay and dismissal, early/completed optional practice returns, and desktop/mobile layouts. API fixture assertions reject writes and private answer-key requests.

Screenshots below use synthetic browser data and were visually inspected:

- [Desktop flashcard room](images/design-integration/flashcards-desktop.png) · [desktop Arena](images/design-integration/arena-desktop.png)
- [320px flashcard room](images/design-integration/flashcards-mobile.png) · [320px Arena](images/design-integration/arena-mobile.png)

Reproduce:

```sh
pnpm exec vitest run
STUDYDEX_E2E_BROWSER_CHANNEL=chrome STUDYDEX_E2E_EVIDENCE_DIR=/tmp/studydex-integration-evidence pnpm exec playwright test --config=playwright.integration.config.js
pnpm build
pnpm exec eslint .
pnpm exec oxlint .
```

The evidence-directory override preserves the historical Arena-transition captures. Omit the browser-channel variable when using installed Playwright Chromium.

## Remaining manual checks and follow-up

- Verify a signed-in student can read the existing school-level catalogue, lessons, flashcards and question options against live Supabase. Metadata access is not a substitute for this check.
- Keep secure grading, saved quiz attempts and XP/reward persistence deferred until an approved backend implementation exists. Any SQL or schema work requires separate explicit approval.
- Dashboard, Pokémon collection and pack inventory still include prototype data. The merges do not make those records persistent.
- Safari/Firefox, physical touch devices, assistive-technology testing and real geolocation/weather outage behavior remain manual checks.
- Clean up the seven pre-existing lint errors separately. They were left outside this integration's scope.
