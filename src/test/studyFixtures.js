// Synthetic test fixtures only. Production content always comes from Supabase.
export const studentProfile = {
  id: 'student-ash',
  display_name: 'Ash',
  avatar_choice: 'female',
  school_level_id: 'level-3',
  school_level: { id: 'level-3', name: 'Primary 3', level_number: 3 },
}
export const studyCatalogue = {
  subjects: [
    { id: 'maths', name: 'Mathematics' },
    { id: 'science', name: 'Science' },
  ],
  topics: [
    {
      id: 'topic-1',
      level_id: 'level-3',
      subject_id: 'maths',
      name: 'Test topic',
      description: 'A test lesson description.',
      topic_order: 1,
    },
  ],
}
export const studyLesson = {
  goals: Array.from({ length: 5 }, (_, index) => ({
    id: `goal-${index}`,
    goal_text: `Learning goal ${index + 1}`,
    goal_order: index + 1,
  })),
  concepts: Array.from({ length: 7 }, (_, index) => ({
    id: `concept-${index}`,
    title: `Concept ${index + 1}`,
    explanation_text: `Explanation ${index + 1}`,
    example_text: `Worked example ${index + 1}`,
    concept_order: index + 1,
  })),
  questions: Array.from({ length: 7 }, (_, index) => ({
    id: `question-${index}`,
    concept_id: `concept-${index}`,
    question_purpose: 'quick_check',
    question_text: `Check concept ${index + 1}`,
    question_type: 'mcq',
    options: [0, 1].map((option) => ({
      id: `option-${index}-${option}`,
      option_text: `Choice ${option + 1}`,
      option_order: option + 1,
    })),
  })),
  errors: {},
}
export const bossQuestions = studyLesson.questions.slice(0, 2).map((question) => ({
  ...question,
  id: `boss-${question.id}`,
  question_purpose: 'boss_battle',
}))

// Shape/size fixtures for QA, never imported by production components or services.
export const revisionCards = Array.from({ length: 15 }, (_, index) => ({
  id: `flashcard-${index + 1}`,
  topic_id: 'topic-1',
  concept_id: `concept-${index % 7}`,
  front_text: `Fixture question ${index + 1}`,
  back_text: `Fixture answer ${index + 1}`,
  front_image_path: null,
  back_image_path: null,
  card_order: index + 1,
}))
