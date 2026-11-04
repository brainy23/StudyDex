import { expect, it } from 'vitest'
import { filterStudentCatalogue, studentLevelNumber } from '../studyCatalogue'

const subjects = [
  { id: 'math', name: 'mathematics' },
  { id: 'science', name: 'science' },
  { id: 'english', name: 'English' },
]
const topics = Array.from({ length: 6 }, (_, index) => index + 1).flatMap((level) =>
  subjects.map((subject) => ({
    id: `${subject.id}-${level}`,
    subject_id: subject.id,
    level_id: `level-${level}`,
  })),
)
const profile = (level) => ({
  school_level_id: `level-${level}`,
  school_level: { level_number: level, name: `Primary ${level}` },
})

it.each([1, 2, 3, 4, 5, 6])('only includes the saved P%s level and supported subjects', (level) => {
  const result = filterStudentCatalogue({ subjects, topics }, profile(level))
  expect(result.topics.every((topic) => topic.level_id === `level-${level}`)).toBe(true)
  expect(result.subjects.map((subject) => subject.id)).toEqual(
    level < 3 ? ['math'] : ['math', 'science'],
  )
  expect(result.topics).toHaveLength(level < 3 ? 1 : 2)
})
it('does not invent missing subjects or show subjects without topics', () => {
  const result = filterStudentCatalogue(
    { subjects, topics: topics.filter((topic) => topic.subject_id === 'math') },
    profile(3),
  )
  expect(result.subjects.map((subject) => subject.id)).toEqual(['math'])
})
it('fails closed for missing/invalid level data and reads legacy profile level names', () => {
  for (const value of [null, {}, profile(7)]) {
    expect(filterStudentCatalogue({ subjects, topics }, value)).toEqual({
      subjects: [],
      topics: [],
    })
  }
  expect(studentLevelNumber({ school_level: { name: 'Primary 1' } })).toBe(1)
  expect(studentLevelNumber({ school_level: { name: 'P6' } })).toBe(6)
})
