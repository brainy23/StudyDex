# Poké Lab interactive Learn redesign

28 October 2026 · Singapore time

**Transition follow-up:** The original 950ms transition described below has been superseded by the staged two-second entrance. See [the diagnosis, changes and visual evidence](arena-transition-fix-report.md). Other redesign behavior remains unchanged.

The redesign builds on the existing local implementation described in `poke-lab-chatgpt-context.md` (27 October). Existing uncommitted flashcard, study-service, router and Arena work was retained. No dependencies were installed, SQL executed, database records changed or new illustrations generated.

## Files changed by this redesign

| Existing file | Change |
| --- | --- |
| `src/App.vue` | Mount the shared Arena transition outside RouterView. |
| `src/views/studyView.vue` | Remove header progress; share Arena entry and pause the timer before the effect. |
| `src/views/quizView.vue` | Consume transition arrival focus after the existing content-loading flow settles. |
| `src/components/study/StudyLearn.vue` | Move roadmaps, order concepts, animate lessons/examples/completion, integrate the optional demonstration, manage focus. |
| `src/components/study/StudyFlashcards.vue` | Disable Arena entry while a transition is active; style the existing loading status. |
| `src/assets/study.css` | Roadmap layouts, lesson transitions, demonstration, button/loading feedback and reduced-motion rules. |
| `src/views/__tests__/StudyView.spec.js` | Update progress/roadmap assertions and completion handoff checks. |
| `src/router/__tests__/flow.spec.js` | Verify the timer pauses before the route handoff. |

| New file | Purpose |
| --- | --- |
| `src/components/study/StudyRoadmap.vue` | Full overview roadmap and compact lesson disclosure. |
| `src/components/study/InteractiveConcept.vue` | Optional, reusable plant/water demonstration. |
| `src/utils/interactiveConcepts.js` | Explicit semantic topic/concept matching without UUIDs. |
| `src/components/common/ArenaTransition.vue` | Accessible fullscreen battle entrance. |
| `src/composables/useArenaTransition.js` | Shared navigation lifecycle, duplicate prevention, skip and failure recovery. |
| `src/components/study/__tests__/StudyLearn.spec.js` | Ordering, hierarchy, disclosure, accurate read counts and original text. |
| `src/components/study/__tests__/InteractiveConcept.spec.js` | Repeated comparisons and optional rendering. |
| `src/composables/__tests__/useArenaTransition.spec.js` | Timing, duplicate clicks, skip, Back, reduced motion, cancellation, abort/error/timeout and login redirect. |
| `e2e/fixtures/lab.js` | Synthetic profile, catalogue, lesson and HTTP/auth responses. |
| `e2e/lab-redesign.spec.js` | Browser journeys, flashcard regression, keyboard, viewport and motion checks. |
| `playwright.lab.config.js` | Isolated fixture server with a fake Supabase URL/key. |
| `docs/poke-lab-redesign-report.md` | This report. |

Other modified/untracked files already present in the working tree are outside this redesign's file list.

## Libraries used

- Existing **motion-v 2.8.0**: roadmap selection/read feedback, example and completion entrances, observation changes and the Arena wipe/title.
- Existing **reka-ui 2.11.0**: Collapsible, ToggleGroup and Dialog primitives, including disclosure semantics, roving keyboard focus and a modal focus scope.
- Vue's built-in Transition handles the whole lesson's exit/entrance. CSS handles the schematic plant and water level. No additional animation library was added.

## Layout and learning behavior

The desktop buddy/content/utilities layout, Fredoka font, background assets, navy text, yellow controls, rounded panels and pale-yellow examples remain. The 1200px, 848px and 576px breakpoints remain in place.

The overview shows topic content, learning goals, the complete roadmap in `concept_order`, then Start Learning. The full list uses two columns where space permits. Individual lessons show one compact roadmap above the title and explanation; concept names expand on demand. There is no concept-position progress bar or permanently appended full lesson roadmap. The existing topic-browser read progress remains.

Viewing a concept never acknowledges it. Next Concept and Finish Topic retain the existing unique-ID acknowledgement and completion-history logic. Jumping to the last concept and finishing therefore correctly reports one read concept. Learn/Flashcards caching, revision hints, empty/error states and the original Supabase explanations/examples remain in use, including line breaks.

Concept changes use a 100ms exit and 200ms entrance. The previous content height is held during the handoff. Motion adds a 250ms active indicator, short read feedback, a subtle example entrance and a completion emblem. Buttons have restrained hover/press feedback. Loading statuses remain visible while their indicators run. Focus moves to the new heading, with viewport correction when necessary. Reduced-motion preferences disable movement or make state changes effectively immediate.

## Plant and water demonstration

Only **Diversity of Living and Non-Living Things → What Living Things Need** renders the demonstration. The mapping normalizes case, whitespace and punctuation in those existing names; it does not use database UUIDs, lesson order or guessed keyword matches.

Enough Water and Not Enough Water can be selected repeatedly by pointer, touch or keyboard. The same schematic SVG plant changes from upright green leaves to drooping, muted leaves over approximately 1.1 seconds. The water gauge changes with it, and a polite live region describes the observation. The persistent note explains that the model speeds up changes that happen over time. No answer is submitted, concept marked read, quiz started, XP awarded or completion changed by the demonstration. Other lessons render no empty demonstration panel.

## Arena transition

The global header, Learn completion and Flashcards completion actions all call one controller. It captures `arenaLocation(...)` at the click, pauses the existing study timer immediately, blocks duplicate entry and plays a 950ms battle entrance. The app-root Dialog survives the Lab unmount and provides the title, topic context, focus trap, Skip Transition and Escape support. Reduced motion bypasses the delay.

Navigation uses `router.push` to preserve normal Back behavior and the canonical subject/topic query. It opens the existing Topic Quiz chooser, never a quiz or Boss Battle automatically. Successful handoff closes the overlay; the Arena consumes a one-time arrival focus request after its existing content loading finishes. This keeps its heading visible when its centred loading panel grows. Aborted or rejected navigation closes the overlay, restores the initiating control and offers a visible retry message. A stalled navigation releases the overlay after eight seconds. Unrelated browser navigation cancels a pending entrance. Direct Arena entry, refresh and ordinary Back navigation do not start the effect.

## Verification

The browser suite uses the real application, route guard, Supabase client, services and Vue components with **intercepted synthetic HTTP/auth responses**. Its dedicated server uses `https://studydex-fixture.invalid`; it does not authenticate against or query a real Supabase project.

| Check | Final result |
| --- | --- |
| Unit/integration tests | **211 passed across 22 files.** Includes existing auth, router, timer, flashcard, completion-history and service regressions. |
| Browser redesign suite | **13 passed** in headless Google Chrome. |
| Production build | **Passed.** Vite reports large chart/dashboard chunks. |
| ESLint and Oxlint on redesign files | **Passed**, with no errors or warnings. |
| Repository-wide lint | Existing errors in four unrelated files, detailed below. |
| Whitespace check | `git diff --check` passed. |
| Live authenticated Supabase/RLS | Not run. |

Browser coverage includes roadmap positioning and expansion, concept jumping/previous/next navigation, accurate acknowledgements after skipping concepts, completion/revisit, preserved explanation/example line breaks, repeated plant-water comparisons, keyboard focus, 44px roadmap targets, all three Arena entry points, automatic/Skip/Escape handoffs, subject/topic preservation, paused timer recovery without extra focus time, Back navigation, direct entry/refresh, reduced motion, loading visibility and Buddy failure. Flashcards cover Practise Again, all 15 remembered cards, completion, Restart Deck and a second completed deck. Responsive checks cover **320, 390, 576, 768, 848 and 1200px**, plus a **1440px** desktop journey. No horizontal overflow or uncaught browser errors occurred in these scenarios.

Reproduce unit and browser checks with:

```sh
pnpm exec vitest run
pnpm exec playwright test --config=playwright.lab.config.js
pnpm build
```

Where Playwright Chromium is unavailable but Google Chrome is installed:

```sh
STUDYDEX_E2E_BROWSER_CHANNEL=chrome pnpm exec playwright test --config=playwright.lab.config.js
```

Screenshots and failure traces are generated in the ignored `test-results/` directory. Screenshots contain fixture educational text and are not evidence of live database content.

Both lint engines are run through pnpm without their automatic-fix flags, to preserve unrelated teammate changes. Repository-wide lint currently reports existing errors in `src/components/landing/landing.vue`, `src/components/timer/Timer.vue`, `src/services/__tests__/accountService.spec.js` and `src/services/__tests__/registrationService.spec.js`. The redesign's changed files pass ESLint and Oxlint.

## Limits

- Live authenticated Supabase/RLS behavior and the currently deployed educational records have not been revalidated. Existing auth, retrieval, filtering and schema code were preserved.
- Browser verification is in headless Google Chrome. Safari, Firefox, physical touch devices and VoiceOver/NVDA have not been manually tested.
- Renaming the registered topic or concept requires updating `interactiveConcepts.js`; unmatched content intentionally has no demonstration.
- The production build reports large existing chart/dashboard chunks. Bundle restructuring is outside this task.
- The existing live-auth flashcard suite and the stale starter root-page smoke test are separate from the isolated redesign suite.

No failing checks specific to this redesign remain. The checks above do not establish live database access or manual assistive-technology compatibility.
