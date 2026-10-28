# Poké Lab → Poké Arena battle transition follow-up

28 October 2026 · Singapore time

## Diagnosis

The connected user Chrome browser reported `prefers-reduced-motion: reduce = true` and `no-preference = false`. This was read in both the existing Poké Lab tab and a separate blank tab; no media emulation was requested in either. No browser or operating-system accessibility setting was changed. The previous controller passed that preference to a zero-delay navigation timer, so an absent animation in this browser is an **intentional accessibility bypass**.

Normal motion also needed improvement. Before editing, an isolated browser capture measured **933ms of overlay visibility** and **500ms of fully readable title time**. The old title waited 200ms, took 250ms to enter, then disappeared at the 950ms route handoff. Its ball was a small static graphic, and the overlay closed without an Arena reveal stage. The timer started at the button click, even before the portal had painted.

Inspection and the baseline screenshots confirmed the app-root mount, Dialog rendering and normal-motion visibility. All three buttons already called the same controller. There was no observed button bypass, premature Lab-unmount cleanup or unexpected animation-completion event: the old controller simply used its fixed timer. Stacking was not the observed cause; the new overlay nevertheless uses explicit layers above ordinary app dialogs.

## Updated sequence

| Stage | Time after painted-overlay acknowledgement | Behavior |
| --- | --- | --- |
| Anticipation | 0–350ms | Red and white shutters enter diagonally over navy, with yellow accents and an immediately accessible Skip control. |
| Battle entrance | 350–1,500ms | A large CSS Poké Ball scales and rotates beside **A Challenge Awaits!** and the selected topic. The title enters in 150ms, then remains fully readable for about one second. |
| Arena reveal | 1,500–2,000ms | Navigate under cover, then move the shutters apart and fade the backdrop to reveal the existing Arena. The root overlay stays mounted through the route change. |

Playback begins only after the portal has had a painted frame, acknowledged through two animation frames. A slow route guard holds the covered battle stage until navigation resolves; the 500ms reveal starts only after a successful route handoff. Animation-completion events are not required for cleanup.

Measured normal-motion overlay duration was **2,016–2,017ms**, including frame scheduling. All five captured normal journeys measured **1,000ms of fully readable title time**.

## Navigation and recovery

The existing three entry points remain unchanged:

1. Poké Lab header → `goToArena()`.
2. Learn completion → `arena` event → `goToArena()`.
3. Flashcards completion → `arena` event → `goToArena()`.

That handler still captures `arenaLocation(topic, subject)`, calls the shared controller and pauses the existing timer immediately. The destination remains `/quiz?subject=…&topic_id=…`, with Topic Quiz selected and no assessment started. Normal `router.push` Back behavior remains.

The controller prevents duplicate entry, rejects stale painted-frame acknowledgements and permits skipping anticipation, battle or reveal. It cancels playback on unrelated navigation, including Back during the reveal. A missing presentation host releases after two seconds with a retry message; a stalled navigation releases after eight seconds. Rejected/aborted navigation restores the initiating control and reports the failure. The existing Arena arrival-focus handshake runs after the overlay closes and content loading settles.

## Accessibility

Reka Dialog supplies the accessible title/description, modal focus scope and background isolation. Skip has a visible keyboard focus state and a touch target of at least 44px. Escape and Enter on Skip were tested separately. Status messages announce stage changes politely, while the decorative ball and shutters are hidden from assistive technology.

Reduced motion bypasses all stages and does not render the animated Dialog. Turning reduced motion on during playback also skips the remaining sequence. In the fixture browser, reduced-motion navigation took **105ms**, and Skip/Escape closed the overlay in **13–18ms**. Route/auth guards still resolve normally.

The user's connected Chrome preference remains reduced motion, so that browser will intentionally continue to open Arena almost instantly. The full sequence was verified with `no-preference` explicitly emulated in separate automated browser contexts.

## Files changed

| File | Change |
| --- | --- |
| `src/components/common/ArenaTransition.vue` | Three-stage overlay, large animated ball, diagonal shutters, stronger stacking, painted-frame acknowledgement and reduced-motion bypass. |
| `src/composables/useArenaTransition.js` | Explicit phases, 2,000ms timeline, covered route handoff, 500ms reveal, phase-independent Skip and presentation/navigation watchdogs. |
| `src/composables/__tests__/useArenaTransition.spec.js` | Phase timing, missing host, delayed guards, stale callbacks, Skip/Back during reveal and live preference changes. |
| `e2e/lab-redesign.spec.js` | Raises the existing normal-motion minimum-duration check to 1,800ms. |
| `e2e/arena-transition.spec.js` | New real-time frame sampling, screenshot evidence, all three full entry journeys, mobile, Skip/Escape and reduced-motion checks. |
| `playwright.arena.config.js` | Isolated transition suite with explicit normal-motion test media. |
| `docs/images/arena-transition/` | Before/after screenshots, per-frame timing JSON and the observed browser preference. |
| `docs/arena-transition-fix-report.md` | This diagnosis, implementation and verification report. |
| `docs/poke-lab-redesign-report.md`, `docs/poke-lab-redesign-summary.md` | Links to this follow-up, which supersedes their original transition timing. |

Checksums confirm that App.vue, both route views, study.css, Learn, roadmap, plant demo, Flashcards, timer mechanics, study service, package.json and the lockfile were unchanged by this follow-up. No dependencies were installed, SQL run, database content changed, grading added or Pokémon artwork generated.

## Visual evidence

All application screenshots use the real frontend with **synthetic auth/API responses**, not a live authenticated Supabase session. The fixture server has a fake Supabase URL/key. The real connected browser was used to inspect its motion preference and current render state.

| Capture | Evidence |
| --- | --- |
| Before: initial screen | [Screenshot](images/arena-transition/before/01-just-triggered.png) |
| Before: small ball/title | [Screenshot](images/arena-transition/before/02-title.png) · [timing](images/arena-transition/before/timing.json) |
| After: anticipation | [Screenshot](images/arena-transition/after/desktop/01-anticipation.png) |
| After: large ball/title | [Screenshot](images/arena-transition/after/desktop/02-ball-and-title.png) |
| After: reveal | [Screenshot](images/arena-transition/after/desktop/03-reveal.png) |
| After: final Arena | [Screenshot](images/arena-transition/after/desktop/04-arena.png) · [per-frame timing](images/arena-transition/after/desktop/timing.json) |
| 320px mobile | [Ball/title](images/arena-transition/after/mobile-320/02-ball-and-title.png) · [timing](images/arena-transition/after/mobile-320/timing.json) |
| 390px mobile | [Ball/title](images/arena-transition/after/mobile-390/02-ball-and-title.png) · [timing](images/arena-transition/after/mobile-390/timing.json) |
| Reduced motion | [Arena](images/arena-transition/after/reduced-motion/arena.png) · [timing](images/arena-transition/after/reduced-motion/timing.json) |

The browser suite records each rendered frame's phase, card opacity, ball transform, topmost overlay hit test and route. Assertions check that the overlay stays above the page, the ball actually moves, the title has readable dwell time, the route changes while the overlay survives, and the reveal contains the Arena heading. Screenshot sequences were inspected visually; a video was not recorded.

## Validation and limits

- **216 unit/integration tests passed** across 22 files.
- **10 transition browser tests passed** in headless Google Chrome, including full normal-motion journeys from all three buttons, 320×568 and 390×844 mobile, Skip/Escape in every stage, reduced motion and preference changes during playback.
- **13 existing Lab browser regressions passed**, covering Learn/roadmap/demo, flashcard practice/completion/restart, timer pausing/recovery, Back, mobile breakpoints, loading states and direct Arena entry. **23 browser tests passed in total.**
- Scoped ESLint/Oxlint passed. The production build passed with the existing large chart/dashboard chunk warning.
- Full-repository lint remains blocked by existing errors in the landing/timer components and account/registration service tests. Those unrelated files were left unchanged by this follow-up.
- Live Supabase auth/RLS, Safari/Firefox, physical touch devices and manual VoiceOver/NVDA were not tested.
- The existing local Lab tab was blank at inspection and logged a Vite WebSocket connection failure. A reload was attempted, but a live authenticated journey was not verified there. This is separate from the timing measurements, which all use the isolated fixture server.

Reproduce with the project's pnpm workflow:

```sh
pnpm exec vitest run
STUDYDEX_E2E_BROWSER_CHANNEL=chrome pnpm exec playwright test --config=playwright.arena.config.js
STUDYDEX_E2E_BROWSER_CHANNEL=chrome pnpm exec playwright test --config=playwright.lab.config.js
pnpm build
```

Omit the browser-channel environment variable to use installed Playwright Chromium. Test media emulation affects only the isolated browser contexts and does not alter the user's accessibility settings.
