# Home-Screen integration

Merged branch: `origin/Home-Screen` (`6a02f8b`) into
`integration/user-registration` (starting at `bc7ef4a`).

## What changed in the app

- `/home` now uses the incoming `HomeView2.vue`: town/weather artwork, the
  location-choice prompt, buddy dialogue and umbrella interactions, and the
  updated local to-do interface are retained.
- Trainer name and avatar come from the existing authenticated profile service.
  Male/female use the incoming portrait images; Prefer not to say still uses the
  existing Ditto option. The sample Jake profile was removed from trainer identity.
- There is one **Edit Profile** action pointing to `/account`. Logout uses the
  existing service, shows pending state, prevents duplicate requests, handles
  errors/retry and returns to Login.
- **My Progress** opens `/dashboard`. The dashboard greeting loads the real
  profile name, while its existing sample metrics are explicitly marked as a preview.
- Poké Lab still opens `/study-decks`; Poké Arena still opens `/quiz`; Trainer
  House now opens `/trainer`. All existing public/auth/account/learning routes
  are retained. `/trainer` and `/dashboard` require login too.
- The Trainer House dashboard and pack hotspots open `/dashboard` and `/rewards`.
  Its study shortcut returns to town to enter through Poké Lab, preserving the
  existing navigation requirement.
- Trainer House and Dashboard load on demand so their view/chart bundles are
  separate from initial page loading.
- The buddy sleeps visually from 10pm to 6am. Sleeping no longer disables the
  Poké Lab/Arena building links. Unused automatic time-preview code was removed.
- Existing Fredoka styling is retained. Duplicate Bootstrap imports are removed.
- Supabase and incoming branch dependencies are combined. The lockfile was
  validated with `pnpm install --frozen-lockfile`, including supply-chain checks.
- The existing PokéAPI URL fallback is used if `VITE_POKE_API_URL` is unset.

## Prototype features

The incoming home Pokémon collection/XP and pack count, Trainer House outfit
selection, and dashboard statistics remain local/sample features. They are not
connected to real inventory, study history, rewards, or persistent profile avatar
updates. The home prototype collection owner is separate from authenticated
trainer identity. This merge makes no Supabase data or permission changes.

The StudyDeck implementation, applied read-access SQL record, SQL rollback,
and study timer work are retained. StudyDeck itself reads real lesson content
and selected buddy records through its existing services.

## Conflict resolutions

- `package.json`: keep Supabase plus incoming UI/chart/animation dependencies.
- `pnpm-lock.yaml`: combine dependency entries; frozen installation confirms the
  lockfile is consistent with the final package manifest.
- `src/assets/main.css`: retain the current styling and remove whitespace markers.
- `src/router/index.js`: retain the router factory and authentication guard;
  switch Home to `HomeView2` and add the protected Trainer House/Dashboard routes.
- `src/views/HomeView.vue`: accept deletion after transferring profile/account/
  logout behaviour into the incoming home screen.

The pre-resolution source and conflict files were copied into the Git-ignored
`.homescreen-merge-backup.local/` before editing. Snapshot filenames avoid test
discovery. The old StudyDeck-only rollback script remains separate from this merge.

## Verification

Route tests cover login/start/home, saved trainer identity and avatar (including
Prefer not to say), a single Edit Profile action, logout/retry,
login protection for new routes, Trainer House/Dashboard navigation, Poké Lab vs
Arena routing, and nighttime access. Existing StudyDeck tests are preserved.

- All **100 tests passed across 13 files**.
- The production build passed. Large main/chart bundles still produce size warnings;
  the chart views are loaded on demand.
- ESLint and Oxlint passed for the changed integration files.
- Full-project lint still reports the same pre-existing issues in the landing,
  standalone timer, and account/registration service tests; those files were not changed.
- No conflict markers remain, and `git diff --check` passed.

Weather/PokéAPI/chart rendering are mocked in route tests. Visual/browser checks
and actual weather/animation behaviour remain unverified because the session's
saved localhost permission blocks browser access. No workaround was used.
