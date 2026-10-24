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
3. **Poké Lab:** open a topic and go through the overview, learning goals, concepts,
   examples and ungraded understanding checks. Check the centered header progress
   and the Quiz me! button on the right at desktop and smaller window sizes.
4. **Flashcards:** flip cards and use Again, Hard and Easy. Complete the deck and
   try Restart Deck. Start the study timer and check that changing learning modes
   keeps it running, while leaving Lab pauses it.
5. **Topic quiz:** choose Finish topic after the final concept. Quiz me! should
   become enabled and open that topic in Arena. If quiz questions exist, select
   answers and review the choices. Otherwise, an empty-bank message is expected.
6. **Arena navigation:** enter directly from Town. Unfinished topic quizzes should
   offer Study this topic. Boss Battles can be opened independently. Revise in
   Poké Lab returns to the selected topic's Flashcards.
7. **Multiple topics:** when two topics have content, complete both and check that
   their quizzes remain unlocked after switching topics or reviewing one quiz.
   The automated tests also cover this flow using two synthetic topics.
8. **Logout:** log out from Town, then try reopening a protected page. The app
   should require login again.

## Expected limitations

- Topic unlocks are saved per student and school level in this browser. They
  survive reloads but do not sync across devices; clearing site data removes them.
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

Before publishing, all **187 tests across 18 files** and the production build
passed. The build retains existing large-bundle warnings. Authenticated browser
testing remains for this feedback round; it has not been verified by the agent.
The opt-in Flashcard browser tests are documented separately in
[flashcards-test-report.md](flashcards-test-report.md).
