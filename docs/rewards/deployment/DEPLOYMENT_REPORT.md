# Pokémon persistence — deployed backend, 4 November 2026

## Result

The user approved the exact installation and verification SQL. Supabase migration **`20261103212559_studydex_pokemon_persistence_v1`** was applied successfully to project `sbrteylcizwkzetcqdro`. All approved read-only verification assertions pass. See [execution record](execution_20261104.json) and [live verification](live_verification_20261104.json).

The app code now supports: signup/login starter selection → saved collection → selected buddy shared by Town, Trainer and Lab → reload/logout/login persistence through Supabase. The `/pokebuddy` legacy path redirects to the real authenticated Trainer page. No starter or welcome pack was granted by the agent. A student chooses their own starter when using the app.

## Database changes

Existing table columns were retained. `public.pokemon` received nine catalogue entries, with the three starter evolution chains. `public.user_pokemon` stores the acquired base and cumulative XP; the server derives its current appearance at 75/175 XP and full training at 250 XP. This preserves unique ownership through evolution.

Two private RLS-protected tables were added:

- `private.studydex_reward_accounts`: one-time starter marker, pending XP and recovery reference.
- `private.studydex_pack_receipts`: one saved result per opened pack, ensuring retries return the same outcome.

Six authenticated public API functions are installed: `get_starter_status`, `claim_starter`, `get_user_pokemon`, `select_user_pokemon`, `get_reward_inventory`, `open_reward_pack`. They invoke checked private implementations; user identity comes from the authenticated request, never a supplied user ID or editable user metadata. Mutation functions serialize per student; pack opening additionally locks the specific owned pack.

Browser inventory writes were revoked. Own-row reads remain protected by RLS. Anonymous users cannot execute the new functions. Private internal helpers are not executable by browser roles. Existing whole-table `truncate` privileges were removed across public tables. Public entry points are invokers; private authoring functions have explicit ownership checks and empty search paths. No frontend secret/service-role key was introduced.

## Preserved data

Live verification after installation:

| Educational table | Count |
| --- | ---: |
| Topics | 81 |
| Learning goals | 313 |
| Concepts | 375 |
| Flashcards | 751 |
| Questions | 1,015 |
| Options | 4,060 |

These match the approved capacity evidence. Existing profiles remain present (3). Ownership, packs, claim accounts and receipts are all zero immediately after installation: the migration did not assign rewards to existing students. Verification found zero cross-user recipient/receipt/claim mismatches, zero multiple selected buddies, and zero remaining API-role truncate privileges.

No educational row or existing profile was updated/deleted. No private answer-key values or student identifiers were read. Installation SQL is preserved unchanged at SHA-256 `20c25218d69e4c01769802c628724fcd7fc7412fb5dfd48d23da4705a2c0f19d`; verification SQL is `aee088a7d13b05d17b9f3670ff9586137395896edfeab8cbab3f15993d4deb32`. Do not rerun installation: it deliberately refuses the non-empty/already-installed baseline.

## App files

- `src/services/pokemonService.js`: authenticated collection GET and owned-record selection; validates ownership/account continuity and server responses.
- `src/composables/usePokemonCollection.js`: shared saved collection/active buddy, refresh and account isolation; failed selection preserves the prior buddy.
- `HomeView2.vue`, `TrainerView.vue`, `QuestPhone.vue`: removed sample collections from deployed flows; saved selection, loading/error/empty/starter states and pending XP.
- `LoginView.vue`, router: unclaimed users are directed to starter selection; legacy sample buddy page redirects to authenticated Trainer.
- `studyService.js`, `studyView.vue`: Lab uses the same saved current form, numeric ID and evolution stage.
- `rewardsService.js`, `rewardsView2.vue`: acquisitions refresh the saved collection; capped-buddy pending XP is explained.

No new project dependencies. Temporary PostgreSQL test tooling is PGlite 0.5.15, installed outside the repository only.

## Verification and limits

- **331 unit tests / 37 files pass.**
- **6 Chrome rewards fixtures pass**, including signup starter and server-backed fixture state across Town/Trainer/reload/selection; the focused final rerun also verifies the saved evolved buddy in Lab.
- **2 P1/P6 Mathematics Chrome fixtures pass.**
- Production build passes; existing dashboard/chart chunk warning remains.
- Changed-file ESLint passes. Full required lint retains the same three pre-existing Oxlint errors; no unrelated autofixes were retained.
- **17 isolated embedded-PostgreSQL checks pass** against synthetic tables/roles, including rollback, rerun refusal, durable starter, no welcome pack, account isolation, API privilege denial, cumulative evolution, pack retries, duplicate XP/pending transfer, recovery and the exact verification query.
- Live verification confirms installed schema, catalogue, privileges and counts. **No actual signed-in production browser claim has been performed**, and simultaneous separate live database connections have not been exercised. The agent did not create test students or claim a real user's starter. Public catalogue sprite URL was checked and returns HTTP 200 / image/png.

Security advisors retain the existing [leaked-password-protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Seven [RLS-with-no-policy INFO findings](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) include deliberately inaccessible private support tables and existing protected grading/timer tables. No automatic advisor fixes were applied.

## Remaining before app launch

The backend is deployed. App source changes are local and need the team's normal Git push/hosting deployment with the existing Supabase project configuration. No push or hosting deployment was authorized/performed in this task.

Manual acceptance: use a new/eligible account, confirm email as required, choose one starter, check Town and Trainer, refresh, log out/in, and confirm selection persists. Another account must see its own collection. Revisit `/starter` and confirm no second starter can be claimed. These actions naturally create the student's chosen owned record; no SQL should be used to fabricate student rewards.

Normal quiz/streak pack earning, first-attempt quiz XP and trusted study-block XP are **still not implemented**. Secure grading/completion validation and reward ledgers remain separate work. Pack opening is installed for legitimately awarded packs; no welcome packs or substitute earning rule was added. The existing exact-cap recovery rule is implemented server-side while an unowned catalogue base remains.
