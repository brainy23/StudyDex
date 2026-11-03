# Pokémon persistence deployment approval

Prepared 4 November 2026 (Asia/Singapore), project `sbrteylcizwkzetcqdro` (Studydex Database). **Approved and applied:** migration `20261103212559_studydex_pokemon_persistence_v1`. See `DEPLOYMENT_REPORT.md` and the execution/verification JSON. The sections below preserve the reviewed proposal. This proposal enables one signup starter, saved user collections, selected buddy and atomic opening of legitimately awarded packs. The user explicitly declined welcome packs.

## Exact proposed SQL

1. [Installation](01_pokemon_persistence.proposed.sql), SHA-256 `20c25218d69e4c01769802c628724fcd7fc7412fb5dfd48d23da4705a2c0f19d`.
2. [Read-only verification](02_verify_pokemon_persistence.sql), SHA-256 `aee088a7d13b05d17b9f3670ff9586137395896edfeab8cbab3f15993d4deb32`.

Both files are entirely lowercase. Approval applies to these exact bytes. Installation is proposed through the Supabase migration tool, followed by the exact verification SQL and metadata/security-advisor reads. No app push or hosting deployment is included.

## Tables and permissions

**No columns in existing tables need to change.**

| Table | Proposed change |
| --- | --- |
| `public.pokemon` | Insert nine catalogue rows: Bulbasaur/Ivysaur/Venusaur, Charmander/Charmeleon/Charizard and Squirtle/Wartortle/Blastoise. IDs are explicitly assigned seed IDs. |
| `public.user_pokemon` | Keep existing schema and unique ownership/selection constraints. `pokemon_id` retains the originally acquired base; current form is derived from saved cumulative XP. Browser writes are revoked. |
| `public.user_packs` | Keep existing schema. Add own-row SELECT policy. Browser writes are revoked. Packs/results are authored only by checked server functions. |
| `private.studydex_reward_accounts` | New private table: durable starter claim, pending XP and one outstanding recovery-pack reference. Owns no educational content. |
| `private.studydex_pack_receipts` | New private table: immutable saved result per opened pack so retries return the same reward and never award twice. |
| All public tables | Revoke `truncate` from `public`, `anon` and `authenticated`, removing the existing whole-table destruction privilege. Normal SELECT/profile/content functionality is retained. |

Private tables have RLS enabled and no client table privileges. Authenticated users receive schema usage and EXECUTE only on six private implementations reached by the corresponding public invoker wrappers. Internal helpers remain inaccessible to browser roles; the existing registration helper is unchanged. Each implementation derives identity from `auth.uid()` and checks the student's profile. No user metadata is used for authorization. All functions pin an empty search path. No service-role key is added to browser code.

Public endpoints: `get_starter_status`, `claim_starter`, `get_user_pokemon`, `select_user_pokemon`, `get_reward_inventory`, `open_reward_pack`.

Installation refuses if the reviewed empty catalogue/ownership/packs baseline changed, or the new support tables already exist. It uses a transaction and table/advisory locks; any failure rolls back the whole installation. No existing student/profile or educational rows are updated or deleted. Starter/selection/opening calls later serialize per student using a profile row lock; pack opening also locks the specific owned pack. Starter claims and receipts have durable uniqueness constraints.

Duplicate packs credit 25 XP to the selected owned buddy, up to the approved 250-XP cap. Excess is saved privately and applied when the student selects an eligible buddy. Exact-cap recovery produces one outstanding pack while an unowned base remains; that pack excludes owned bases. The finite demo does not add a new progression path when the collection is complete.

## Application work prepared

- Town and Trainer use `pokemonService` / `usePokemonCollection` instead of sample records.
- Selected buddy is saved on the server; failures retain the prior selection. Account changes clear old collection data.
- Registration selects the starter; login routes unclaimed students to starter selection; collections expose the starter action for an existing account.
- `/pokebuddy` redirects to the authenticated Trainer page, removing the reachable sample-user collection/client XP buttons from the deployed flow. The standalone prototype remains only as unreferenced development/test source.
- Poké Lab gets the saved buddy's current evolution from the same authenticated read RPC. Stable collection reads use GET; no answer keys are requested.
- Starter claims/opening refresh the collection. Pending XP is shown when a buddy caps.

## Verification performed

- **17 isolated embedded-PostgreSQL checks pass** using temporary PGlite 0.5.15 and synthetic data. Covers installation rollback, rerun refusal, preserved educational/profile fixtures, starter idempotency/no welcome pack, invalid starter rejection, anonymous/private-helper denial, direct inventory-write denial, own-row reads, foreign selection/pack denial, cumulative evolution, receipt retries, selected-buddy duplicate XP/overflow and exact-cap recovery. The exact post-install verification SQL also ran successfully there.
- **330 unit cases across 37 files pass.**
- **6 Chrome fixture journeys pass**, including starter → Town → reload → saved selection → Trainer, existing rewards and legacy route safety.
- Production build passes. Required lint retains the same three pre-existing errors; changed-file ESLint passes. No new project dependencies; PostgreSQL test tooling was installed only in temporary storage.
- Reused the unchanged, previously approved read-only preflight (`b6fd0737...`) to confirm current schema/RLS/defaults/constraints and the zero catalogue/ownership/packs baseline. Metadata project identity and migration history were inspected through the Supabase plugin. Fresh preflight is saved here. Private schema has no existing tables.

**Not yet verified:** a real authenticated browser account on deployed Supabase; simultaneous separate database connections; actual email confirmation in production; user collection behavior across devices. Embedded PostgreSQL roles reproduce ownership rules but are not a test of Supabase Auth itself. No real student or private answer-key values were read.

## Scope still remaining

This does not implement secure grading, first-attempt quiz XP, study-block validation, five-day streaks or high-score pack grants. No free packs are created at signup. Those earning triggers need their own trusted completion logic and separate approval; existing rules have not been replaced with demo grants.

After approval: apply this migration, run exact read-only verification, inspect migration/security metadata, then report which deployment checks passed. A successful installation must preserve educational counts and show no browser inventory-write/whole-table truncate privileges. No learner records will be deleted to roll back a successful deployment; any later repair will require a new review/approval.
