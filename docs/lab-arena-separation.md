# Poké Lab learning flow and Poké Arena handoff

## Responsibilities and ownership

| Area | Route | Content |
| --- | --- | --- |
| Poké Lab | `/study-decks` | Topic introductions, goals, concepts, explanations, worked examples, Flashcards, Study Block Timer and Pokémon Buddy |
| Poké Arena | `/quiz` | Regular Topic Quizzes, Boss Battle previews, and future trusted grading, results and assessment feedback |

The local history and existing services were inspected before editing Arena. The latest
Arena implementation is the integrated Vue page from commit `7868abd` by Javan Chua.
It hosts `StudyQuiz.vue` and already supports safe question/option retrieval and ungraded
choice review. No separate grading service, attempt submission implementation or competing
Arena changes were found in the working tree. The current changes adapt that implementation:
topic context, direct entry, an explicit preview action, and honest unavailable states.
They retain its question navigation, Boss Battle separation, caches, errors and choice review.

Both routes remain authenticated and filter topics using the profile's saved
`school_level_id`. School level is never taken from URL parameters. No artwork, tables,
SQL, migrations, policies, educational records or live assessment writes were created or
modified. Existing quick-check records remain untouched.

## Learning and active recall

Learn retrieves only `topic_learning_goals` and `topic_concepts`, using their existing
ordering. It neither requests nor renders quick-check MCQs or True/False questions.
Explanations and visually distinct worked examples are the main content. Position,
Previous/Next navigation and a keyboard-accessible roadmap support revisiting any concept.
Read counts track distinct concepts acknowledged with Next Concept or Finish Topic.
Jumping ahead via the roadmap does not mark skipped concepts read.

The final concept offers **Finish Topic**. Completion stays in Lab and offers:

- **Review with Flashcards**: switches modes for the same topic and uses the existing deck.
- **Go to Poké Arena**: opens that topic's regular quiz selection without starting it.
- **Revisit Concepts**: returns to the overview and roadmap.

Titles for subjects, topics, concepts and buddy names are capitalized for display only.
Database strings, IDs and query matching are unchanged. Explanation/example text remains
verbatim, with its line breaks preserved.

Flashcard actions appear only after revealing the answer:

- **I Remembered** removes the current card from the active queue and records its unique ID.
- **Practise Again** reinserts it after the next queued card (or leaves it as the only card).
  It does not increase the remembered count.

Each action increases total review attempts once and returns to the next card's question.
Duplicate source IDs cannot inflate the unique deck count. Flipping, optional images,
backend order, visit-only caches, progress and Restart Deck remain available. Keyboard
focus returns to the next card or the completion heading after an action.

**Flashcards Completed!** shows unique cards remembered and total review attempts. It offers
**Revise Another Topic**, **Go to Poké Arena**, and a separate optional **Restart Deck**.
Topic selection keeps the saved school level, checks existing lesson/deck availability,
shows errors with retries and explains when no other populated topics exist. Concepts-only
topics open Learn; topics with cards open Flashcards. Returning to a completed deck allows
an explicit Restart Deck.

Learn completion history remains local per student and school level. It is reading history,
not assessment eligibility. Regular quizzes no longer require completing Learn, so entering
Flashcards directly also supports the Arena handoff. No learning action starts a quiz or
awards XP. The timer and buddy retain their existing behavior; leaving Lab pauses the timer.

## Navigation contract

`topic_id` is the canonical query parameter. Both Lab and Arena still accept the legacy
`topic` parameter; when both are supplied, `topic_id` takes precedence.

| Action | Destination |
| --- | --- |
| Lab header, Learn completion or Flashcard completion → Arena | `/quiz?subject=<subject_id>&topic_id=<topic_id>` |
| Select Boss Battle | Same Arena topic, with `battle=boss` |
| Arena → Flashcard revision | `/study-decks?subject=<subject_id>&topic_id=<topic_id>&mode=flashcards` |
| Review Entire Topic | `/study-decks?subject=<subject_id>&topic_id=<topic_id>&mode=learn&review=topic` |
| Future Review Weak Concepts | `/study-decks?subject=<subject_id>&topic_id=<topic_id>&mode=learn&review=concepts&concept_ids=<id>&concept_ids=<id>` |
| Revise Another Topic | `/study-decks?view=topics&mode=flashcards&from_topic_id=<completed_topic_id>` |

`arenaLocation` deliberately omits `battle`, selecting the regular quiz for both Lab
completion flows. `lessonReviewLocation(topic, conceptIds)` builds full-topic or targeted
review links. It does not infer weakness. Lab matches requested concept IDs against the
selected topic's readable concepts, opens the first matching requested concept, and marks
matching entries **Revisit** while preserving the full database-ordered roadmap. Missing,
null or foreign IDs never label concepts weak. With no matches, Lab offers the overview.
`review=topic` always opens the overview. Route hints cannot establish a grade.

Legacy Lab assessment bookmarks with `mode=quiz` or `mode=boss_battle` redirect to the
protected Arena route with canonical topic context. Subjects/topics outside the student's
catalogue are rejected before loading their resources. Town links and auth guards remain.

## Assessment availability and future grading contract

The supplied pilot inventory is Primary 3 → Science → Diversity of Living and Non-Living
Things: 7 concepts, 15 flashcards, 7 quick checks, 2 Boss Battle questions and **0 regular
quiz questions**. These are separate purposes; quick checks and Boss Battles are never
substituted for regular quizzes.

An empty regular bank displays an informative message and a disabled **Start Quiz**.
When questions exist but secure grading is unavailable, Start Quiz stays disabled and
**Preview Questions** explicitly opens the existing ungraded preview. Answer selection
never begins automatically on arrival. Boss Battle questions remain a separate preview.
Preview choices are visit-only; they are neither submitted nor graded. No retry-quiz action,
pass/fail result, weakness claim or rewards are presented without backend support.

The following is an integration specification, **not implemented grading functionality**:

1. An authenticated server operation validates the student, saved school level, topic,
   purpose, question IDs and selected options. It reads `question_answers` on the server,
   grades against trusted keys, and persists `quiz_attempts` and `quiz_attempt_answers`
   with protection against duplicate submissions. Browser code must not fetch answer keys
   or write authoritative correctness/score fields.
2. Return an authorized, completed attempt tied to the topic and `question_purpose=quiz`,
   its trusted score percentage, and trusted per-question correctness. Use the unrounded
   authoritative score: **>= 50% passes; < 50% fails**. Missing or invalid results cannot
   be classified as failures.
3. For a failed regular attempt, identify questions explicitly graded incorrect. Resolve
   their `questions.concept_id` links against `topic_concepts.id` for the same topic.
   Deduplicate matches and ignore null/foreign/missing links. Never infer incorrectness
   from frontend selections, a missing client answer, route parameters or an unverified key.
4. Offer **Review Weak Concepts** only when these validated links provide evidence. Pass
   those IDs to `lessonReviewLocation`. Offer **Review Entire Topic** for every failed
   regular quiz, and use it as the fallback when concept evidence is unavailable. If some
   incorrect questions lack links, do not imply that the mapped concepts cover every gap.
5. Show **Retry Quiz** only when the backend supports starting a new authorized attempt.
   Reopening or restarting a preview is not a retry of a graded quiz.

The missing regular quiz content and missing trusted grading/attempt service block actual
Start Quiz, 50% pass/fail results, automatic weakness detection, saved attempts and retries.
Only the revision navigation receiver, link builder and full-topic Arena action are complete.
No invented endpoint or fake assessment result is wired into the app. Any proposed SQL must
first be shown verbatim, explained and explicitly approved by the owner, including read-only
SQL. No SQL was executed as part of this change.

## Verification

See [learning-flow-test-report.md](learning-flow-test-report.md) for current results and
[team-testing.md](team-testing.md) for the manual checklist. The earlier
[flashcards-test-report.md](flashcards-test-report.md) is a historical report of the old
three-button controls.
