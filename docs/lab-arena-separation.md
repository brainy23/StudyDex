# Poké Lab and Poké Arena

## Responsibilities

| Area | Route | Content |
| --- | --- | --- |
| Poké Lab | `/study-decks` | Overview, goals, concepts, explanations, examples, ungraded understanding checks, Flashcards, Study Block Timer and Pokémon Buddy |
| Poké Arena | `/quiz` | Topic Quizzes and Boss Battles; question selection and review are available, with secure grading/saving/rewards still pending |

Both pages require login and retrieve the student’s saved profile. Their topic catalogue
is filtered using `profiles.school_level_id`. Neither page asks for another school-level
selection. Arena is accessible directly from Town. Under the updated topic-quiz flow,
each regular Topic Quiz unlocks after **Finish topic** in Lab; Boss Battles remain
independently accessible. The study timer is not a prerequisite.

## Poké Lab

- Only **Learn** and **Flashcards** are learning modes.
- Lesson retrieval still includes `question_purpose = 'quick_check'` understanding checks.
- Lab no longer requests `quiz` or `boss_battle` question banks or renders their assessment UI.
- Understanding-check choices are ungraded visit-only practice. They do not create formal
  attempts, scores, XP or rewards.
- Flashcard flipping, Again/Hard/Easy, unique progress, completion and Restart Deck are retained.
- Lesson/revision caches, empty/error/retry states, the existing layout and buddy are retained.
- The timer still starts manually and keeps its deadline through learning/revision changes.
  Leaving Lab, including using **Quiz me!**, pauses the timer.
- Topic completion offers Flashcard Revision, **Quiz me!**, or Read again. The header also
  has a **Quiz me!** button, enabled once the current topic has been completed. Both open
  that topic's regular quiz directly in Arena, preserving subject/topic IDs.
- The user’s currently hidden level/context header remains hidden; filtering still uses
  the saved profile level.

## Poké Arena

The existing `/quiz` page contained a placeholder, not a separate assessment engine.
It now hosts the existing `StudyQuiz.vue` component as `ArenaAssessment`, preserving
question retrieval, options, answer selection, previous/next navigation and choice review.
The file’s existing location/name is retained to avoid an unrelated directory migration;
Arena is its only production importer.

- Topic Quiz loads `question_purpose = 'quiz'`.
- Boss Battle loads `question_purpose = 'boss_battle'`.
- Only the chosen unlocked topic/type is loaded. A locked regular quiz does not fetch its
  question bank. Changing assessment type does not fetch quick checks.
- Topic/type caches keep their answer choices separate for the current Arena visit.
- Subjects and topics can be changed independently of Lab. Unavailable/other-level topic
  URLs are rejected before fetching their questions.
- Loading, missing level, empty catalogue/bank, permission, network and retry states are handled.
- A late response for another question set cannot replace the currently selected set.
- The existing Arena background/panel and shared StudyDex controls/styles are reused, with
  a responsive subject/topic sidebar.
- The UI explicitly identifies this as an assessment preview: choices are not graded or saved,
  and scores/rewards are not available yet. Review my choices is not a submission action.

## One quiz per completed topic

- **Finish topic** records completion after the last lesson concept. Opening a topic, choosing
  Flashcards, or completing an understanding check alone does not unlock its Topic Quiz.
- Completing two topics unlocks their two separate quizzes. Finishing/reviewing a quiz does
  not consume its unlock, and repeating a topic does not create a duplicate quiz.
- Arena labels each topic as covered/unlocked or needing study. A locked quiz offers
  **Study this topic**, which opens the correct Lab lesson in Learn mode.
- Unlocking uses the existing question bank for the topic with `question_purpose = 'quiz'`.
  It does not generate questions. Topics without questions show the existing empty state.
  No test content was inserted into Supabase.
- Completed topic IDs are stored in localStorage separately for each verified profile ID
  and saved school level. They survive reloads in that browser, but do not sync across
  devices. Clearing site data removes them. Unpublished/other-level topics remain excluded
  by the profile-filtered catalogue, regardless of stored IDs.
- If browser storage is blocked, an in-memory fallback keeps unlocks through navigation
  during the current app visit, and the UI explains that they will not survive a reload.
- Browser completion data is a convenience for this test-content flow, not authoritative
  assessment eligibility. It must not be trusted for grades, attempts or rewards. Account-wide
  completion tracking and any authoritative prerequisite enforcement are pending backend work.

## Navigation

1. **Town → Poké Lab:** the existing Lab building opens `/study-decks`.
2. **Town → Poké Arena:** the existing Arena building opens `/quiz` directly.
3. **Lab → Arena:** header/completion **Quiz me!** buttons open the covered topic's quiz.
4. **Arena → Lab:** Revise in Poké Lab preserves subject/topic and opens Flashcards.
5. Both areas retain the shared **Back to Town** link to `/home`.
6. Old Lab assessment links such as `/study-decks?mode=quiz&battle=boss&topic=...`
   redirect to `/quiz?battle=boss&topic=...`, retaining subject/topic context. They are
   protected by Arena’s login guard and do not mount Lab or load its lesson.

Concept position, understanding-check choices and Flashcard revision progress still reset
when leaving Lab, as before. The completed-topic unlock list is retained separately in this
browser. The timer’s saved recovery state is separate and returns paused. Arena answer
choices reset on leaving or refreshing Arena; no saved assessment attempt is implied.

## Pending backend work

No database changes, SQL, policies, migrations, content inserts or live writes were performed.
The existing Supabase services and explicit field selections are unchanged. Browser code
does not query `question_answers` or receive answer keys.

Before assessments can submit results or grant rewards, the app needs an authenticated
server-side grading integration that:

- validates the student, school level, topic, question purpose and selected options;
- reads answer keys only on the server and computes the authoritative result;
- saves the attempt and its answers, with duplicate-submission protection;
- awards any permitted XP/rewards transactionally under the agreed rules;
- returns the result/feedback that the frontend may safely display.

This integration is not implemented or called by the current UI. No frontend-only grading,
fake scores, artificial attempts or reward writes were added. Any future SQL requires review
of the exact script and the owner’s explicit approval first.

## Files changed for this separation

- `src/views/studyView.vue`: learning/revision-only modes and context-preserving Arena links.
- `src/views/quizView.vue`: adapts the existing Arena route to host assessment selection/review.
- `src/components/study/StudyLearn.vue`: completion handoff to Arena and ungraded-check wording.
- `src/components/study/StudyQuiz.vue`: reuses the assessment UI in Arena; explicit preview
  status and a return-to-revision action for an empty Boss Battle.
- `src/router/index.js`: protects Arena and redirects old Lab assessment URLs.
- `src/router/__tests__/flow.spec.js`: direct entry, login protection, both-way navigation,
  timer pause and legacy redirects.
- `src/views/__tests__/StudyView.spec.js`: learning-only modes and completed-topic handoff.
- `src/views/__tests__/StudyFlashcards.integration.spec.js`: confirms the real Supabase client’s
  fixture HTTP requests from Lab fetch only quick checks, never formal question sets.
- `src/views/__tests__/ArenaView.spec.js`: profile filtering, answer/review isolation, question
  sets, topic selection, empty/error/retry, loading races and revision navigation.
- `docs/back-to-home.md` and this document.

The **Quiz me!** follow-up also changes both views, `StudyLearn.vue`, `StudyQuiz.vue`, their
view/route tests and this document. It adds `src/composables/useTopicCompletion.js` and its
storage tests. Existing Supabase services, routes, timer, Flashcards and buddy are unchanged
by the follow-up.

## Verification and limits

- **187 tests passed across 18 files** using `pnpm exec vitest run`.
- Production build passed using `pnpm run build`; existing large-bundle warnings remain.
- ESLint and Oxlint passed for all source/test files changed in this task.
- `git diff --check` passed.
- Existing Flashcards, timer, buddy, account/avatar and navigation tests remain passing.
- Synthetic two-topic tests cover consecutive topic completion, both quizzes remaining
  available after reviewing one, duplicate prevention, reloads, account/level isolation,
  storage failures, locked topic handoff and independently accessible Boss Battles.
- Tests use fixture service/HTTP responses. No new authenticated live Supabase or browser
  verification was performed, and responsive layout was not visually verified because the
  session’s saved localhost permission blocks browser access.

Pre-separation source/test snapshots are saved under the Git-ignored `.lab-arena-backup.local/`.
Snapshots immediately before the Quiz me! follow-up are under `.quiz-me-backup.local/`,
with a manifest mapping snapshot numbers to original files. That follow-up adds the
completion composable and its test; those two files have no pre-change snapshot. Restore
only after reviewing later edits, so unrelated changes are not overwritten.
Earlier weather, avatar sync and shared home-link work is retained. The older Back to Town
rollback deliberately refuses to overwrite these later Lab/Arena edits; do not change its
fingerprints to force it. Local snapshot directories are ignored by Git and are not
included when the branch is pushed. See [Team testing](team-testing.md) for setup
and the current feedback checklist.
