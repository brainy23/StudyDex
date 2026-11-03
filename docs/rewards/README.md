# StudyDex rewards — current status, 4 November 2026

The Pokémon persistence backend is deployed to Supabase as `20261103212559_studydex_pokemon_persistence_v1`, after explicit approval of exact SQL hashes. Read [deployment report](deployment/DEPLOYMENT_REPORT.md), [execution record](deployment/execution_20261104.json) and [live verification](deployment/live_verification_20261104.json).

Users can choose one signup starter and save an authenticated collection/selected buddy. Town, Trainer and Lab source now read that saved collection, including its current evolution. Existing table columns were retained; nine catalogue entries and two private support tables were added. Six authenticated functions enforce starter claims, collection reads/selection and atomic/idempotent opening of legitimately awarded packs. No welcome pack is granted. No starter was selected for a real user by the agent.

Approved cumulative progression: three stages evolve at 75/175 XP, two stages at 125 XP, all fully trained at 250 XP. XP is not reset after evolution. Duplicate packs credit the selected buddy and retain overflow. See [rules](REWARD_RULES_PROPOSAL.md).

Existing educational data remains unchanged: 81 topics, 313 goals, 375 concepts, 751 flashcards, 1,015 questions and 4,060 options. Browser inventory writes and public-table truncate privileges were removed. No frontend secrets or private answer keys were introduced.

The app code is prepared locally; Git push/hosting deployment and a real signed-in user acceptance test remain. Quiz/streak pack earning, secure grading, first-attempt quiz XP and trusted study-block validation are not yet implemented. The backend does not replace them with free packs. Older `01/02` preflight files and `03_inventory_access_proposal.sql` are historical artifacts; do not apply that earlier partial proposal over the deployed installation.

Validation: 331 unit cases/37 files, six Chrome rewards fixtures, two Mathematics fixtures, production build and 17 isolated PostgreSQL cases pass. Live metadata/count/privilege verification passes. Full lint retains the known pre-existing errors. Project dependencies and environment files were not changed.
