# StudyDex — Merge Summary

**2 November 2026 · Branch: `integration/user-registration`**

Merged `designed-poke-arena` and `designed-poke-arena-tutorial`. The shared Pokémon component changes are included too. A backup of the original branch is preserved. **Nothing has been pushed.**

## What changed

| Area | What you will see |
| --- | --- |
| Poké Lab | Learn, the roadmap and plant demo remain. Flashcards now use the illustrated laboratory room. |
| Flashcards | I Remembered and Practise Again remain. Hard returns a card later in the round. |
| Study timer | One shared timer across Learn and Flashcards. Leaving Lab pauses it; returning lets you resume. |
| Poké Arena | New battle scenery around the existing database-backed question previews. Topic selection and the Arena entrance transition remain. |
| Optional Boss Practice | Start it yourself from Flashcards. It uses the deck's public answers. Finishing or leaving early preserves your deck and paused timer, regardless of the result. |
| Tutorial and navigation | Replay Tutorial is available in the Town profile menu. The tutorial waits for the initial weather-location choice. Navigation, import casing and mobile layout issues were corrected. |

**Your existing database content was preserved:** 18 Science topics, 231 flashcards and 259 questions. No SQL, reseeding or database writes were performed.

## Quick testing checklist

- [ ] Log in and check your saved name/avatar in Town and Trainer House.
- [ ] Open Learn, use the roadmap, switch the plant's water supply, and finish a topic.
- [ ] Switch to Flashcards. Try all three ratings, complete the deck and restart it.
- [ ] Start the timer, switch between Learn and Flashcards, then leave Lab and check that it pauses.
- [ ] Try Optional Boss Practice. Return early and after a full round; check that card progress and remaining time are preserved.
- [ ] Open Arena from the Lab header and completion screens. Check the selected topic and browser Back behavior.
- [ ] Replay the tutorial; try Next, Back, Skip and Escape.
- [ ] Try a narrow/mobile window and check readable content and reachable buttons.

## Expected behavior and limits

- **Start Quiz remains disabled** until secure grading is implemented. Question previews work; optional practice saves no assessment grade or XP.
- **Reduced Motion skips the Arena animation.** With it off, the entrance lasts about two seconds.
- Dashboard statistics, Pokémon collection and pack inventory still include sample data.
- Live signed-in Supabase access is part of your manual testing. Automated browser checks used mocked auth/content.

**Checks passed:** 231 unit/integration tests, 29 Chrome browser tests and the production build. Seven pre-existing lint errors remain in unchanged files.

[Detailed merge report, backup information and screenshots](design-merge-report.md)
