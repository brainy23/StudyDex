
import { ref, watch } from 'vue'

const STORAGE_KEY = 'studydex-admin-quizzes'

function copyData(value) {
  return JSON.parse(JSON.stringify(value))
}

function makeQuestion(
  id,
  questionText,
  optionTexts,
  correctIndex,
  explanation,
  difficulty = 1
) {
  const options = optionTexts.map((text, index) => ({
    id: `${id}-option-${index + 1}`,
    question_id: id,
    option_text: text,
    option_order: index + 1
  }))

  return {
    id,
    question_text: questionText,
    question_type:
      optionTexts.length === 2 ? 'true_false' : 'mcq',
    difficulty,
    question_purpose: 'quiz',
    concept_id: null,
    options,
    answer: {
      question_id: id,
      correct_option_id: options[correctIndex].id,
      explanation
    }
  }
}

// ========================================
// LOCAL SAMPLE QUIZZES
// ========================================

const initialQuizzes = [
  {
    id: 1,
    title: 'Fractions Challenge',
    subject: 'Mathematics',
    level: 'P4',
    topic: 'Fractions',
    topic_id: 'math-p4-01',
    active: true,
    questions: [
      makeQuestion(
        'q-1-1',
        'What is 1/2 + 1/4?',
        ['1/4', '2/6', '3/4', '1'],
        2,
        'Convert 1/2 into 2/4, then add 1/4 to get 3/4.',
        2
      ),
      makeQuestion(
        'q-1-2',
        'Which fraction is equivalent to 1/2?',
        ['2/3', '3/6', '1/3', '3/4'],
        1,
        '3/6 simplifies to 1/2.',
        1
      ),
      makeQuestion(
        'q-1-3',
        '3/4 is greater than 1/2.',
        ['True', 'False'],
        0,
        '3/4 is equivalent to 0.75, while 1/2 is 0.5.',
        1
      )
    ]
  },
  {
    id: 2,
    title: 'Living Things Quiz',
    subject: 'Science',
    level: 'P3',
    topic: 'Diversity of Living and Non-Living Things',
    topic_id: 'sci-p3-01',
    active: true,
    questions: [
      makeQuestion(
        'q-2-1',
        'Which of these is a living thing?',
        ['Rock', 'Mushroom', 'Water', 'Chair'],
        1,
        'A mushroom is a living organism that grows and reproduces.',
        1
      ),
      makeQuestion(
        'q-2-2',
        'Living things can grow and reproduce.',
        ['True', 'False'],
        0,
        'Growth and reproduction are characteristics of living things.',
        1
      ),
      makeQuestion(
        'q-2-3',
        'Which characteristic helps distinguish living things from non-living things?',
        [
          'Having colour',
          'Taking up space',
          'Reproducing',
          'Having mass'
        ],
        2,
        'Living things can reproduce, unlike non-living objects.',
        2
      )
    ]
  },
  {
    id: 3,
    title: 'Forces & Motion',
    subject: 'Science',
    level: 'P6',
    topic: 'Forces',
    topic_id: 'sci-p6-02',
    active: false,
    questions: [
      makeQuestion(
        'q-3-1',
        'Which force pulls objects towards Earth?',
        [
          'Friction',
          'Gravity',
          'Magnetism',
          'Elastic spring force'
        ],
        1,
        'Gravity pulls objects towards Earth.',
        1
      ),
      makeQuestion(
        'q-3-2',
        'Friction always makes moving objects speed up.',
        ['True', 'False'],
        1,
        'Friction opposes the relative motion of surfaces in contact.',
        2
      )
    ]
  },
  {
    id: 4,
    title: 'Area and Perimeter',
    subject: 'Mathematics',
    level: 'P5',
    topic: 'Area and Perimeter',
    topic_id: 'math-p5-01',
    active: true,
    questions: [
      makeQuestion(
        'q-4-1',
        'What is the area of a rectangle measuring 6 cm by 4 cm?',
        ['10 cm²', '20 cm²', '24 cm²', '28 cm²'],
        2,
        'Area = length × width = 6 × 4 = 24 cm².',
        2
      ),
      makeQuestion(
        'q-4-2',
        'What is the perimeter of a square with sides of 5 cm?',
        ['10 cm', '15 cm', '20 cm', '25 cm'],
        2,
        'A square has four equal sides, so its perimeter is 4 × 5 = 20 cm.',
        1
      )
    ]
  },
  {
    id: 5,
    title: 'Plant Systems',
    subject: 'Science',
    level: 'P3',
    topic: 'Plant Parts and Their Functions',
    topic_id: 'sci-p3-04',
    active: false,
    questions: [
      makeQuestion(
        'q-5-1',
        'Which plant part absorbs water from the soil?',
        ['Flower', 'Leaf', 'Root', 'Fruit'],
        2,
        'Roots absorb water and mineral salts from the soil.',
        1
      ),
      makeQuestion(
        'q-5-2',
        'The stem helps support a plant.',
        ['True', 'False'],
        0,
        'The stem supports the plant and helps transport substances.',
        1
      )
    ]
  }
]

// ========================================
// LOAD LOCAL DATA
// ========================================

function loadSavedQuizzes() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (saved) {
      const parsed = JSON.parse(saved)

      if (Array.isArray(parsed)) {
        return parsed
      }
    }
  } catch (error) {
    console.warn('Could not load saved quizzes:', error)
  }

  return copyData(initialQuizzes)
}

export const adminQuizzes = ref(loadSavedQuizzes())

// Automatically persist updates.
watch(
  adminQuizzes,
  (newValue) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(newValue)
      )
    } catch (error) {
      console.error('Could not save quizzes locally:', error)
    }
  },
  { deep: true }
)

// ========================================
// QUIZ FUNCTIONS
// ========================================

export function getAdminQuiz(id) {
  return adminQuizzes.value.find(
    quiz => String(quiz.id) === String(id)
  ) || null
}

export function saveAdminQuiz(updatedQuiz) {
  const index = adminQuizzes.value.findIndex(
    quiz => String(quiz.id) === String(updatedQuiz.id)
  )

  if (index === -1) return false

  // Safely copy Vue reactive data
  adminQuizzes.value[index] = copyData(updatedQuiz)

  return true
}

export function addAdminQuiz(newQuiz) {
  const exists = getAdminQuiz(newQuiz.id)

  if (exists) return false

  adminQuizzes.value.push(copyData(newQuiz))

  return true
}

export function toggleAdminQuiz(id) {
  const quiz = getAdminQuiz(id)

  if (!quiz) return false

  quiz.active = !quiz.active

  return true
}

export function resetSampleQuizzes() {
  adminQuizzes.value = copyData(initialQuizzes)
}
