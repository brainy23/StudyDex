# Study Pokémon rewards

The study page now uses `components/pokebuddy/PokedexRewardModal.vue`, a saved-data version of the remaining-XP/gift dialog in `PokeBuddy.vue`. The original sample playground remains separate.

The dialog fetches the signed-in user's saved Pokédex after the XP result closes, and checks for unresolved rewards on page entry. All saved Pokémon whose level/evolution state is not MAX appear as recipients. The dialog checks the saved MAX state, rather than comparing raw XP with 200. Supabase supplies `evolution_stage: "MAX"` and `is_max_evolution` when the final form completes its XP bar, matching PokeSprite. Selection atomically activates the owned record and applies the saved pending XP. When none qualify, a saved recovery Poképack supplies an unowned base species, activates it and applies pending XP. Overflow stays saved when another recipient is needed, the user leaves, or the collection has no new species available. The server checks ownership and eligibility; repeated pack opening reuses the receipt.

## Database update required

Apply `supabase/migrations/20261106140000_study_pokemon_rewards.sql` before testing against live Supabase. It replaces the saved-Pokémon projection, recovery eligibility, pack application, selection, and learning reward functions to use a 200 total-XP cap. Existing XP above 200 moves into the user's pending balance. It also adds authenticated `get_study_pokemon_rewards` and `resolve_study_pokemon_reward` RPCs. Existing per-form evolution thresholds are unchanged.

No live database changes were made by these tests. The user reports that the migration has been applied to Supabase; its deployed state has not been independently inspected.

## Verification

- `node scripts/test-study-pokemon-rewards.mjs`: five isolated PostgreSQL checks pass, including upgrade preservation, overflow, ownership isolation, active selection, exact-cap behavior, recovery eligibility, and duplicate pack retries.
- Focused modal, XP-prompt and authenticated RPC tests: eleven pass.
- `pnpm exec playwright test --config playwright.study-rewards.config.js`: three Chrome journeys pass through the real study page and Supabase client into isolated PostgreSQL running the migrations. Covers XP-prompt handoff, saved non-MAX selection, XP transfer and active-buddy persistence after reload, recovery-pack opening and activation, and failed-transfer retry without duplicate XP. The test fixture blocks live Supabase requests and verifies none occurred. The browser clock is set to learning hours to avoid the app’s nighttime lock.
- Production build and ESLint for changed JavaScript/Vue files pass.
- Broader study-view tests stop at the existing missing `selection-subjects` route in their router fixtures. The broader database harness stops at `pomodoro_blocks_xp_award_check` for the fifth focus block. Those paths are not certified by the focused checks.
