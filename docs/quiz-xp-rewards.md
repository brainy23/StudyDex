# Quiz XP prompt

`quizView.vue` uses the shared `xpPrompt.vue` for the submission, retry and saved
reward states. It displays the number correct, rounded percentage, awarded XP,
and the buddy's saved XP/level. If the buddy hits its XP limit, awarded XP and
applied XP are shown separately.

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

`src/utils/quizRewards.js` implements the display calculation. The existing
`private.learning_submit_quiz` function in migration
`20261105112227_connected_learning_and_account_data.sql` already uses this scale
and grades, awards XP, and records the attempt in one transaction.

The popup uses that saved receipt. It does **not** call `awardExperience`,
`PokeSprite.addXP`, or another XP write. Submission retries reuse the same run ID
and answers; the database returns a duplicate receipt for an already completed
attempt. Reopening the reward or restoring a completed attempt never awards XP.
An old topic's delayed submission response cannot replace a newer quiz's popup.

Verification: 40 focused unit/component tests, 14 isolated PostgreSQL integration
checks, ESLint for the touched quiz code, and the production build passed. The
database tests compare all 101 whole percentages and four fractional scores
against the frontend calculation and verify one ledger entry per attempt.
No live database writes or migrations are needed for this UI change when the
existing connected-learning migration is installed.
