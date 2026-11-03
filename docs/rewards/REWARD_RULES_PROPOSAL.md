# Reward rules and implementation status

4 November 2026. Confirmed: each quiz has its own first-ever accuracy bonus; duplicate XP goes to the selected buddy; the progression framework is halved. The demo needs no further progression after the available collection is fully trained. This document does not authorize database changes. Other earning-rule details remain proposals where explicitly noted.

Persistence update: starter/collection/selection/pack-opening functions are now deployed; see `deployment/DEPLOYMENT_REPORT.md`. Normal study/quiz/streak earning remains unimplemented. No welcome pack is granted.

## Approved progression (cumulative XP)

| Evolution line | Evolution milestones | Fully trained |
| --- | --- | --- |
| Three stages | 75 XP, then 175 XP | 250 XP |
| Two stages | 125 XP | 250 XP |
| No evolution | None | 250 XP |

XP is not reset after evolution. Final evolution can continue training until 250 XP. Excess XP remains available for another eligible buddy. Activity rewards remain 15 XP per study block, accuracy bonuses capped at 50 XP, 5 XP per repeat quiz, and the intended 25 XP duplicate reward. Browser helpers only support the existing local preview; persisted rewards need authoritative server enforcement.

The capacity evidence is now saved in `capacity_snapshot_20261104.json`; the updated illustrative model is `capacity_model_250.json`. Three fully trained Pokémon cost 750 XP, estimated at 5–8 days across levels under the model's daily-cap/80%-accuracy assumptions. The catalogue remains empty and live earning functions are not deployed.

## Suggested starting rules

| Event | Proposed reward / limit |
| --- | --- |
| Signup | Choose Bulbasaur, Charmander or Squirtle once; saved directly as the first selected buddy. It does not consume an earned pack. |
| Completed study block | 15 XP to selected buddy; first four validated blocks per Singapore calendar day, maximum 60 XP. Confirm required block duration and pause/completion rules. |
| First-ever attempt of a particular quiz | Server-graded accuracy reward. Upper bound floor(50 × accuracy fraction); lower bound max(0, upper − 10); uniform inclusive integer draw. Save the draw once. |
| Later attempts of that quiz | 5 participation XP per submitted attempt within the daily limit, including on subsequent days. |
| Daily quiz limit | Recommend three rewarded/completed attempts across all quizzes per student, per Singapore day. User's notes also mention three per quiz/day; must decide which meaning applies and whether ungraded practice remains available after the cap. |
| High-score pack | Three qualifying quizzes strictly above 80%. Recommend distinct quiz/topic identities and counting only the first graded attempt of each per day; decide whether progress resets after each earned pack and whether the same identities can qualify in later cycles. |
| Streak pack | Recommend one pack on consecutive active-day milestones 5,10,15,…; one completed validated study block or submitted graded quiz qualifies a day. Login alone does not count. A missed day resets the streak; revisiting the same date does not advance it. |
| Duplicate draw | Josh's intended +25 XP to the user's currently selected buddy (recipient confirmed by user); persist recipient at award time. Define behavior when selected buddy is absent or capped. |
| All owned Pokémon capped | Recommend a separately identified recovery pack that guarantees an eligible unowned species, granted once per blocked progression state. The approved training cap is 250 XP. For this finite demo, show a collection-complete state when no unowned eligible species remain; no extra progression path is required. |

Accuracy examples: 0% → 0 XP; 80% → 30–40 XP; 100% → 40–50 XP. The random first reward can be below 5 at low accuracy; do not silently impose a participation floor unless agreed.

The daily total depends on quiz identity. Four study blocks plus three attempts of the same new quiz yields at most 60 + 50 + 5 + 5 = 120 XP. If three different quizzes are all first-ever attempts, the same per-quiz rule permits at most 60 + 50 + 50 + 50 = 210 XP. On a day containing only repeat quizzes the maximum is 60 + 15 = 75 XP, before duplicate rewards. A 120-XP universal cap would require a different, explicit rule (for example, one accuracy bonus per day). These alternatives must not be conflated.

“Above 80%” excludes exactly 80%. With a five-question quiz, 4/5 does not qualify; only 5/5 qualifies. With three questions, 2/3 is approximately 66.7%, so again only a perfect score qualifies. Confirm whether the intended child-facing threshold is instead **at least 80%**. Calculate qualification from exact correct/total integers, never a rounded display percentage.

Quiz identity should be a stable topic/mode/version definition, not a newly generated attempt UUID or random question order. Decide whether ordinary and Boss Battle modes share a first-attempt allowance. Save the question/option snapshot for each attempt, especially when question banks have only 3–5 regular questions.

## How to enforce this safely

1. Save an authoritative completed event for a focus block, quiz or streak milestone. Browser clocks, localStorage counters and client-submitted scores cannot grant XP or packs.
2. In one server transaction, lock the student's reward-account/claim row, check daily counters and previous grants, create a uniquely keyed ledger entry, credit the selected owned buddy and/or insert the pack. A retry returns the existing grant. Concurrent tabs cannot bypass the cap.
3. Use server timestamps and Asia/Singapore date boundaries. Decide how failed/abandoned quizzes count and how long a focus block can be resumed; completion validation must measure eligible time, excluding pauses.
4. Opening a particular owned pack locks it and serializes collection changes for that student. The server selects from an approved non-empty catalogue, saves the result, consumes the pack and credits ownership or duplicate XP together. Independent packs opened concurrently must handle the unique ownership constraint safely. Repeat calls return the saved result, including after reload/network uncertainty. Never let artwork/network failures reroll a committed result.
5. The navbar count is the server's number of earned unopened packs. Visiting Rewards does not clear it. After grants/opening, refresh the shared inventory; polling/focus provides a fallback. Instant updates across devices can be added after reviewing Realtime permissions/publication separately.

Secure grading and persisted attempts are prerequisites for quiz rewards; existing Arena previews cannot earn graded XP or high-score packs. Study/streak rewards can be delivered first once their server validation exists.

## Decisions needed next

- Three quiz attempts **globally per day** or **per quiz per day**. The first-ever accuracy bonus is confirmed **per quiz**, not one global daily bonus.
- Three distinct qualifying quiz/topics, threshold **>80%** or **>=80%**, and repeat/reset rules for earning subsequent high-score packs.
- Study block duration, streak qualifying activity/milestones and no-eligible-buddy XP handling. Progression thresholds are approved above; no additional post-collection progression is needed for this demo.

No design work is needed to settle these rules. No reward-rule implementation or database deployment is approved by this proposal.
