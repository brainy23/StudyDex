# StudyDex handoff — level-based content enabled

## Current follow-up: self-service account deletion backend deployed

The user requested deleting the current student's own account from Account Settings.
Frontend implementation is local and tested; the user explicitly approved and the
backend is now deployed ACTIVE/version 1 with JWT verification enabled.
Read `docs/account-deletion/DEPLOYMENT_REPORT.md` first. Detailed approvals, raw
preflight snapshots and the disposable SQL harness are local audit evidence kept
outside this feature commit; restore them from the account-deletion audit stash
when needed.
The exact backend deployment bundle is
`f141f0aa0baca605771dc694673a9b1165d579bace1d98af69c18bba4ca1d7ba`.
No table/RLS/grant/content changes were needed. Approved read-only preflights ran
before/after deployment; all 19 application/content fingerprints and schema/RLS/
migration metadata match. Unauthenticated GET returns 401 and OPTIONS 204.
No account was created/deleted/modified for testing; authenticated deletion was
never invoked. The concise report is committed; raw evidence stays in the local
account-deletion audit stash.
The user authorized committing the feature with message `added account deletion`
and pushing `new-integration-backend`. No frontend hosting deployment is included.

New service/dialog plus Account Settings wiring require password and typed DELETE.
The server independently validates own identity, recent password AMR/MFA, revokes
refresh sessions and invokes Auth hard deletion with existing cascades. No client
target ID, server secret or grading key is exposed. Browser cleanup is own-account
scoped. The unrelated pre-existing blank line in `accountService.js` is preserved
in the local audit stash rather than included in the feature commit.

69 focused unit tests, three synthetic Chrome journeys and three isolated cascade
checks pass. Full suite: 275 pass/56 old failures. Build/scoped ESLint pass; global
lint still has two existing failures. Live end-to-end Auth deletion, PG17 races and
MFA UI remain unverified. Do not delete an actual student to demonstrate the feature.

The user explicitly revoked the earlier AGENTS.md instructions in chat. Continue
to respect the separate exact-SQL approval rule, server secret protection and paused
grading/import work. The prior merged-content handoff follows below.

Updated 4 November 2026, Asia/Singapore. Branch `new-integration-backend`.
Onboarding commit `1959b61` and earlier merge `ac757aa` are preserved. Content is
saved in `bd259d2`. The user authorized merging fetched `origin/designed-poke-arena`
at `22f34ad` and pushing this branch. The merge retains ten-style avatars and adds
Trainer's saved active buddy. See `docs/MERGE_2026-11-04.md` for conflict resolution,
checks and backup. No hosting deployment, dependencies or database changes included.

Read `docs/quiz/CONTENT_ENABLEMENT.md` for the file table, evidence and limits.
The earlier `docs/HANDOFF.md` and onboarding deployment evidence remain in the user's
named stash; it was read for context but has not been applied, popped or changed.
Do not overwrite or discard that stash or assume its old lockfile should replace
the merged lockfile. Only one agent edits at a time.

## What the app does now

- Signup/confirmation → Landing → ten-style saved avatar → one-time saved starter
  → Town tutorial. Completed accounts show only Start; incomplete setup resumes.
- Accepted Town reads saved collection/buddy; Learn, Flashcards and Arena use the
  saved buddy. Dashboard reads existing database history and calculates display stats.
- This phase enables Mathematics in Lab and Arena at the saved P1–P6 level; Science
  starts at P3. Only subjects/topics belonging to that level are offered.
- Lab has Learn and Flashcards; invalid topic/subject direct links cannot load
  another level's learning resources. Examples/graphs preserve line breaks/spaces.
- Arena uses existing Supabase question text/options and database topic UUIDs,
  neutral selections, and up to five usable questions without duplication. It is
  explicitly an ungraded preview; there is no local score or saved result.

## Changed files

`src/utils/studyCatalogue.js`, `src/services/studyService.js` and the new
`quizPreviewService.js` own level filtering and public preview reads. Views changed:
`SubjectsView.vue`, `TopicsView.vue`, `StudyModeView.vue`, `LearnView.vue`,
`studyView.vue`, `quizView.vue`. Learn's decorative buddy request no longer blocks
lessons. New unit tests are beside utility/service/view code; browser coverage is
`e2e/content.spec.js` with `playwright.content.config.js`. Documentation and approved
read-only metadata evidence are under `docs/quiz/`.

## Database status and paused work

User approved only `docs/quiz/01_read_only_preflight.sql` SHA-256
`a543e481225aa6907d13fc4af684cd1af014d2b8ee15d222b423bbefb3b358b7`
and scoped project/migration reads. Executed read-only against
`sbrteylcizwkzetcqdro` PG17.11. Existing Maths regular-question counts P1–P6 are
80/100/110/110/120/110; Science P3–P6 36/56/66/58. No import or database/permission
change. No student IDs, keys or answer-key rows returned.

The user explicitly paused secure grading/saved attempts and clarified that content
should be enabled in both Lab and Arena first. Do not silently continue grading,
session schema, RLS, XP or rewards work. Daily attempt limits remain undecided.
No install SQL was generated. Later SQL, including further reads, needs exact approval.

## Verification and known limits

114 focused unit tests pass (including content, avatar and onboarding regressions);
nine Chrome journeys pass with synthetic Auth/content and no live Supabase requests
or writes, including the merged Trainer's buddy and ten styles. Build passes.
Changed-file ESLint and diff whitespace check pass. Full unit suite: 240 pass,
56 existing failures across four old Study/Arena/router test files; no new failing
test names versus the saved baseline. `pnpm lint` stops at two existing errors in
Timer.vue and accountService.spec.js. Unrelated lint autofixes were not retained.

Real signed-in production content reads, full phone/manual visual acceptance,
cross-device and concurrent-account flows remain unverified. Preflight metadata and
mock tests are not proof of end-to-end live permission behavior. Existing Town buddy
selection still changes page memory only; Trainer now loads the saved active buddy.
Rewards still uses five sample packs and unsaved collection/duplicate XP. Dashboard
can read history but current previews and local timers do not create that history.

## Decisions not to undo

Preserve accepted layouts/artwork, server-derived onboarding, request-token binding,
legacy avatar read compatibility and one-time starter preservation. Never fetch
`question_answers` or privileged keys in the browser. Keep saved-level filtering,
stable option UUID/order and clear ungraded labels. No invented fallback Science
topics or misleading Foundation selector for a bank without track metadata. No imports.

## Next tasks, in order

1. User tests current level-specific Lab/Arena with real accounts, reload and direct links.
2. Persist Town buddy switching and verify cross-screen consistency; preserve UI.
3. Connect rewards inventory/pack opening to existing approved RPCs when explicitly resumed.
4. Resume secure grading/saved attempts only at the user's request; clarify daily limits,
   prepare exact SQL and isolated rollback/idempotency/isolation tests before approval.
5. Repair existing test/lint debt against accepted UI, then evaluate demo deployment.

Commands/evidence: `docs/quiz/CONTENT_ENABLEMENT.md`. Browser:
`pnpm exec playwright test --config playwright.content.config.js`. Unit/build runs
used temporary env-free configs; do not read local environment files. The user
authorized the content commit, Trainer merge and branch push. The stash remains
untouched. Only `new-integration-backend` may be pushed; do not merge into main.
