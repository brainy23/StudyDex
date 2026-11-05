# Saved device location preference

Apply the full `supabase/migrations/20261105140000_profile_device_location.sql`
file in the app's Supabase SQL Editor. It adds a nullable boolean to
`public.profiles` and the authenticated read/save RPCs used by the weather modal.
It is safe to reapply and does not reset existing choices.

| `device_loc` | Automatic behavior |
| --- | --- |
| `null` | Show the location chooser. |
| `true` | Request device coordinates without showing the app's chooser again. |
| `false` | Use Singapore without asking again. |

Use My Location saves `true`; Not Now / Use Singapore saves `false`. Escape on
the first unanswered modal also saves `false`. A user can still explicitly open
Change weather location to change the choice. Otherwise, only resetting the
column to `null` makes the automatic modal appear again.

The choice survives route changes, sign-out/sign-in, app reloads and devices
because it belongs to the authenticated user's profile. Coordinates remain in
memory and are never stored in this column. The browser controls its own native
geolocation permission prompt; this preference controls the StudyDex modal.
If geolocation fails, Singapore is used while retaining the saved choice.

The read/save RPCs accept no target profile ID and always use `auth.uid()`.
The frontend pins saves to the profile that loaded the preference, resets state
on account changes, and ignores old location/preference responses. Read failures
use default weather instead of treating an unknown preference as `null`; save
failures keep the chooser open with a retryable error.

Verification: 19 focused service/component tests, 16 isolated PostgreSQL
integration checks, lint and the production build passed. No live SQL migration
or profile update was performed from this workspace.
