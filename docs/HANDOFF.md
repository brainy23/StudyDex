# StudyDex handoff — rewards progression and local integration

Updated 4 November 2026 (Asia/Singapore).

## Current work and Git state

The Arena/Mathematics integration is saved at `b6dc9aa` on `integration/user-registration`. Rewards work started from that checkpoint on `fix/josh-rewards-inventory`; initial frontend checkpoint is `bc8d7ba`. The user has explicitly authorized implementing the functional fixes, halving progression thresholds and merging the rewards branch into integration locally. At this writing the final feature checkpoint/merge is being prepared; check Git for the resulting commit. No push is authorized.

The original untracked AGENTS/CLAUDE instructions, audit folder and earlier review notes remain preserved and outside the application commits. Never add them blindly. No environment files were read, copied, edited or committed. No new dependencies.

## What changed

- Preserved the Arena/Mathematics work: actual topic catalogue, profile-level selection, Learn/flashcards/shared timer, optional practice without punishment and ungraded Supabase Arena previews. Do not fetch private answer keys in the browser.
- Selectively ported Josh's rewards/starter components and required assets, preserving existing auth/router/timer. Shared earned/unopened pack count drives Town and Bag badges and direct Rewards navigation.
- `src/data/pokemonProgression.js`: approved cumulative progression: three stages evolve at **75/175 XP**, two stages at **125 XP**, every Pokémon fully trained at **250 XP**. Study/quiz/duplicate earning amounts are unchanged.
- `PokemonBuddy.vue` uses the shared rule for its existing local preview: XP survives evolution, final forms keep training to 250, overflow is retained, and backwards preview transitions remain supported. Home/QuestPhone/collection caps use the same constant. Standalone local recovery gifts appear even at an exact cap with no overflow and select the new eligible buddy.
- Rewards fixes include pointer cancellation, keyboard opening/focus, audio isolation, artwork fallback, async cleanup, reduced motion, same-account RPC response validation, account-isolated pending pack IDs, retry/reload recovery and result acknowledgement. A new request cannot overwrite an uncertain pack opening. Account changes clear the previous card.
- Signup routes to starter selection; saved claims are checked before confirmation. Errors allow Continue studying rather than blocking the whole app. Email-change callbacks remain in Account. No fake saved starter or reward is substituted when backend functions are unavailable.

Read `docs/rewards/README.md` for file-level details and `docs/rewards/REWARD_RULES_PROPOSAL.md` for confirmed versus pending rules. `docs/MERGE_ARENA_MATH.md` retains the earlier merge evidence.

## Backend status and decisions not to undo

**The four reward/starter RPCs are not implemented or deployed.** The live Pokémon catalogue, ownership and packs were empty in the approved read-only evidence. `user_packs` has no read policy. Exact SQL approval is required before any Supabase SQL, imports, migrations, RLS/grants or database changes; no such operation is authorized by the local source merge.

`docs/rewards/03_inventory_access_proposal.sql` remains unapproved/unexecuted and is not a complete backend deployment. The other SQL files were approved read-only checks. Fresh capacity counts and the 250-XP model are preserved in `capacity_snapshot_20261104.json` and `capacity_model_250.json`. There is enough educational content for a three-Pokémon demo, conditional on renewable study/repeat XP and eligible Pokémon availability.

The user confirmed each quiz has its own first-ever accuracy bonus; duplicate XP goes to the selected buddy; the finite demo needs no additional progression after completing its collection. Daily global versus per-quiz attempt limits, exact streak/high-score qualification and trusted study-block validation still need agreement. Do not award from browser clocks, scores, localStorage counters or ungraded previews.

The buddy page/Trainer/Town collection still contains local prototype data. The new progression code does not make those records authenticated server inventory. Same-tab pack recovery relies on session storage and future server idempotency; cross-device result history, actual concurrency, reward persistence, secure grading and earning enforcement remain unfinished. Keep pending XP rather than losing it when a buddy caps.

## Verification

- **317 unit cases / 35 files pass**, using temporary Vitest configuration with environment-file loading disabled.
- **5 Chrome rewards fixtures pass**: mobile badge → Rewards → keyboard opening/recount; one-time starter UI; failed-response reload recovery of the same pack; unavailable starter fallback; cumulative progression/evolution/cap/overflow.
- **2 existing Chrome Mathematics fixtures pass**, P1 mobile and P6 desktop, retaining learning/cards/timer/ungraded preview behavior.
- Production build passes with environment-file loading disabled and output outside protected `dist/`; existing large chart/dashboard chunk warning remains.
- Required `pnpm lint` exits 1 on three existing Oxlint errors in Timer and account/registration tests. Separate full no-fix ESLint reports four existing Landing/Timer errors. Changed-file ESLint passes; no unrelated autofixes retained.
- Browser responses are synthetic; these checks do not prove live RPC deployment, authenticated RLS access, grading, real persistence or cross-tab database safety. No live database operations occurred during this merge task.

## Next steps

1. Review/approve the demo Pokémon catalogue and narrow backend/security changes, showing exact lowercase SQL before execution.
2. Implement/test inventory, durable one-time starter grants and atomic/idempotent pack opening on a disposable database, then obtain exact deployment approval. Include account isolation, selected-buddy ownership, duplicate XP, capped buddies and concurrent requests.
3. Implement authoritative study events, reward ledger, daily caps and overflow handling using the approved 250-XP progression rule. Preserve existing Science/Mathematics and student records.
4. Build secure grading/persisted quiz attempts before enabling quiz XP or high-score packs. Normal/Boss quiz identity and daily attempt rules must be explicit.
5. Validate live authenticated student journeys and cross-device recovery after backend approval. No push/main merge without explicit authorization.

## Commands

```sh
pnpm test:unit --run
pnpm lint
pnpm build
STUDYDEX_E2E_BROWSER_CHANNEL=chrome pnpm exec playwright test --config playwright.rewards.config.js
STUDYDEX_E2E_BROWSER_CHANNEL=chrome pnpm exec playwright test --config playwright.math.config.js
```

Standard Vite commands use the developer's existing configuration. Fixture servers deliberately avoid local environment files and intercept Supabase with fake credentials. Read `docs/team-testing.md` for broader team testing guidance.
