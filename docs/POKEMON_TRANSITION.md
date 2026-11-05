# Reusable Pokémon loading transition

The original red/white shutters, gold accents and animated Poké Ball are now available independently of Arena. **Room entry is wired after subject/topic selection.** Town Poké Lab and Poké Arena buttons open the subject picker with the simple white Poké Ball loading screen while data loads. Topics and the Lab mode chooser use the same simple loader. The full red/white shutter transition remains reserved for room and Boss Battle entry. Selecting a quiz topic starts the Quiz Room transition; choosing Learn or Study starts that room’s transition. Each entry waits for the room’s profile/catalogue and selected questions, lesson or flashcards to finish loading before revealing content or its error/retry state. Room clocks mount after the overlay closes so a first-visit weather-location dialog cannot block the transition. Switching between Learn and flashcards retains its existing navigation and saved-progress behavior. Trainer House remains available for future placement.

**Fast-flashcard Boss Battle entry is also wired at 2.5 seconds.** `FAST_CARD_MS = 5000` and `FAST_CARD_STREAK = 3` in `bossEncounter.js` define the existing rule: three consecutive ratings under five seconds each, rather than flipping alone. `rateCard()` calls `startSurpriseBoss()` in `studyView.vue`. The transition starts only after the encounter and deck/timer snapshot are saved successfully; it reveals the battle after the profile/encounter validation and question restoration finish. Optional Pokémon graphics retain their own loading/fallback behavior. Winning still restores progress; losing still resets the deck/timer. Returning to flashcards does not replay the animation. The practice questions, local grading and reward behavior were not changed.

## Files

- `src/components/common/PokemonTransition.vue`: fullscreen native dialog, original animation, configurable labels, keyboard/focus handling and responsive layout.
- `src/composables/usePokemonTransition.js`: shared loading controller plus a factory for isolated previews/tests.
- `src/composables/__tests__/usePokemonTransition.spec.js`: asynchronous loading, failures, retries, cancellation, timeouts and motion preferences.
- `src/App.vue`: mounts one persistent transition host alongside the routed view.
- `src/composables/useRoomTransition.js`: shared room-entry navigation, readiness acknowledgements, cancellation and timeout handling.
- `src/views/HomeView2.vue`: direct Town building navigation without the transition.
- `src/views/SubjectsView.vue`: subject selection with the fetched simple loading screen.
- `src/components/common/LoadingScreen.vue`: fullscreen white Poké Ball loader used by subjects, topics and mode selection.
- `src/views/TopicsView.vue`: Quiz Room entry after topic selection; uses the database catalogue for every subject.
- `src/views/StudyModeView.vue`: Learn Room and Study Room entries after mode selection.
- `src/views/LearnView.vue`, `src/views/quizView.vue`: acknowledge rendered room content/error states and expose retries after timeouts.
- `src/views/studyView.vue`: wraps the saved surprise encounter's navigation in the transition.
- `src/views/SurpriseBossView.vue`: acknowledges battle/error readiness, cancels the overlay on leaving, and offers profile retry on timeout. A successful retry clears its earlier error message.
- `e2e/fixtures/pokemon-transition.html`, `e2e/pokemon-transition.spec.js`, `playwright.transition.config.js`: isolated browser preview and checks. No database calls or real navigation.
- `e2e/town-entry.spec.js`: verifies unanimated Lab/Arena subject/topic selection with slow/failed reads, retries, empty quizzes and browser Back.
- `e2e/room-entry.spec.js`: verifies all three room transitions, selected-content readiness, Skip, reduced motion, errors/retry, timeouts and browser Back. Both fixtures use synthetic data without live Supabase calls.
- `e2e/boss-entry.spec.js`: the rating threshold, slow-rating reset, reduced motion, stored encounter, unavailable storage, pending/error/timeout loading, leaving the page, and existing win/loss deck/timer returns. No live Supabase calls or database writes.

## Future integration

Exactly one host is already mounted in `App.vue`, alongside `RouterView`, so it survives navigation. Keep this host when adding placements:

```vue
<script setup>
import PokemonTransition from '@/components/common/PokemonTransition.vue'
</script>

<template>
  <RouterView />
  <PokemonTransition />
</template>
```

Call the shared controller from the chosen entry action:

```js
import { usePokemonTransition } from '@/composables/usePokemonTransition'

const transition = usePokemonTransition()

async function openDestination() {
  try {
    await transition.run({
      animate: true,
      source: 'Town',
      destination: 'Poké Lab',
      title: 'A new adventure awaits!',
      description: 'Your study space is getting ready.',
      task: async (signal) => {
        // Replace this example with the destination's actual loading contract.
        await loadDestination(signal)
      },
    })
  } catch (error) {
    // Show an appropriate error in the calling screen and offer a retry.
    showLoadError(error.message)
  }
}
```

`loadDestination` and `showLoadError` are explanatory placeholders, not supplied functions. The task starts after the overlay paints. Its promise must include the destination's actual readiness: `router.push()` alone does not wait for data fetched later by a mounted view. Check navigation failures and pass the abort signal to cancellable requests; the controller cannot undo navigation or cancel work that ignores its signal.

For views that load after mounting, room entries use `waitFor: 'room:<route-name>:<topic-id>'` (route names: `quiz-battle`, `learn`, `study-decks`). `enterRoom()` creates this key and `useRoomTransitionReady()` acknowledges it once each room’s readiness predicate becomes true. The destination captures the matching key and `transition.state.sequence` when its load starts, then calls `transition.pageReady(key, sequence)` after its final state renders. Call `transition.pageLeft(key, sequence)` on unmount or a flow change to cancel an unfinished entry. Both navigation and the matching page acknowledgement must finish; stale sequences are ignored. Reuse this pattern with a distinct key for a future destination. Load errors should reveal the destination's existing error/retry interface rather than leave the overlay open.

Boss entries use `waitFor: 'surprise-boss:<encounter-id>'`, so a different encounter cannot acknowledge the pending battle. If navigation succeeds but loading fails, the destination keeps ownership of the saved encounter; the old flashcard view does not overwrite it with a cancelled snapshot.

**Quiz, Learn and Study room entries each use 2.5 seconds total animation time.** Each call sets `durationMs: 2500`; the reusable controller's default remains 2000. All animation phases and CSS durations scale together: 0.4375 seconds of shutters, 1.4375 seconds of entrance and a 0.625-second reveal. Slow loading keeps the overlay open. Skip/Escape removes animation delays but still waits for the task. Reduced motion shows a static loader without an artificial minimum delay. Task errors close the overlay and reject the caller's promise. A missing host fails after 2 seconds; a pending task fails after 15 seconds. Unmounting the host cancels the active transition. Concurrent calls share the first request; destinations are not queued.

## Preview and verify

```sh
pnpm exec vite --config vite.onboarding.fixture.config.js --configLoader runner --host 127.0.0.1 --port 5178
```

Open `http://127.0.0.1:5178/e2e/fixtures/pokemon-transition.html`. The three buttons preview different labels and simulate 2.5 seconds of loading. This fixture uses synthetic configuration and does not load the real app or Supabase.

Stop that server before running the browser tests:

```sh
pnpm test:unit --run src/composables/__tests__/usePokemonTransition.spec.js src/views/__tests__/LevelContent.spec.js
pnpm exec playwright test --config playwright.transition.config.js
```

Earlier verification on 5 November 2026: the Boss integration passed 33 focused unit tests (17 controller, 16 level-content) and 10 targeted Chrome checks (eight Boss checks and two Town entry regressions). Earlier integration checks also passed 22 headless Chrome checks covering the reusable preview and Town flows. Browser checks use mocked data; earlier layout checks include 1280×800, 320×568 and 844×390, with preview screenshots visually inspected. Oxlint and the production build passed after the Boss integration; the build retains existing large-chunk and quiz import warnings. ESLint passed for the other touched source/test files; `SurpriseBossView.vue` retains six pre-existing unused-symbol errors, confirmed against `HEAD` (`studyErrorMessage`, `pickerTopics`, `topicStatus`, `selectPickerSubject`, `enterTopic`, `returnToSelection`). No unrelated cleanup was performed. Unit/build verification used environment-free temporary configurations. The full unit suite, live Supabase behavior, Safari/Firefox and physical phones were not tested for this change.

No dependencies, route definitions, database records or permissions were changed.

Room placement update, 5 November 2026: the production build and all 33 focused unit tests pass. Twenty Chrome checks pass for the unanimated Town/picker flows and all three room entries, plus five focused Boss Battle regression checks. ESLint passes for the new helper, picker/room files, and updated tests/config; HomeView2.vue and studyView.vue retain their existing unused `unopenedPackLabel` and `result` errors. The build retains existing large-chunk and quiz import warnings.

Loading-screen integration: pulled `origin/new-integration-backend` through `8b18c61` (`loading screen fix`) and reconciled local room placements. The controller now requires `animate: true` for the full overlay; room calls, controller tests and the isolated preview opt in explicitly. The simple picker loaders and upstream room artwork/button changes are retained. Validation: production build, 34 focused unit tests, and 23 Chrome checks for initial loaders, room entry and Boss Battle loading/error/back behavior passed.
