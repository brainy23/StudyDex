# StudyDeck implementation and rollback

The frontend loads registered-level learning content from Supabase. After separate
owner approval, the read-access SQL was applied on **24 October 2026**. Nine SELECT
policies and the approved column grants were added. No content, profile, Pokémon,
session, score or reward records were inserted, updated or deleted.

## Student flow

1. Open Poké Lab from Town (`/study-decks`, still protected by the existing login guard).
2. Reuse `getCurrentProfile()` and filter topics by `profiles.school_level_id`.
   A missing school level links to Account Settings; there is no default level.
3. Choose an available subject/topic. Subject names come from the database.
4. Learn: read the topic description and ordered goals, then one ordered concept,
   its worked example, and its associated quick check at a time.
5. Answer selections are practice choices, not correctness or mastery scores.
   Completing a concept advances **concepts read** progress.
6. After the concepts, choose Flashcard Revision or Boss Battle.
7. Flashcards: flip before rating. Again returns a card soon; Hard returns it later;
   Easy removes it as remembered. A summary appears when every card is remembered.
8. Quiz/Boss Battle: choose answers and review those choices. No results are graded,
   submitted, or rewarded without a secure server endpoint.

The three modes use query parameters on the existing route, for example
`/study-decks?mode=quiz&battle=boss`. `/quiz` and the teammate's Poké Arena view are
unchanged. Learn and revision state survive mode/topic switching during a visit
through cached components. They reset after leaving the page or refreshing.

## Layout and assets

The existing morning background, blue/gold colours and buddy artwork are reused.
The central learning panel gets the most space; the buddy column is reduced to
190px and the utilities column is 280px on large displays. At 1200px the buddy
becomes a compact row, at 848px the learning content uses a single column, and at
576px utilities also stack. Long explanations and optional flashcard images fit
the content panel. Keyboard controls, radio groups, focus outlines, status/error
messages, and reduced-motion support are included. No artwork or dependencies
were added.

## Tables used

| Feature               | Read source                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Student and level     | Existing profile service: `profiles`, related `levels`                                                                        |
| Subject/topic browser | `subjects`, `topics` filtered by `level_id`                                                                                   |
| Topic overview        | `topics`, `topic_learning_goals` ordered by `goal_order`                                                                      |
| Concept reader        | `topic_concepts` ordered by `concept_order`                                                                                   |
| Quick checks          | `questions` with `question_purpose = 'quick_check'`, associated by `concept_id`; `question_options` ordered by `option_order` |
| Revision              | `flashcards` ordered by `card_order`                                                                                          |
| Quiz/Boss Battle      | `questions` filtered by `quiz` or `boss_battle`; `question_options`                                                           |
| Saved buddy display   | Own selected `user_pokemon`, related `pokemon` name/sprite; read only                                                         |

No frontend query accesses `question_answers`. There is no `select('*')` for any
study content. The buddy is a read-only display of existing records, not a second
Pokémon state system. The existing PokeBuddy prototype is unchanged.

Optional flashcard images support site-root paths and HTTPS URLs. For public
Supabase Storage object paths, set `VITE_STUDY_ASSET_BUCKET` to the actual public
bucket name; no bucket is guessed or created. Missing/failed images have a fallback.
Private files require an authorized signed-URL service, which is not implemented.

## Read access applied on 24 October 2026

On 23 October 2026 the security advisor reported RLS enabled with **no policies**
on the lesson, question, flashcard and buddy tables. Anonymous REST reads returned
HTTP 200 and zero visible rows, despite schema metadata showing existing content.
The application could not bypass this. No authenticated account was impersonated.

The exact approved change is recorded in
[`../database/studydeck-read-access.proposed.sql`](../database/studydeck-read-access.proposed.sql).
**It has been applied.** The original proposal filename is retained for existing
links; its header now records the application. Do not re-run it.

The script grants SELECT on named display columns only. Signed-in students may
read subject names, topics matching their registered school level, and those
topics' goals, concepts, flashcards, questions and options. They may read their
own buddy records and the shared Pokémon catalogue. Child-table policies inherit
the level restriction through RLS-protected parent lookups. No anonymous read
policy, answer-key access, writes, XP grants, seeds, or security-definer functions
are introduced. Existing own-profile read access is required.

Post-application advisor checks show the nine content/buddy tables no longer have
the "RLS Enabled No Policy" finding. All 17 tables still have RLS enabled, and
their record counts are unchanged. The six tables deliberately kept closed are
`question_answers`, `study_sessions`, `pomodoro_blocks`, `quiz_attempts`,
`quiz_attempt_answers`, and `user_packs`. Unrelated pre-existing advisor warnings
were not changed.

Post-application anonymous REST checks passed for all ten checked tables: the
nine newly policy-enabled tables plus `question_answers` returned HTTP 200 with
zero visible rows using the publishable key without a user session. No secret
key or authenticated account was used for these checks.

Still verify through real authenticated app sessions: a Primary 3
student can read the seven concepts in order; another level cannot read that
topic (including direct REST requests); a missing-level account sees no topic
content; users cannot read each other's buddies; answer keys remain inaccessible
when signed in. Anonymous requests were separately verified to see no protected
content. Signed-in browser checks remain
pending because localhost preview access is blocked in this session. No additional
SQL validation script or temporary test records were run beyond the approved SQL.

Empty content and explicit permission errors have different UI states. A silently
RLS-filtered empty catalogue explains that read access may not be enabled. The
app never substitutes sample lessons, English cards, scores, or Pokémon records.

## Timer and rewards

The existing shared `useTimer.js` is now a timestamp-based 25-minute focus /
5-minute break timer. Nothing starts automatically. Students explicitly start,
pause, resume, end, and start their break. Switching topics or modes retains the
same deadline. Leaving Poké Lab pauses the session; returning offers Resume.
`pagehide` pauses before navigation/refresh when the browser allows it; interrupted
running sessions recover paused on a new page load. Unobserved/offline intervals
do not create completions. Storage failures are reported.

Recoverable state is namespaced by authenticated profile ID in localStorage.
Completion dates use `Asia/Singapore`, including when a delayed timer tick crosses
midnight. Daily completion counts are **local focus tracking**, not authoritative
XP eligibility. Students can continue studying beyond the four-block daily goal.
Other devices/tabs are not an authoritative shared history. Local storage can be
edited; it must never be trusted for rewards.

The existing standalone `/timer` component remains unchanged. Its independent
timer is not used by Poké Lab.

### Backend work still required

- Secure grading: an authenticated RPC/Edge Function must verify topic/level,
  purpose, question IDs and selected-option ownership; read answer keys only on
  the server; calculate scores; write `quiz_attempts`/`quiz_attempt_answers` itself;
  return feedback only after submission. The repository has no such endpoint,
  and no deployed Edge Function or grading RPC was found.
- Authoritative focus sessions: server endpoints must create/own `study_sessions`,
  track start/pause/resume/end, validate elapsed focus time, and finalize
  `pomodoro_blocks` from server timestamps. Browser clocks/counts cannot authorize XP.
- Rewards: server-side transactional daily-limit enforcement must permit at most
  four valid focus completions per Singapore day, handle retries/concurrent tabs
  idempotently, and write `xp_earned`, `xp_awarded_at`, buddy XP and packs only on
  the server. Session/block RLS and grants need separate review/approval.
- Populate flashcards and regular quizzes through the team's content process.
  The current bank has zero of each. No seed content was inserted.

## Files changed

Modified existing files:

- `src/views/studyView.vue`: page orchestration, registered-level loading, route
  state, buddy display, mode caching, progress, navigation and error states.
- `src/components/timer/useTimer.js`: shared timer, recovery and Singapore-day tracking.
- `src/router/__tests__/flow.spec.js`: integration tests now expect real-content loading.

Created:

- `src/services/studyService.js`: explicit content/buddy reads and image paths.
- `src/components/study/StudyLearn.vue`, `StudyFlashcards.vue`, `StudyQuiz.vue`:
  manageable learning modes.
- `src/components/study/StudyQuestion.vue`, `StudyImage.vue`, `StudyTimerPanel.vue`:
  shared presentation.
- `src/composables/useFlashcardReview.js`: revision queue mechanics.
- `src/assets/study.css`: page-specific responsive styling.
- `src/services/__tests__/studyService.spec.js`,
  `src/views/__tests__/StudyView.spec.js`,
  `src/components/study/__tests__/StudyFlashcards.spec.js`,
  `src/components/timer/__tests__/useTimer.spec.js`,
  `src/composables/__tests__/useFlashcardReview.spec.js`,
  `src/test/studyFixtures.js`: tests and synthetic test-only fixtures.
- `database/studydeck-read-access.proposed.sql`: record of the approved/applied SQL.
- `database/studydeck-read-access.rollback.sql`: optional unapplied RLS rollback.
- `scripts/revert-studydeck.mjs`: preview/apply a scoped rollback.
- This implementation note.

## Verification

Final results on 23 October 2026:

- **94 tests passed across 13 files.**
- Production build passed, with the existing warning about a bundle above 500kB.
- ESLint and Oxlint passed for every changed/new source and test file.
- Repository-wide ESLint still reports four existing errors in
  `src/components/landing/landing.vue` and `src/components/timer/Timer.vue`.
  Repository-wide Oxlint still reports existing issues in `Timer.vue` and the
  account/registration service tests. Those unrelated files were not modified.
- `git diff --check` passed.
- Rollback preview and actual restoration were tested in a temporary project
  copy: all three originals matched byte-for-byte, new files were archived, and
  the unrelated Account view remained unchanged.
- Live schema/advisor checks confirmed the missing RLS policies. The approved
  read-access SQL was subsequently applied on 24 October 2026, and follow-up
  checks confirmed the nine content/buddy tables now have policies, RLS remains
  enabled, and record counts are unchanged. Signed-in browser testing remains
  pending; secure grading/rewards still require backend implementation.

Unit and route integration checks cover profile-based level selection, goals,
seven-concept progression, quick checks, empty/RLS-filtered catalogues, explicit
RLS errors/retry, flashcard queues/optional images/completion, quiz/Boss Battle
navigation, timer controls/deadlines/recovery/user separation, and Singapore dates.

Run `pnpm exec vitest run`, `pnpm exec eslint` with the changed source paths,
`pnpm exec oxlint` with those paths, and `pnpm build`.

Browser visual/responsive verification remains pending because this session's
saved permissions block the localhost preview. No alternate browser mechanism
was used to bypass that restriction. The production build has the existing
large-bundle warning; study assets have not been compressed as part of this task.

## Revert without losing this implementation

The original files were copied to the Git-ignored `.studydeck-backup.local/` before
editing. The clean starting Git commit is
`bc7ef4ab244d2860758b43eb28136a1c39d4e2ab`.

Preview the exact files affected:

```sh
node scripts/revert-studydeck.mjs
```

Restore the original prototype:

```sh
node scripts/revert-studydeck.mjs --apply
```

The script first saves the current implementation in a timestamped `.local`
directory, restores the three original modified files, and archives the new
runtime/test files. It does not delete them, reset Git history, or affect account,
authentication, landing, Pokémon, or database code. If the local originals are
missing it reads the baseline versions from Git instead. SQL drafts and notes are
retained. If you later edit these same files, those edits are archived too.
The restored prototype includes its original one-second timer.

The script above affects frontend files only and never executes SQL. To reverse
the database read access, separately review
[`../database/studydeck-read-access.rollback.sql`](../database/studydeck-read-access.rollback.sql).
That optional script removes only the nine new read policies, retaining RLS and
all records. It does not revoke table/column grants; it restores the original
RLS access barrier rather than reconstructing the privilege catalogue. It has not
been applied. The agent requires an explicit request before running a database
rollback.
