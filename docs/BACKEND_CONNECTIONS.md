# Connected learning backend — 5 November 2026

Implemented on `claude-frontend` and installed in Supabase project
`sbrteylcizwkzetcqdro`. The frontend source uses the same existing project URL and
publishable key; no service-role credential is needed in the browser.

## Implemented behavior

- **Quiz Room:** a server-issued, two-hour attempt contains up to five questions.
  The server retains its answer-key snapshot and grades the submitted option IDs.
  There are three started attempts per topic per Singapore calendar day. Refreshes
  resume an unexpired pending attempt rather than consume another one. Repeating a
  successful submission returns the stored result without duplicate answers/XP.
  Different answers cannot replace an already submitted result. Results, answer
  selections and score-based XP commit together. There are **no quiz pack awards**.
- **Daily progress:** the server computes day boundaries using `Asia/Singapore`.
  The frontend reads today's rewarded focus blocks rather than lifetime counts,
  refreshing on focus and every 30 seconds while the study room remains open.
- **Study History:** Learn completion, flashcard completion, verified focus blocks,
  quiz results and Boss Battle results are stored in Supabase and read by the
  dashboard. Completed focus blocks appear even when their parent study session
  is still open. Session XP and focus-block XP are both included in totals.
- **Focus time:** session/interval IDs are server-owned records. Ten-second
  heartbeats account for active milliseconds with a maximum 30-second lease;
  missing/hidden/offline time cannot instantly complete a block. Pause, resume,
  reset and retry use the same records. The first four verified 25-minute blocks
  each Singapore day may earn 10 XP; later blocks are saved with zero reward.
- **Account isolation:** to-dos use own-user database records, and Pokédex/Town
  buddy selection calls the existing owned-record RPC. Global browser to-do and
  active-Pokémon keys are no longer read. Unattributed legacy browser data is not
  silently imported into whichever account happens to sign in next. Pending
  writes pin the verified user's token; route state and weather are reset when
  the account changes. Optional recovery keys include the account ID.
- **Account deletion:** password confirmation stays in a non-persisted Auth
  client. MFA-enrolled users receive a TOTP or phone-code challenge in that same
  confirmation session. The existing deletion Edge Function still verifies
  recent password proof and AAL2 for MFA users. XP-ledger foreign keys now cascade
  correctly; tasks, topic completions, quiz runs, history and intervals also
  cascade. New account-scoped recovery keys are cleared after deletion.

## Database ownership and security

Student clients cannot INSERT/UPDATE owned Pokémon progression or write result,
interval, history and task tables directly. Reviewed private database functions
perform those operations; public invoker wrappers expose the supported actions.
Read policies limit tasks/history/completions to their owner. Answer keys and
pending grading snapshots are never exposed by a student SELECT policy or sent
with starting quiz questions. Only a submitted quiz returns its answer review.

The previous direct XP endpoint rejects quiz, focus and flashcard claims; these
rewards now require a matching persisted activity. The existing Boss Battle
practice grading is retained and its result is linked to the saved flashcard
session/history. This change does not implement a separate server-graded Boss
encounter engine, admin management APIs or the prototype Rewards page.

## Reproduce a database

The `supabase/migrations` directory includes:

1. Explicit no-op markers matching the 11 historical versions already installed
   on the shared project. Their schema is consolidated in the adoption baseline.
2. `20261105112201_app_schema_baseline.sql`: the existing public/private application
   tables, constraints, indexes, functions, permissions, policies and registration
   trigger. It does not contain accounts or activity records.
3. `20261105112227_connected_learning_and_account_data.sql`: the connected APIs,
   history/task policies, progression write restrictions and deletion cascades.

The two new versions are installed in the shared project. **Do not manually rerun
the feature migration there.** Use later migrations for subsequent changes.

On a fresh local Supabase stack, using a Docker installation supported by the
Supabase CLI:

```sh
pnpm install --frozen-lockfile
pnpm dlx supabase start
pnpm dlx supabase db reset
```

Supabase supplies the Auth schema, API roles and Auth functions. The application
baseline does not replace Supabase's own internal schemas. `supabase/seed.sql`
restores the curriculum/species catalogue only: no student profiles, emails,
passwords, sessions, packs or activity are exported. It contains server-side quiz
answer keys and must never be imported into frontend JavaScript or copied to
`public/`/`dist/`. Vite explicitly denies HTTP access to `supabase/` and `database/`.
Production hosting must serve the built `dist/` directory.

For another hosted project, link the CLI to that project and push the migrations,
then seed its curriculum server-side if required. A source checkout no longer
depends on undocumented manual schema setup. Existing remote migration versions
are represented locally so future migration pushes do not need history repair.

For the local deletion function, the existing `supabase/functions/delete-account`
source is unchanged; serve/deploy that function using the Supabase CLI. Its server
credentials are supplied by Supabase, never by Vite environment variables. The
shared project's existing active function already supports the new MFA-confirmed
token, so no Edge Function redeployment was necessary for this update.

## Verification

```sh
pnpm run test:database
pnpm test:unit --run src/services src/components/common/__tests__/DeleteAccountPanel.spec.js src/composables/__tests__/useTopicCompletion.spec.js
pnpm exec playwright test --config playwright.learning.config.js
pnpm exec vite build --config vite.onboarding.fixture.config.js --configLoader runner --outDir /private/tmp/studydex-connected-build
```

- 13 isolated PostgreSQL integration checks passed, including all curriculum
  seeding, grading, duplicate submissions, three-attempt limits, elapsed-time
  enforcement, daily reset, fifth-block zero XP, ownership and deletion cascades.
- 137 focused unit tests passed, including token pinning/account switches and MFA
  challenge acceptance, refusal and cancellation.
- Six browser checks passed, including real supabase-js HTTP requests routed into the
  isolated PostgreSQL schema: quiz/history, Learn completion/history, verified
  focus/daily progress/history, a failed submission followed by a safe retry,
  to-do persistence across reloads and HTTP denial of server-only SQL files.
- A live Supabase smoke check passed using two synthetic records in one rolled-back
  SQL transaction. No Auth API signup/email or real account deletion was invoked.
  The repeatable SQL is `database/verify-connected-learning.sql`.
- Live metadata confirmed six own-history/task policies, no anonymous execution
  of the six new APIs, no student read access to answer keys, no direct Pokémon
  progression writes, and both XP-ledger cascading foreign keys.
- Production build, scoped ESLint and `git diff --check` passed. The seven unused
  declarations in `SurpriseBossView.vue` also exist at HEAD and remain unchanged;
  that file is excluded from the clean scoped lint result. Existing large
  chunks/duplicate quiz import build warnings remain. Full legacy frontend tests
  with obsolete preview/local-storage assertions were not used as acceptance
  tests for the new server-backed behavior.

The existing Supabase advisor notices for intentionally inaccessible private
tables/answer keys remain expected. The legacy Boss reward compatibility wrapper
remains an intentional authenticated definer entry point. The separately existing
Auth leaked-password protection setting is unchanged.

Existing user changes in `index.html`, `src/main.js` and the stylesheet files
are preserved alongside the backend integration.
