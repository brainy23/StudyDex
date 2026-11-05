# StudyDex
WAD2 Group Project

For the current integration branch, setup steps and feedback checklist, see
[Team testing](docs/team-testing.md).

For the connected Quiz Room, daily progress, Study History, account isolation,
deletion and reproducible Supabase setup, see
[Backend connections](docs/BACKEND_CONNECTIONS.md).

StudyDex/
│
├── public/
│   ├── backgrounds/
│   │   └── study-background.png
│   │
│   ├── icons/
│   └── favicon.ico
│
├── src/
│   │
│   ├── assets/
│   │   └── main.css
│   │
│   ├── components/
│   │   │
│   │   ├── common/
│   │   │   ├── AppBackground.vue
│   │   │   ├── AppNavbar.vue
│   │   │   ├── AppButton.vue
│   │   │   └── ProgressBar.vue
│   │   │
│   │   ├── study/
│   │   │   ├── TopicSelector.vue
│   │   │   ├── StudyDeck.vue
│   │   │   ├── FlashCard.vue
│   │   │   └── BossBattle.vue
│   │   │
│   │   ├── buddy/
│   │   │   ├── PokemonBuddy.vue
│   │   │   ├── PokemonStatus.vue
│   │   │   └── PokemonXP.vue
│   │   │
│   │   ├── timer/
│   │   │   ├── StudyTimer.vue
│   │   │   ├── SessionCounter.vue
│   │   │   └── BreakReminder.vue
│   │   │
│   │   ├── quiz/
│   │   │   ├── QuizQuestion.vue
│   │   │   ├── QuizOption.vue
│   │   │   ├── QuizProgress.vue
│   │   │   └── QuizResult.vue
│   │   │
│   │   ├── rewards/
│   │   │   ├── PokePack.vue
│   │   │   ├── PackOpening.vue
│   │   │   └── RewardCard.vue
│   │   │
│   │   └── dashboard/
│   │       ├── StudyStats.vue
│   │       ├── QuizStats.vue
│   │       ├── StudyActivity.vue
│   │       └── ParentSummary.vue
│   │
│   ├── views/
│   │   ├── HomeView.vue
│   │   ├── StudyView.vue
│   │   ├── QuizView.vue
│   │   ├── RewardsView.vue
│   │   └── DashboardView.vue
│   │
│   ├── stores/
│   │   ├── appStore.js
│   │   ├── pokemonStore.js
│   │   ├── studyStore.js
│   │   ├── quizStore.js
│   │   └── rewardStore.js
│   │
│   ├── services/
│   │   ├── pokemonService.js
│   │   ├── studyService.js
│   │   └── quizService.js
│   │
│   ├── data/
│   │   ├── studyContent.js
│   │   └── quizQuestions.js
│   │
│   ├── router/
│   │   └── index.js
│   │
│   ├── App.vue
│   └── main.js
│
├── database/
│   ├── schema.sql
│   └── seed.sql
│
├── e2e/
├── package.json
├── pnpm-lock.yaml
├── vite.config.js
└── README.md

## Views vs Components

### `src/views/`
Views represent the main pages of the application.

Examples:
- `HomeView.vue` - Homepage
- `StudyView.vue` - Study and flashcard experience
- `QuizView.vue` - Quiz page
- `RewardsView.vue` - PokéPack rewards
- `DashboardView.vue` - Learning progress dashboard

Views should mainly organise the page layout, manage page-level flow, and combine multiple components.

### `src/components/`
Components are smaller reusable parts of a page.

Examples:
- `FlashCard.vue` - Displays one flashcard
- `StudyTimer.vue` - Tracks study duration
- `PokemonBuddy.vue` - Displays the student's selected Pokémon
- `QuizQuestion.vue` - Displays a quiz question
- `PokePack.vue` - Displays a reward pack

Components should focus on one specific feature or UI element.

### Simple Rule

`View = Full Page`

`Component = Part of a Page`

For example:

StudyView.vue
- PokemonBuddy.vue
- TopicSelector.vue
- StudyTimer.vue
- StudyDeck.vue
  - FlashCard.vue

## Registration integration

Registration is available at `/register` and `/signup`. It uses Supabase Auth
for email/password signup. The Auth insert trigger creates `public.profiles`
with the user's `display_name`, `avatar_choice`, and the `school_level_id`
resolved from `public.levels`. Avatar choices are `male`, `female`, and
`prefer_not_to_say`; signup asks the user to select one explicitly. Passwords are never written to the profile table.

Copy `.env.example` to `.env.local` and supply the project's URL and publishable
key. Use only a publishable key in the browser; never a secret/service-role key.
Restart Vite after changing environment variables. `.env.local` is ignored by Git.

The `registration_profiles`, `registration_avatar_choice`, and
`profile_editing_permissions` migrations have
been applied to **Studydex Database**. Their SQL is recorded in
`database/registration.sql`, `database/registration-avatar.sql`, and
`database/profile-editing.sql` for review and
setup of another database that already has the same `profiles` and `levels`
tables. Run those files once, in that order, per database. Profile creation is atomic with Auth signup, including when
email confirmation is enabled. Clients can read only their own profile and update
only their own `display_name`, `school_level_id`, and `avatar_choice`.
The profile menu's **Edit Profile** option opens `/account`; sign-in email changes
use Supabase Auth separately. Profile `id` and `created_at` stay read-only.

`database/verify-profile-editing.sql` checks profile updates under the actual
`authenticated` role, including all three avatars and readable school-level
lookups. It also checks that other users' profiles, protected columns, direct
profile creation/deletion, invalid values, and anonymous access remain blocked.
These checks passed on Studydex Database; all temporary users and edits were
rolled back and no email was sent. `database/check-profile-details.sql` is a
read-only query for comparing an existing user's details before and after manual
testing in the app.

In Supabase **Authentication → URL Configuration**, add the registration callback
URL for your development origin (normally `http://localhost:5173/register`) and
your deployed origin to the redirect allow list. Set the Site URL to your app's
actual URL. Use the port printed by Vite if 5173 is occupied. Keep email
confirmation enabled if desired; the page supports confirmation links and
immediate sessions. See [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).

During local testing, keep Vite running and open confirmation links on the same
computer as the app. A localhost link on a phone refers to the phone, not this
computer. Use the deployed public URL for confirmation across devices. If a link
opens an unused localhost port, check the Site URL and redirect allow list against
the actual Vite URL; newly requested emails use the running app's origin.

Email changes remain pending until Supabase receives the required confirmations.
With Secure Email Change enabled, confirm the newest link in both the current and
new inboxes. `/register` handles the first-link message with a confirmation status
screen, and the completed email callback returns to `/account`. Invalid or expired
links show recovery steps. Account settings can resend confirmation emails and
check the current Auth email; it also refreshes email status when the tab regains
focus without discarding unsaved profile edits. These refreshes and resends do not
change profile ownership or bypass email confirmation.

The town menu's **Log out** action signs out the current Supabase session and
returns to `/login`. It prevents duplicate submissions, reports failed sign-outs,
and allows retrying. Protected pages require a session when revisited. Other
devices remain signed in.

Run `pnpm dev` and open `/` to start at `/landing-info`. Choose login or signup.
Successful login, immediate signup, or email confirmation takes you to `/landing`;
Landing loads the signed-in user’s stored name, school level, and avatar choice
from `profiles` and displays them above Start, with a retry option if loading
fails. Prefer not to say uses Ditto's hosted sprite from the official PokéAPI sprite repository.
Its Start button opens `/home`. The `/home` route uses `HomeView.vue` (the latest `HomeView2.vue` from the `Home-Screen` branch, renamed locally) and uses
the current time. Its trainer header reads the saved display name and avatar;
buddy progress and study goals still use that branch’s sample data. `/landing` and `/home` require a session.
No real email was sent during automated verification. Tests cover validation,
Auth payloads, pending submissions, retries, success states, and reading the
verified user’s profile. Additional tests cover logout and protected-route access,
email-change requests/resends, first-link and expired-link handling, and refreshing
email status without losing profile edits. The live public API connection was also checked for
school-level access and anonymous profile denial. The live trigger
and ownership policies were checked with test records inside a rolled-back SQL
transaction. `database/verify-registration.sql` repeats those checks for all
three avatar choices, validates the saved fields, and confirms that an invalid
avatar does not leave a partial Auth account. It rolls back all test data and
sends no email.

The buddy page still uses its existing demo data. Login uses the Auth email
address and password; the registration display name is not a unique login ID.

The database advisor also reported pre-existing missing policies on the other
feature tables and public execute access on `public.rls_auto_enable()`.
Those are outside registration setup. See the
[missing-policy guidance](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
and [function-permission guidance](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).


### Environment files and PokéAPI

Edit `.env.local` for this machine's active settings. It contains the Supabase
URL, publishable key, and `VITE_POKE_API_URL=https://pokeapi.co/api/v2`.
`.env.example` is a checked-in template for teammates, not a runtime env file.
The older `.env` contains a PokéAPI placeholder and an unprefixed `POKE_API_URL`;
those entries are not used by the app. Vite also loads `.env`, with `.env.local`
taking precedence for duplicate variable names. Restart Vite after env changes.

`src/lib/pokeapi.js` reads the configured base URL for Pokémon requests.
PokéAPI requires no API key. Ditto's avatar uses the hosted sprite at
`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/132.png`.
Signup and the saved profile share this image mapping. The image requires
internet access; there is no local Ditto image file.
