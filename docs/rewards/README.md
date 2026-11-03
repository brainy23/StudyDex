# Rewards functionality checkpoint — 4 November 2026

## Saved integration and scope

The user authorized saving the resolved Arena/Mathematics integration. Local merge commit `b6dc9aa` has parents `f07328e` and `4edbee6`. Integration is preserved at that commit. Nothing was pushed. Rewards work is on `fix/josh-rewards-inventory`, based on that integration checkpoint, as the user selected. Josh's reviewed source is fetched `origin/josh` at `263f9a1`.

Only the rewards/starter components and their required pack/starter assets were ported. Josh's old router, quiz and timer were not merged. Auth, Mathematics and Science selection, private answer-key exclusion, ungraded Arena and the shared timer remain.

## Implemented frontend and service contracts

- `src/services/rewardsService.js`: authenticated inventory, opening and starter RPC adapters; explicit response/account checks; UUID pack IDs; no browser reward selection, direct inventory writes or secret keys. The four RPCs below are **not deployed**.
- `src/composables/useRewardInventory.js`: one shared count and list across consumers; unknown count on backend failure; account-change invalidation; focus/visibility refresh, 30-second visible-page polling and an in-app reward-change event; cleanup after the last subscriber. Polling is not an instant cross-device push notification.
- `src/views/HomeView2.vue`: removes hardcoded three-pack count; existing Bag badge uses verified unopened count. Bag routes to Rewards when packs exist, otherwise retains Trainer destination. Sleeping does not block bag access.
- `src/components/common/StudydexBubbleNav.vue`: same shared count and Rewards routing, including from the Trainer page when Bag is already current. Count is announced accessibly. No new visual redesign.
- `src/views/rewardsView2.vue`: Josh's pack presentation; removes hardcoded five packs, sample ownership and browser random rewards. Explicit opening action calls the server with a specific owned pack ID; only a verified result is displayed. Failed/uncertain requests retain that pack ID for retry during the current page instance. Missing artwork cannot reroll the server result. Cancellation is separate from release; keyboard opening, optional failure-isolated audio, reduced motion, visible errors, fallback artwork and async cleanup are implemented.
- `src/views/starterSelectionView.vue`: Josh's three choices, accessible buttons and working confirmation handler. Checks server claim status and waits for successful grant before continuing. Missing backend is an error, not a simulated successful grant.
- `src/views/RegisterView.vue`: authenticated signup/email confirmation goes to Starter, then successful starter confirmation continues to Landing. Email-change callbacks still return to Account. Onboarding enforcement after logging in on another device is not yet implemented.
- `src/router/index.js`: protects Rewards and Starter with existing auth guards; `/pokepacks` aliases `/rewards`.
- Five new unit spec files plus updated registration/router cases exercise contracts, stale-account responses, count changes, navigation, duplicate XP display, cancellations, retry identity, audio/artwork failures, cleanup and starter confirmation.
- `e2e/rewards-flow.spec.js`, `playwright.rewards.config.js`: isolated synthetic Chrome journeys; never connect to the real project.

RPC contracts proposed for backend implementation:

| RPC | Input | Required response / guarantee |
| --- | --- | --- |
| `get_reward_inventory` | none | Verified `user_id`, total `unopened_count`, oldest up to 20 unopened `packs` with IDs/earned timestamps. |
| `open_reward_pack` | `p_pack_id` UUID | Verified `user_id`, same `pack_id`, `reward_type`, catalogue `pokemon` (`pokeapi_id`, `name`, nullable `sprite_url`), `xp_awarded` for duplicates. Server owns selection and all writes. Retrying a previously opened pack returns its saved result. |
| `get_starter_status` | none | Verified `user_id`, boolean `claimed`. |
| `claim_starter` | `p_pokeapi_id` in 1,4,7 | Verified `user_id`, `claimed: true`; one lifetime starter grant, enforced by durable server uniqueness/locking. |

These are reviewable client contracts, not proof that backend operations exist. The opening UI currently preserves uncertain request identity only until page exit. Durable recovery after a refresh/device change must be addressed by the backend's result/history contract before launch.

## Live evidence — read-only only

Project metadata confirms `sbrteylcizwkzetcqdro`, Studydex Database, active/healthy. The user approved both exact SQL files below. No data, permissions, imports, migrations or backend functions were changed.

1. `01_read_only_preflight.sql`, SHA-256 `f8d896c47f51fcc9ba174eb34e2a9746c56ee0b6425dcc630fddaf863d0ff878`: multi-result tool output exposed only the final non-empty owned-Pokémon count (zero). Other checks cannot be certified from that first output.
2. `02_read_only_preflight_snapshot.sql`, SHA-256 `b6fd0737e8bdd2f5178c62b895c82545d9ae399742fc4c1a73bd329a973d7ec6`: approved replacement returned one complete JSON result, saved as `preflight_snapshot.json`. Transaction was read-only, repeatable-read; execution role was postgres, so this is **not** an authenticated browser/RLS test.

Confirmed: Pokémon catalogue 0, owned Pokémon 0, earned/opened/unopened packs 0. All four inspected tables have RLS enabled. Catalogue and owned-Pokémon have their existing authenticated read policies; `user_packs` has no policies. None of the four proposed reward RPCs exist. Broad API-role grants, including `truncate`, remain the separately identified audit concern; no destructive route was tested and no grants were altered.

`03_inventory_access_proposal.sql` is an **unexecuted, unapproved** own-pack read policy and security-invoker summary RPC proposal. It grants no pack creation, ownership writes or XP awards. Its SHA-256 is `997b504cc2c54dfc0128d5abb6d16f8284370043eccf80810555130c6a8afa2c`. It is not a complete rewards deployment, has not been tested on disposable Postgres, and must not be executed as implied permission from the read-only approval.

## Product rules: confirmed versus under discussion

Read `REWARD_RULES_PROPOSAL.md` for the beginner-friendly rule proposal and the important 120-versus-210 XP cap ambiguity.

Confirmed by user: signup starter selection; duplicate pack XP belongs to the currently selected buddy. Josh's +25 XP value is an intended prototype behavior; no backend award exists.

The user's latest conversation proposes:

- 15 XP for each completed study block, up to four blocks/60 XP per day.
- Quiz version 2: first-ever attempt of a quiz gets an accuracy-based random amount capped at 50; later attempts get 5 participation XP; daily maximum three attempts. Global versus per-quiz daily limit requires confirmation.
- For first-attempt accuracy `a`, proposed upper bound is floor(50 × a), lower bound max(0, upper − 10), inclusive integer random draw. Thus 80% gives 30–40 XP and 100% gives 40–50 XP. This is a proposal, not deployed grading.
- Pack triggers: three quizzes strictly above 80%, five-day streak, and no Pokémon left eligible for XP. Need decisions on distinct quiz identity, repeat eligibility/reset cycles, streak qualifying activity/milestones, block duration, level/XP caps and collection-exhaustion behavior.
- Daily dates should be server-calculated in Asia/Singapore. No client clock/count/score may authorize a reward.

Quiz scoring is currently an ungraded preview. Secure server grading and persisted attempt snapshots must precede quiz XP or high-score packs. Never expose `question_answers` in the browser.

## Verification

- Full unit suite uses an environment-disabled temporary config; **284 cases passed across 31 files** on the final rerun.
- Changed-file ESLint passes. Required `pnpm lint` exits 1 on the three existing Oxlint errors: missing throw messages in account/registration service tests and unused expression in `components/timer/Timer.vue`. ESLint stage therefore does not run in that command. No unrelated autofixes retained.
- Production build passes with local environment loading disabled and output outside protected `dist/`. Existing large dashboard/chart chunk warning remains; temporary config bundling also produced external optional-tool import warnings.
- Chrome starter journey passed. Mobile (390px), reduced-motion badge/opening journey passed after correcting the test's starting route to Trainer, where the shared Bag nav actually exists. Both use synthetic RPCs: successful backend persistence/authorization/concurrency is **not** verified.
- No new dependencies. No environment files read/copied/edited. No live student record or private answer-key read.

Commands (standard commands require the developer's already configured environment; fixture commands never load local environment files):

```sh
pnpm test:unit --run
pnpm lint
pnpm build
STUDYDEX_E2E_BROWSER_CHANNEL=chrome pnpm exec playwright test --config playwright.rewards.config.js
```

## Next tasks, functionality only

1. Agree exact XP/attempt/pack/streak rules and an XP/level curve, including what happens when the selected buddy cannot accept XP.
2. Review and approve a catalogue-only import and narrow permissions/security changes. Catalogue is empty; neither starters nor random pack draws can work against it yet. Preserve all educational/student data.
3. Implement and independently test the authenticated inventory, one-time starter and atomic/idempotent opening backend on a disposable database before approving exact deployment SQL. Test own/other/anonymous users, concurrent tabs, network retries, rollback and full-page result recovery. Keep duplicate XP and pack consumption in one transaction; serialize per student to prevent overlapping pack/starter awards.
4. Add server-validated focus block events, immutable reward ledger and uniqueness constraints for daily caps/milestones. Frontend timers alone are insufficient proof of completed study.
5. Build secure grading and persisted quiz attempts, then add quiz XP/high-score pack triggers; verify small 3–5-question Mathematics quizzes and real account access. Do not award from the present preview UI.

Current decision: **frontend integration prepared and fixture-tested; NO-GO for live reward grants/pack opening until the approved backend/catalogue/security work is implemented and tested.**
