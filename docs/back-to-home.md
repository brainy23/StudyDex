# Shared Back to Town navigation

`src/components/common/BackToHome.vue` returns to `/home` with a Vue Router link.
It uses a fixed destination, so opening a page directly or arriving from somewhere
other than Town still gives the same return path. Existing authentication guards
and Poké Lab's timer-pause hook continue to run.

## Where it is used

| Page | Return control |
| --- | --- |
| Poké Arena (`/quiz`) | Back to Town link in the assessment header |
| Poké Lab (`/study-decks`) | Back to Town link in the header |
| Trainer House (`/trainer`) | Existing return door, using the component with its artwork slot |
| Account Settings (`/account`) | Back to Town link above the form |
| Dashboard (`/dashboard`) | Back to Town in the welcome banner; replaces browser-history Back |
| Rewards (`/rewards`) | New button at the upper left, available throughout pack opening |

Public login/registration/marketing links and the older standalone timer/buddy demos
were not changed. This adds no routes and makes no database or authentication changes.
The subsequent Lab/Arena separation makes `/quiz` a protected student page and adds
context-preserving navigation between Lab and Arena; see `lab-arena-separation.md`.

## Reuse

```vue
<script setup>
import BackToHome from '../components/common/BackToHome.vue'
</script>

<template>
  <BackToHome />
</template>
```

The default `button` variant supplies the yellow button appearance. `variant="text"`
fits an existing text-link header. `variant="custom"` retains the destination and
focus behavior while allowing a page to supply its appearance and optional slot.
Trainer House uses that slot for its existing door SVG and visible label, with an
accessible label on the link. No artwork was added or replaced.

## Verification

- All **159 automated tests passed across 16 files**.
- New route tests open each of the six pages directly and return to the actual Town view.
- Returning from Poké Lab pauses a running timer.
- Following the link while signed out still sends the visitor to Login through the existing guard.
- Production build and ESLint/Oxlint for the changed files passed. Existing bundle-size warnings remain.
- Browser layout and native interaction were not verified because of the saved localhost access block.

## Revert only this change

The versions immediately before this change are saved in the Git-ignored
`.back-home-backup.local/` folder. **Keep that folder** if you want to use this
local rollback. It includes the earlier avatar sync, weather and Flashcards work.

Preview without changing files:

```sh
node scripts/revert-back-to-home.mjs
```

Restore the previous navigation:

```sh
node scripts/revert-back-to-home.mjs --apply
```

The script verifies the snapshots and current file fingerprints before changing
anything. If one of the affected files has later edits, or a snapshot is missing,
it stops so those edits are not overwritten. Review such changes manually rather
than replacing the fingerprints to force a rollback.

When applied, it restores only the six views and route-test file changed here,
and moves the new component to a timestamped `.back-home-reverted-*.local` archive.
The current versions of all affected files are saved in that archive as well.
The documentation and rollback script remain available. It does not reset Git,
change commits, run SQL or undo the earlier feature work.

Preview, restoration, archival, repeated application and refusal on later edits
or missing snapshots were tested on temporary copies. The actual working app
still has the shared navigation enabled.
