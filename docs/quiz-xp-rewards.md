# Quiz XP prompt

`quizView.vue` uses the shared `xpPrompt.vue` for the submission, retry and saved
reward states. It displays the number correct, rounded percentage, awarded XP,
and the buddy's saved XP/level. If the buddy hits its XP limit, awarded XP and
applied XP are shown separately.

Answers remain editable drafts until Submit quiz is pressed on the last question.
Previous/Next navigation restores each question's latest selected option and can
skip unanswered questions. Submission requires an answer for every question;
the last question links back to the first unanswered question when needed.
Navigation and answer changes are disabled during submission and after grading.
Boss battles retain their existing single-choice locking behavior.

The percentage is rounded first. XP is then interpolated within the matching
range and rounded to an integer:

| Score | XP |
| --- | --- |
| 0% | 5 |
| 1–20% | 5–10 |
| 21–40% | 11–20 |
| 41–60% | 21–30 |
| 61–80% | 31–40 |
| 81–99% | 41–50 |
| 100% | 50 |

`src/utils/quizRewards.js` implements the display calculation. Quiz progression
now uses the same `planPokemonXp` Vue helper as boss rewards, with the 200 XP
evolution threshold and XP carried over into the next species.

1. `prepare_learning_quiz_progression` grades the answers and returns the owned
   buddy's current species, XP and level. It does not award XP or complete the attempt.
2. `quizService.submitQuiz` calls `planPokemonXp` in Vue to calculate the final
   species, level, XP and evolution transitions.
3. `submit_learning_quiz_progression` checks the current authenticated owner,
   rechecks the grade and old buddy state, and stores the Vue plan in that same
   `user_pokemon` record. The species catalogue UUID, XP and level are updated
   together with the attempt, answers and XP ledger in one transaction.
4. The popup receives `originalPokemon`, `pokemon` and `evolutions`, and uses
   `PokeSprite.playEvolution` to show the front-facing transformation and badge.

Submission retries reuse the same run ID and answers. Completed attempts return
their saved receipt without applying XP twice. Reopening a reward does not award
XP. Planning/API failures happen before the save; stale-state or ownership
failures roll back the entire commit. Delayed responses cannot replace a new quiz.

Apply `supabase/migrations/20261105130000_quiz_vue_progression.sql` in the project's
Supabase SQL Editor after the connected-learning migration. This migration creates
the new prepare/commit calls; it does not change existing owned records. The
database grades quizzes and persists the proposed state; evolution selection and
calculation remain client-authoritative in Vue, as requested. Legacy grading RPCs
remain for compatibility; the current quiz UI uses the new progression calls.

Verification: 52 focused unit/component tests, 15 isolated PostgreSQL integration
checks, ESLint for the touched quiz code, and the production build passed. The
database tests compare all 101 whole percentages and four fractional scores
against the frontend calculation and verify one ledger entry per attempt.
The integration checks also execute the actual Vue planner and assert a
Charmander → Charmeleon update of species UUID, XP and level, ownership isolation,
retry idempotency and rollback on stale/invalid plans. No live database writes or
migration deployment were performed from this workspace.
