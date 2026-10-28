# StudyDex team testing

Use branch **`integration/user-registration`** for this feedback round.

## Get the app running

Start with your own work committed or stashed, then run:

```sh
git fetch origin
git switch integration/user-registration
git pull --ff-only
pnpm install --frozen-lockfile
```

If you do not already have `.env.local`, create it from `.env.example` and fill in
the shared test project's Supabase URL and publishable key. Keep this file local.
Use a Node version supported by `package.json`, then start the app:

```sh
pnpm dev
```

Open the address printed by Vite. Log in, then choose Start to enter Town. Use a
profile with a school level that has test content. The shared database currently
has limited test content, so some subjects or question banks may be empty.

## Try these flows

1. **Town and weather:** choose a location option, visit another page, then return
   to Town. The app should remember the choice until a full page reload.
2. **Avatar sync:** change the avatar in Trainer House's wardrobe, return to Town,
   then open Edit Profile. Check that the saved avatar matches. Try the reverse
   direction too. The Trainer House door returns to Town.
3. **Poké Lab:** open the overview and learning goals, then read concepts and worked
   examples. There should be no MCQs or True/False checks. Use Previous, Next and the
   concept roadmap, and check capitalization and concept progress.
4. **Flashcards:** reveal the answer, then use I Remembered or Practise Again. Complete
   the deck and check unique remembered cards, total attempts and Restart Deck. Start
   the study timer and check that mode changes keep it running; leaving Lab pauses it.
5. **Finish Topic:** on the final concept, choose Finish Topic. Review with Flashcards
   opens the same topic. Go to Poké Arena preselects that topic's regular quiz. Neither
   action submits a quiz, grants XP or forces a navigation choice.
6. **Arena navigation:** enter directly from Town, Learn completion and Flashcard
   completion. Learn completion is not a prerequisite. Check the selected topic_id.
   Missing regular quiz questions show an unavailable state; Boss Battles stay separate.
   Start Quiz remains disabled until secure grading is implemented. If questions exist,
   Preview Questions explicitly opens the ungraded choices. Review Entire Topic returns
   to the topic overview; Revise in Poké Lab opens that topic's Flashcards.
7. **Revise Another Topic:** complete Flashcards and return to topic selection. The saved
   school level stays the same. Choose another populated topic when available, or check
   the no-other-topics message and revisit/restart the existing deck. Check desktop and
   narrow layouts. Concept review links should open the requested matching concepts;
   they do not prove weakness or imply that a real failed quiz exists.
8. **Logout:** log out from Town, then try reopening a protected page. The app
   should require login again.

## Expected limitations

- Reading completion is saved per student and school level in this browser. It
  survives reloads but does not sync across devices and does not gate quizzes.
- Lesson position, Flashcard revision and Arena answer choices are visit-only.
- Arena is an assessment preview. Secure grading, saved attempts, scores and
  XP/rewards are pending. Reviewing choices does not submit a quiz.
- Missing published content is shown honestly; the app does not generate quizzes
  when a topic is completed.
- Town inventory/XP, pack counts and dashboard statistics still include prototype
  data. Trainer House buddy preview is separate from saved profile avatar changes.
- No database setup or SQL execution is part of checking out this branch. Any
  database changes need separate review and approval.

## Give useful feedback

Include the page/route, topic, steps taken, expected behavior, actual behavior,
browser and window size. Screenshots are helpful for layout issues. Leave out
passwords, confirmation links and authentication tokens.

## Automated checks

```sh
pnpm exec vitest run
pnpm run build
```

Current verification, changed files and grading blockers are recorded in
[learning-flow-test-report.md](learning-flow-test-report.md). The build retains existing
large-bundle warnings. The opt-in live Flashcard suite is described in the historical
[flashcards-test-report.md](flashcards-test-report.md); its controls now use I Remembered
and Practise Again.
