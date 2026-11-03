# Rewards integration — 4 November 2026

## Git result

- Target: `integration/user-registration`, originally `b6dc9aa`.
- Backup: `backup/integration-before-rewards-2026-11-04` → `b6dc9aa`.
- Incoming tested branch: `fix/josh-rewards-inventory` at `65e96d5`, including the earlier `bc8d7ba` frontend checkpoint.
- Local `--no-ff` merge applied cleanly; **no merge conflicts**. This report and the current handoff are included in its merge commit.
- Josh's rewards/starter components were selectively ported into the integration architecture. Registration/auth, Mathematics/Science selection, shared timer, optional practice and public-field ungraded Arena behavior are preserved.
- No push, main merge, history rewrite, reset or database action. Original local untracked audit/instruction/review files remain preserved and uncommitted.

## Functional changes

| Area | Files and behavior |
| --- | --- |
| Progression | `src/data/pokemonProgression.js`: three-stage evolution at 75/175 cumulative XP, two-stage evolution at 125 XP, 250 XP fully trained for every line. Activity XP amounts remain unchanged. |
| Buddy preview | `src/components/pokebuddy/{PokemonBuddy,PokeBuddy}.vue`: actual local preview uses the shared progression, preserves XP through evolution and overflow at cap. Recovery gift handles an exact cap without needing excess XP and selects the new eligible buddy. Existing backwards preview behavior remains. |
| Consistent cap | `src/views/HomeView2.vue`, `src/components/common/QuestPhone.vue`: shared 250-XP cap replaces competing prototype limits. |
| Inventory/badges | `src/services/rewardsService.js`, `src/composables/useRewardInventory.js`, Town and BubbleNav: shared verified earned/unopened count; Rewards navigation; unknown state on backend failure; account isolation; focus/poll refresh. |
| Safe opening/recovery | `src/views/rewardsView2.vue`, `src/utils/pendingReward.js`: specific pack retry, account-specific session cache of pack ID only, same-tab reload recovery, acknowledgement, keyboard/focus, cancellation, reduced motion, isolated audio and artwork/async failure handling. Cached IDs never authorize rewards; the server must enforce ownership/idempotency. |
| Starter flow | `src/views/starterSelectionView.vue`, Register and router: authenticated starter selection and confirmation; existing-claim check; disabled double submission; unavailable backend offers Continue studying. |
| Evidence/docs | `docs/rewards/`: approved read-only evidence, updated 250-XP capacity model and earning-rule decisions. `docs/HANDOFF.md` describes current state and next backend tasks. |

No visual redesign or dependency additions.

## Validation

- **317 unit cases / 35 files pass.** New checks cover exact evolution/cap boundaries, cumulative XP, overflow, backwards preview transitions, lookup failures, same-account responses, pending recovery and exact-cap local recovery gifts.
- **5 Chrome rewards fixture journeys pass**: mobile badge/opening/recount; starter flow; uncertain opening recovered after reload without a second simulated consumption; unavailable starter fallback; cumulative progression/evolution/cap/overflow.
- **2 existing Chrome Mathematics journeys pass**, P1 mobile/P6 desktop: Learn, flashcards, timer continuity and ungraded quiz previews.
- Production build passes. Existing large dashboard/chart chunk warning remains.
- Changed-file ESLint passes. Required `pnpm lint` still exits 1 on three existing Oxlint errors in Timer and account/registration tests; separate full no-fix ESLint reports four existing Landing/Timer errors. No unrelated autofixes retained.
- Verification disabled local environment-file loading and used OS temporary output/cache directories. All browser Supabase responses were intercepted with synthetic fixtures. No live student/grading/reward mutation or authenticated RLS test was performed.
- Application source/assets in the merge were compared against the tested feature tip; only merge/handoff documentation changes were added at integration time.

## Still unfinished / not deployed

**This is a source integration, not a live reward-system deployment.** Supabase still needs an approved Pokémon catalogue, own-inventory access, one-time starter claims, atomic/idempotent opening, persisted evolution/XP and result history. The four proposed RPCs do not yet exist. Prototype Town/Trainer/buddy collections remain local sample data.

Trusted study completion, secure grading, saved attempts, reward ledger, daily caps and earning triggers are separate backend work. Per-quiz first-ever bonuses and the halved framework are approved; global-versus-per-quiz daily attempt limits and exact high-score/streak validation remain open. No private answer keys may be exposed to implement those features.

The finite demo needs no additional progression after its collection is fully trained. The proposed three-Pokémon target is 750 cumulative XP; the illustrative content model estimates 5–8 days under its listed daily-cap/80%-accuracy assumptions. It is not evidence of deployed rewards.

Database SQL, catalogue imports, RLS/grants or backend deployment require exact lowercase SQL review and explicit user approval. No database operation was performed during this merge task. The existing inventory SQL proposal remains unapproved and unexecuted.
