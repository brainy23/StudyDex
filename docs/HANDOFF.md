# StudyDex handoff — Pokémon persistence deployed

Updated 4 November 2026 (Asia/Singapore).

## Current state

Active branch: `integration/user-registration`. Previous local merge is `1048d8d`; the current session adds real Pokémon persistence and its application wiring. No push, main merge or hosting deployment is authorized/performed. Preserve original untracked AGENTS/CLAUDE files, audit directory and earlier review notes; do not add them blindly.

**Supabase backend is deployed**, with explicit approval of the exact installation/verification SQL: migration `20261103212559_studydex_pokemon_persistence_v1`, project `sbrteylcizwkzetcqdro`. Read `docs/rewards/deployment/DEPLOYMENT_REPORT.md`, `execution_20261104.json` and `live_verification_20261104.json`. Do not rerun the installation: it intentionally refuses an already populated/installed baseline.

## What users can do with the new app code

- Select Bulbasaur, Charmander or Squirtle once during initial signup/onboarding. Existing users without a collection are sent to starter selection on login and can reach it from their collection.
- Save owned Pokémon under their authenticated profile, reload/sign back in and retain that collection. Town, Trainer and Lab use the same saved selected buddy/current evolution.
- Select their buddy through the Town Trainer Hub/Pokédex; failed saves retain the previous selection.
- Open a legitimately awarded owned pack atomically and retry its saved result safely. Duplicates credit 25 XP to the selected buddy, capped at 250; excess remains available when selecting an eligible buddy. Exact-cap recovery creates one pack while an unowned base remains.
- No welcome packs are granted. No student's starter was chosen by the agent. The legacy `/pokebuddy` sample-user/XP-testing page redirects to the authenticated Trainer; its standalone component remains development/test source only.

The backend is deployed; application code still needs the team's Git push/hosting deployment. No live signed-in browser claim has been performed by the agent. The database intentionally still had zero owned Pokémon/packs/claim accounts/receipts immediately after installation: users make their own starter choice.

## Files and schema

- `src/services/pokemonService.js`, `src/composables/usePokemonCollection.js`: checked authenticated collection GET/selection and account-isolated shared state.
- `HomeView2.vue`, `TrainerView.vue`, `QuestPhone.vue`: sample collections removed from deployed flows; saved collection, selection/loading/errors/first-starter/pending-XP states.
- `LoginView.vue`, router: first-starter onboarding and safe legacy route.
- `studyService.js`, `studyView.vue`: saved current form, numeric ID and evolution stage in Lab.
- Rewards service/view: refresh ownership after claims/opening; explain saved overflow.
- `docs/rewards/deployment/`: approved SQL (unchanged hashes), local PostgreSQL harness/results, preflight, deployment records and manual acceptance steps.

Existing `pokemon`, `user_pokemon`, `user_packs` columns were retained. Catalogue now has 9 entries (three starter evolution chains). `user_pokemon.pokemon_id` retains the acquired base; appearance is derived from cumulative XP. New private RLS-protected tables are `studydex_reward_accounts` and `studydex_pack_receipts`. Six authenticated public invoker RPCs call guarded private implementations. Internal helpers/private tables remain inaccessible to browser roles. Browser inventory writes and public-table truncate privileges were revoked. No frontend secret/service-role key was introduced.

Approved progression remains 75/175 XP (three stages), 125 XP (two stages), 250 XP fully trained. No resets after evolution. Per-quiz first-ever bonuses and duplicate XP to the selected buddy are approved product rules, but normal earning implementation is separate below. The finite demo needs no extra post-collection progression.

## Preserved behavior and data

Keep Mathematics/Science selection, learning engine, shared timer, optional practice without punishment and ungraded Arena. Keep explicit field lists excluding private answer keys. Source/client clocks and localStorage are never proof for rewards.

Approved post-install SQL verifies unchanged educational counts: 81 topics, 313 goals, 375 concepts, 751 flashcards, 1,015 questions, 4,060 options. Existing profiles remain present (3), with no agent edits. No private answer-key values or student identifiers were read. No environment files were read/copied/edited. No project dependencies were added; isolated PostgreSQL tooling (PGlite 0.5.15) is installed only in temporary storage.

## Verification

- **331 unit cases / 37 files pass.**
- **6 rewards Chrome fixture journeys pass**, plus **2 P1/P6 Mathematics journeys**. The focused latest saved-collection rerun also covers evolved buddy display in Lab.
- Production build passes, with existing chart/dashboard chunk warning.
- Changed-file ESLint passes. Full required lint retains three existing Oxlint errors; separate earlier full ESLint had four existing Landing/Timer errors. No unrelated autofixes retained.
- **17 isolated PostgreSQL checks pass**: atomic installation rollback, rerun refusal, account/privilege isolation, durable starter/no welcome pack, invalid/foreign requests, evolution, duplicate XP/overflow, recovery and exact verification SQL.
- Live metadata/count/privilege checks pass, and migration history records installation. No live signed-in user journey or genuine simultaneous multi-connection test was performed. Profile/pack locks and uniqueness constraints were reviewed; fixture tests are not certification of Supabase Auth itself.
- Security advisor still reports existing leaked-password protection warning and RLS/no-policy INFO findings (including deliberate private-table denial). See deployment report links; no automatic unrelated fixes applied.

## Still unfinished

Secure grading, saved quiz attempts, trusted study-block completion, first-attempt/repeat quiz XP, normal high-score/streak pack grants and reward ledgers are not implemented. No substitute earning/free-pack rule was introduced. Global-versus-per-quiz daily attempt limits and exact high-score/streak validation still need agreement. Pack-opening functions only operate on already legitimately awarded packs; signup grants a starter only.

Frontend hosting is not deployed from this session. Real account/email-confirmation, logout/login, cross-device persistence and concurrent real requests require final acceptance testing. The temporary cache of pending pack IDs supports same-tab recovery; server receipts persist actual outcomes and inventory across devices.

## Next priorities

1. Review/push/deploy the prepared app source through the team's authorized workflow. Do not push/main merge without explicit approval.
2. In the running app, manually sign up/confirm email, choose one starter, check Town/Trainer/Lab, reload and log out/in, select an eligible buddy and verify persistence. A second account must see its own collection. Re-enter starter selection to verify no repeat claim.
3. Implement trusted study events/XP ledger and secure grading/persisted attempts before enabling remaining earning rules. Show exact lowercase SQL and obtain approval before every new Supabase SQL/permission/data change.
4. Verify real concurrent requests and recovery using a disposable/staging environment; never run destructive tests against shared content/students.

## Commands

```sh
pnpm test:unit --run
pnpm lint
pnpm build
STUDYDEX_E2E_BROWSER_CHANNEL=chrome pnpm exec playwright test --config playwright.rewards.config.js
STUDYDEX_E2E_BROWSER_CHANNEL=chrome pnpm exec playwright test --config playwright.math.config.js
node docs/rewards/deployment/test-persistence.mjs
```

The SQL harness needs temporary PGlite 0.5.15; `STUDYDEX_PGLITE_MODULE` can point to its module. It only creates a disposable synthetic database, never Supabase. Fixture servers avoid local environment files. Standard commands use the developer's existing configuration. See `docs/team-testing.md`.
