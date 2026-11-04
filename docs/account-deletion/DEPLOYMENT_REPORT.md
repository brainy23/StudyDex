# Account deletion backend deployed

The user explicitly approved the exact deployment bundle and verification in chat.
Installed **5 November 2026, approximately 00:19 SGT**, project
**sbrteylcizwkzetcqdro**. Function: **delete-account**, **ACTIVE**, **version 1**,
**verify_jwt: true**. No database migration was needed or executed.

Approved deployment bundle SHA-256:
`f141f0aa0baca605771dc694673a9b1165d579bace1d98af69c18bba4ca1d7ba`.
Deployed source for both `index.js` and `handler.js` matches the approved content
byte-for-byte. Supabase's compiled artifact hash is
`24feb281bbd7e0461803285ce0fb74ef705c3ce2a211542b97a46d19732def63`;
this is a different artifact from the approved JSON bundle, not a mismatch.

## Live checks

- The approved read-only preflight was repeated immediately before/after installation.
  **All 19 application/content fingerprint scopes match**, including profiles,
  Pokémon, packs, study/quiz history, private reward records and answer keys.
- All captured relations, foreign keys, columns, triggers, database functions and
  RLS policies match. Migration metadata is unchanged.
- Preserved counts include profiles **5**, owned Pokémon **2**, private reward
  accounts **2**, packs **0**, questions **1,015**, flashcards **751**. Storage
  remains **0 buckets / 0 objects**. No concurrent fingerprint change was observed.
- Unauthenticated GET returns **401** / missing authorization. Unauthenticated
  browser OPTIONS returns **204** with the expected CORS headers and `no-store`.
- **No authenticated deletion was invoked. No real account was created, deleted or
  modified for verification.** No table/grant/RLS/content change, Git commit/push or
  frontend hosting deployment occurred in this phase.

Local audit evidence: `deployment_20261105.json`, `deployed_source_20261105.json`,
`before_deployment_20261105.json`, `after_deployment_20261105.json`,
`verification_20261105.json`, plus the original approved preflight evidence.
These contain metadata/aggregate digests and the approved code, not student records,
passwords, secret values or private answer keys. The bulky raw evidence, approval
record and disposable SQL harness are preserved locally in the account-deletion
audit stash; they are not required to run the feature and are excluded from this commit.

## Local verification

69 focused unit tests, three isolated PostgreSQL cascade checks and three synthetic
Chrome journeys pass. Production build and scoped ESLint pass. Full suite remains
275 passed / 56 existing failures / 331 tests; global lint has the same two existing
errors. No project dependencies added.

To run the committed deletion regression checks:

```sh
pnpm test:unit --run src/services/__tests__/accountDeletionService.spec.js src/services/__tests__/deleteAccountHandler.spec.js src/components/common/__tests__/DeleteAccountPanel.spec.js src/views/__tests__/AccountView.spec.js src/views/__tests__/AvatarSync.spec.js
pnpm exec playwright test --config playwright.deletion.config.js
pnpm build
```

The agent's unit/build evidence used temporary configurations with `envDir: false`
and output outside the repository; the standard commands above are for teammates.
The browser configuration is synthetic and blocks live Supabase requests.

## Ready for user testing; limits

The user authorized including the frontend, backend source and tests in commit
`added account deletion` on `new-integration-backend` and pushing that branch. This
does not deploy the frontend to hosting. Account Settings now offers **Delete my
account**, requiring password and typed DELETE. Using it against
the live project is a real permanent deletion, not a dry run.

Authenticated end-to-end deletion and password confirmation through production Auth
remain unverified because the agent did not delete any real account. A separate
explicit approval identifying a disposable account is required for an agent-run live
deletion test. Current isolated PostgreSQL uses 18.6, production is 17.11; exact-version
concurrency, real session revocation, phone acceptance and future Storage-owned files
remain unverified. MFA-enrolled accounts need AAL2; the current dialog has no MFA
challenge flow. Provider audit logs/backups follow Supabase retention.

The pre-existing trailing blank line in `accountService.js` is preserved locally
with the raw audit evidence and excluded from the commit. The user's earlier stash
remains untouched. Grading, saved attempts, rewards work and
imports remain paused.
