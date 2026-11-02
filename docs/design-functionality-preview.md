# StudyDex — Design + Functionality Preview

**Uncommitted preview on `integration/user-registration`.** Nothing staged, committed or pushed. HEAD remains `d41799a`.

## What changed

- Restored the designed branch’s full-screen Poké Lab and Poké Arena layouts, background artwork, display positions, buddy chamber and battle dock. Background image files were not edited.
- Kept the **Learn / Flashcards** toggle inside the Lab’s navigation display.
- Connected Learn goals, concepts, roadmap and plant demo to the central Lab screen.
- Connected the existing flashcard queue to the reference’s **Again / Easy / Hard** buttons. Ratings retain their existing queue behavior.
- Kept the shared focus/break timer, topic and mode progress, Arena transition, revision links and optional boss practice. Returning from practice preserves the deck and paused timer.
- Connected existing Supabase question and option loading to the Arena board and four colored choices. These remain **ungraded previews**; secure grading, saved attempts and rewards are still pending.
- Adjusted the added controls to fit narrow screens while retaining the reference’s stacked mobile layout.

## Files changed

| File | Short explanation |
| --- | --- |
| `src/views/studyView.vue` | Uses the full Lab scene and subject/topic picker, with existing Learn, cards, timer and practice behavior. |
| `src/views/quizView.vue` | Uses the original Arena scene, question board, sprites and answer dock with existing question-bank functionality. |
| `src/components/study/StudyFlashcards.vue` | Exposes the existing review state/actions through a slot so the scene can render them. |
| `src/components/study/StudyQuiz.vue` | Exposes the existing preview state/actions through a slot for the battle layout. |
| View/router tests and `e2e` checks | Updated selectors for the restored layout; added topic reopening, mode preservation and keyboard answer-choice coverage. |
| `playwright.integration.config.js` | Includes the new layout preview checks. |
| This note and `docs/images/layout-preview/` | Review notes and screenshots. |

No dependency, environment, database, service or schema changes were made. Existing Supabase content and private answer keys were untouched. The earlier `docs/design-merge-summary.md` was preserved.

## Validation

- **Build:** passed; existing large-chunk warning remains.
- **Unit/integration:** 231 passed.
- **Isolated Chrome:** 31 application checks plus 2 reference captures passed, including mobile, Learn/plant interactions, transitions, keyboard choices and optional-practice returns.
- **Layout comparison:** desktop scene, screen, chamber and battle-dock bounds matched the source branch.
- **Changed-file ESLint:** passed. Repository-wide lint still reports the same 4 ESLint and 3 Oxlint findings in unchanged landing/timer components and account/registration tests.
- Browser checks used mocked authentication/content. Live authenticated database access was not retested during this visual preview.

## Scroll performance follow-up

The Lab picker layered scrolling glass-card blurs over a room whose sky and lighting continued updating. This adds rendering work; the exact reported stutter was not reproduced in isolated Chrome.

- `TownBackground.vue` now supports pausing decorative animation and lighting updates while the picker is open; live behavior resumes after selecting a topic.
- `studyView.vue` pauses that background and the preview companion animation during selection, and gives the picker a separate scrolling surface with scroll containment. Card blur, artwork, dimensions and colors are retained.
- `e2e/layout-preview.spec.js` now checks that opening Topics leaves the study timer running with the same deadline and preserves revision state.
- In two before/after scroll samples with 18 mocked topics, a 1440×900 viewport, 2× pixel density and 4× CPU throttling, main-thread task time fell from 83–163 ms to 46–52 ms per gesture pair. The updated samples recorded no layout/paint events. Both versions maintained roughly 60 fps, so these measurements show reduced work rather than a reproduced/fixed frame-rate stall.
- Follow-up validation: build passed, changed-file ESLint passed, 231 unit/integration tests passed, and both desktop/mobile browser journeys passed. No database changes, staging, commits or pushes.

## Preview

Open [Poké Lab](http://localhost:5173/study-decks) in the existing local dev server and refresh if needed. Select a subject/topic, then switch between Learn and Flashcards. Use **Go to Poké Arena** to inspect the battle layout.

Screenshots use synthetic test content and placeholder buddy sprites; your saved buddy, content and current-time lighting will differ.

- [Desktop Lab — Flashcards](images/layout-preview/lab-flashcards-desktop.png)
- [Desktop Lab — Learn](images/layout-preview/lab-learn-desktop.png)
- [Desktop Arena](images/layout-preview/arena-desktop.png)
- [Mobile Lab](images/layout-preview/lab-mobile.png)
- [Mobile Arena](images/layout-preview/arena-mobile.png)

Manual review remaining: your preferred visual presentation with real account content, your saved buddy and your normal device/browser settings.
