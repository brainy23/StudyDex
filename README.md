# StudyDex
WAD2 Group Project

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