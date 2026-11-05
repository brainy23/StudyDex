# Activity XP and Pokémon progression

The old `award_studydex_xp` function only updated XP. It clamped negative XP
before a Pokémon could devolve, never updated the species or level, and always
returned `reachedMaxEvolution: false`. The activity popup never invoked an
evolution animation. The boss arena also retained its initial fighter snapshot.

## Current flow

Boss wins award +50 XP and boss losses deduct 50 XP. These amounts are configured
in `src/services/experienceService.js`; the evolution threshold remains 200 XP.

1. `useExperiencePrompt` queues rewards and keeps their activity UUID stable.
2. `experienceService` checks for an already saved event, reads the current owned
   Pokémon and calculates the activity delta in JavaScript.
3. `pokemonProgression.planPokemonXp` calculates the proposed final state. The
   same planner backs `PokeSprite.planXpChange`, `addXP` and `subtractXP`, so Trainer
   previews and real rewards use the same rules.
4. `save_studydex_progression` stores the supplied final species, level, XP and
   defeat state together with the activity event. It checks ownership and the
   expected old state to prevent stale writes and duplicate awards. It resolves
   the catalogue's UUID by name; PokéAPI numeric IDs never replace catalogue UUIDs.
5. `xpPrompt` displays a front-facing `PokeSprite` and calls `playEvolution` after
   a successful save. Continue/close wait for the animation. An evolved/devolved
   note remains after the reveal. Failed animations show the saved final sprite
   and a message without repeating the award.
6. The study and boss views refresh the saved buddy. The boss also rebuilds its
   fighter display; returning to study therefore uses the new species.

At 200 XP, a supported next species gains a level and receives the remaining XP:
Charmander at 190 + 30 becomes Charmeleon at level 2 with 20 XP. Charmeleon at
5 − 10 becomes Charmander with 195 XP and one fewer level. Deductions clamp at
zero only when no supported previous species exists. The existing Gen 1 evolution
pool, random branching and final-form overflow behavior are retained.

## Database setup

Apply `database/pokemon-progression.sql` in the Supabase SQL Editor for this app.
It requires the XP-event table from `database/activity-xp.sql`; do not rerun that
older file on an already configured database. The new SQL can be reapplied.
Deploy the SQL together with the frontend change: the frontend now calls
`save_studydex_progression`, and the SQL retires the old XP-only RPC permission.

No database deployment or live database writes were performed from this workspace.
The SQL does not calculate rewards, consult PokéAPI, traverse evolution chains,
or choose animations. Those rules run in the Vue app as requested. This means
reward amounts and evolution choices are client-authoritative.

The target species must exist in the `pokemon` catalogue. The existing unique
constraint on `(user_id, pokemon_id)` also remains in force: evolving into a
species already owned by that user produces a save error and rolls back the
whole event; it does not merge or delete another owned Pokémon.

The quiz view grades with `prepare_learning_quiz_progression`, calculates its
evolution using `planPokemonXp` in Vue, and commits the final `user_pokemon` state
with `submit_learning_quiz_progression`. It then plays the saved evolution plan
in the shared XP prompt without making another award call.
See `docs/quiz-xp-rewards.md` for its 5–50 XP score scale and retry behavior. Gift
creation remains TrainerView's existing preview feature; activity popups do not
offer a gift button without a configured gift handler.

All active Vue consumers now import `PokeSprite`. The unused legacy component
files are retained for compatibility with older branches.

## Verification

72 focused tests passed across frontend progression, persistence requests,
front-facing popup animations, the Trainer public XP methods, saved-avatar/buddy
integration, school-level content and study service queries. The production
build also passed. The complete unit suite had 309 passing tests and 56 failing
tests; a temporary copy with the pre-change XP flow had those same 56 failures
plus the outdated Trainer component assertion, with no newly failing cases.
Live Supabase deployment and end-to-end database behavior remain unverified.
