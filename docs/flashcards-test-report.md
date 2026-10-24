# Flashcards integration and functional test report

Date: 24 October 2026 (Asia/Singapore).

**Result: automated frontend checks pass; the complete authenticated live workflow is NOT VERIFIED.**
The feature must not be described as fully tested end-to-end yet.

## A. Integration results

| Check | Result | Evidence and limits |
| --- | --- | --- |
| Existing live flashcard data | Metadata checked | Supabase's read-only table listing reports 15 rows in `public.flashcards`, one topic and seven concepts. RLS is enabled. This does not verify individual record content, order or student access. |
| Signed-in Primary 3 Science topic | NOT VERIFIED live | No authorized authenticated browser/test session was available to the runner. The topic name and level are supplied by the user's brief, not independently read as a student in this run. |
| All 15 flashcards retrieved by the app | NOT VERIFIED live | The real components, services and installed `supabase-js` client successfully consume 15 fixture HTTP records in an automated integration test. These are test responses, not live records. |
| Database content/order matches displayed cards | NOT VERIFIED live | Tests verify unchanged front/back data mapping, `topic_id` filtering and the actual outgoing `order=card_order.asc` request. All 15 fixture cards are displayed and reviewed. Individual live rows were not read. |
| Anonymous live access | PASS, read-only negative check | The live Data API returned HTTP 200 with zero visible rows for both `topics` and `flashcards`, with no API error. This is consistent with protected content and does not prove authenticated RLS works. |

The command-line client had no authenticated session, and no E2E auth state was supplied to
the runner. The session's saved localhost permission also blocks browser
access; no alternate browser or port was used to bypass it. Therefore **no live authenticated
retrieval error was captured**. The `42501`/HTTP 403 failures exercised below are synthetic responses.

No SQL, policies, migrations, inserts, updates, deletes, test accounts or new artwork were created
or executed. Live checks used metadata and anonymous read-only Data API requests with the app's
publishable key. No service key or privileged student impersonation was used.

## B. Functional results

PASS below means the stated automated scope passed; it does not imply a live browser pass.

| Feature | Result | Scope |
| --- | --- | --- |
| Authentication | NOT VERIFIED live | Existing automated checks pass for verified user/profile lookup, missing authentication and protected route redirection. An authenticated live student was not exercised. |
| School-level filtering | NOT VERIFIED live | Automated checks pass for profile-derived `school_level_id`, matching topic query parameters, missing levels and unavailable topics. Actual RLS enforcement for a signed-in student is unverified. |
| Flashcard retrieval | NOT VERIFIED live | Service and real-client HTTP contract tests pass for all 15 fixture records and ascending `card_order`. Live student retrieval/content comparison remains pending. |
| Card flipping | PASS for DOM click/state | Correct front/back text, flip/unflip, accessible pressed/hidden states, and reset to question after a rating. The card uses a native `button`; actual Enter/Space activation and 3D rendering remain NOT VERIFIED in a browser. |
| Again | PASS | First card, repeated ratings of the same card, mixed ratings and one-card remainder; requeues soon without increasing remembered count or resetting the deck. |
| Hard | PASS | First card, repeated ratings, mixed ratings and one-card remainder; requeues later without removing it or increasing remembered count. |
| Easy | PASS | Removes the current card, increases unique remembered count, and completes after all 15 cards are remembered. |
| Progress tracking | PASS | Total, original card position, remembered and remaining counts. Queue/remembered sets remain a disjoint partition of the 15 records; reviews are counted separately. |
| Completion summary | PASS | Correct unique remembered count and review-attempt count, including repeated reviews. No card remains after completion. |
| Restart Deck | PASS | Restores all 15 cards in original order, zero remembered/reviews, and question side. Does not need another content request. |
| Timer independence | PASS | Card ratings and Learn/Flashcards switches preserve the running deadline and elapsed time. Existing timer pause/recovery tests also pass. |
| Navigation/session state | PASS | Learn/Flashcards switching, different topic data, empty subject and return, no unnecessary refetch, fresh revision after the study page is destroyed/reloaded. |
| Buddy / automatic XP | PASS in automated scope | Buddy XP/level stay unchanged during ratings, the timer has no XP award state, and real-client fixture requests are GET-only. Actual live buddy rendering was not exercised. |
| Error handling | PASS in automated scope | Pending loading, empty bank/topic, permission and network failures, successful retry, missing profile/authentication, absent images, broken images and refresh/reset. |
| Responsive layout | NOT VERIFIED | Existing desktop/tablet/mobile CSS breakpoints were inspected. JSDOM does not render layout; real viewport overflow and visual checks are pending. |

For repeated cards, “Card X of 15” is the original deck position, so it can move backwards.
The separate remembered/remaining counters show session completion, not number of attempts.
Flashcard progress intentionally resets after leaving Poké Lab or refreshing. Mode/topic switches
within the current Poké Lab visit preserve it.

## C. Bugs, necessary fixes and verification

### Revision lost after an empty subject

Reproduction: remember one card, select a subject with no available topics, then return to the
original topic and Flashcards. The counter previously returned to `0 / 15`.

Root cause: `KeepAlive` was inside `v-if="topic && activeResource"`. When no topic was available,
Vue destroyed the cache as well as the active component.

Fix: keep the `KeepAlive` wrapper mounted and place the topic condition on its child component.
The regression test now retains `1 / 15 remembered`, the next card and the original resource cache.

### Missing requested progress/control labels

The existing UI showed remembered and remaining counts but no current card position. Added
“Card X of N” without changing queue logic. Renamed the existing “Start new revision” action to
“Restart Deck”; its working restart logic is retained. The flip button now explicitly uses
`type="button"`.

No queue algorithm, authentication code, database service query, timer implementation, buddy
logic, CSS or educational content was replaced.

### Files in this QA change

- `src/components/study/StudyFlashcards.vue`: position label, restart label and button type.
- `src/views/studyView.vue`: preserve the component cache through empty-topic browsing.
- `src/composables/__tests__/useFlashcardReview.spec.js`: repeated/mixed/15-card queue invariants.
- `src/components/study/__tests__/StudyFlashcards.spec.js`: flipping, progress, completion,
  restart, loading/error/retry, images and empty states.
- `src/views/__tests__/StudyView.spec.js`: topic/mode cache regression, actual timer deadline,
  buddy stats, independent flashcard errors/retry, authentication failure and reload/reset.
- `src/services/__tests__/studyService.spec.js`: 15-record mapping and topic/order contract.
- `src/test/studyFixtures.js`: clearly synthetic 15-card QA records, imported by tests only.
- `src/views/__tests__/StudyFlashcards.integration.spec.js`: real Vue/services/Supabase client
  with fixture HTTP/auth responses; read-only requests and error recovery.
- `e2e/flashcards.spec.js`: opt-in, unexecuted authenticated live checks, including native
  keyboard operation and 390px/768px layout checks.
- This report.

### Checks run

| Command/check | Result |
| --- | --- |
| `pnpm exec vitest run` | **131 passed across 14 files**, including 22 additional tests. |
| Targeted Flashcards, StudyView and service tests | PASS after the fixes; the cache regression was reproduced failing before the fix. |
| `pnpm run build` | PASS. Existing large main/chart bundle warnings remain. |
| ESLint and Oxlint on all files changed in this QA batch | PASS. |
| `git diff --check` | PASS. |
| `pnpm exec playwright test e2e/flashcards.spec.js --list` | PASS: 9 cases discovered across Chromium, Firefox and WebKit. **Listing is not execution.** |
| Authenticated Playwright/browser run | NOT RUN: unavailable authorized session and saved localhost access block. |
| Full-project `pnpm exec eslint .` | FAIL on the four existing landing/standalone timer errors. |
| Full-project `pnpm exec oxlint .` | FAIL on the existing standalone timer expression and two service-test `toThrow` messages. |

The unrelated lint errors were left unchanged. Fixing scripts with `--fix` was intentionally not
run across the project. Existing merge staging and earlier weather changes were retained; this QA
batch is local and uncommitted.

Original touched files were saved under the Git-ignored `.flashcards-qa-backup.local/`, with
`.snapshot` suffixes. Restoring those snapshots undoes this QA batch's edits to existing files;
the newly added integration test, E2E spec and report can be removed separately. No database
rollback is needed.

## D. Outstanding verification

No missing database permission has been confirmed. The main outstanding step is the actual
authenticated Primary 3 workflow, including all 15 real questions/answers, live RLS, keyboard
activation, optional live image assets and desktop/mobile rendering.

Flashcard revision persistence after refresh and automatic XP are intentionally not implemented
and are not required for this revision flow. Existing study timer recovery is separate.

### Running the prepared live check on your computer

Use a real, existing Primary 3 student account; do not insert another deck or create a new user.
The test reads the API responses and compares every displayed card against them. It does not
mock or intercept educational content, execute SQL, or award XP. It fails if the topic/cards are
inaccessible, counts/order/content differ, or a Data API write occurs during revision.

1. Start the app with `pnpm dev`.
2. In another terminal, open the recorder and sign in normally:

   ```sh
   pnpm exec playwright codegen --save-storage=.flashcards-auth.local http://localhost:5173/login
   ```

   Close the recorder browser after logging in. This saves the session locally. The file matches
   the existing Git ignore rule; keep it local and do not paste its tokens into chat.

3. Run only the new spec, so the unrelated obsolete starter E2E test is excluded:

   ```sh
   STUDYDEX_E2E_AUTH_STATE=.flashcards-auth.local pnpm exec playwright test e2e/flashcards.spec.js --project=chromium
   ```

   Playwright browser binaries must already be installed. Omitting `--project=chromium` also runs
   Firefox and WebKit when those binaries are available. Without the auth-state environment
   variable, the live spec is explicitly skipped; that must not be reported as an integration pass.

Manual equivalent: log in as Primary 3, enter Town → Poké Lab → Science → Diversity of Living
and Non-Living Things → Flashcards. Check all 15 real cards, click and Enter/Space flips,
Again/Hard/Easy, mode/topic switching, timer continuity, completion/restart, refresh and narrow
screen layout. Compare actual content/order against the authenticated Network response.
