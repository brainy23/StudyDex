import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { execFileSync } from 'node:child_process'
import process from 'node:process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const baseline = 'bc7ef4ab244d2860758b43eb28136a1c39d4e2ab'
const modified = [
  'src/views/studyView.vue',
  'src/components/timer/useTimer.js',
  'src/router/__tests__/flow.spec.js',
]
const created = [
  'src/assets/study.css',
  'src/components/study/StudyFlashcards.vue',
  'src/components/study/StudyImage.vue',
  'src/components/study/StudyLearn.vue',
  'src/components/study/StudyQuestion.vue',
  'src/components/study/StudyQuiz.vue',
  'src/components/study/StudyTimerPanel.vue',
  'src/components/study/__tests__/StudyFlashcards.spec.js',
  'src/components/timer/__tests__/useTimer.spec.js',
  'src/composables/useFlashcardReview.js',
  'src/composables/__tests__/useFlashcardReview.spec.js',
  'src/services/studyService.js',
  'src/services/__tests__/studyService.spec.js',
  'src/test/studyFixtures.js',
  'src/views/__tests__/StudyView.spec.js',
]

if (process.argv.slice(2).some((argument) => argument !== '--apply')) {
  throw new Error('Usage: node scripts/revert-studydeck.mjs [--apply]')
}

// Resolve all originals before changing anything; prefer the self-contained copy.
const originals = modified.map((file) => {
  const snapshot = join(root, '.studydeck-backup.local', `${file}.snapshot`)
  const content = existsSync(snapshot)
    ? readFileSync(snapshot)
    : execFileSync('git', ['show', `${baseline}:${file}`], { cwd: root })
  return { file, content }
})

console.log(`StudyDeck rollback baseline: ${baseline}`)
console.log('Restore original files:\n' + modified.map((file) => `  ${file}`).join('\n'))
console.log('Archive new feature files:\n' + created.map((file) => `  ${file}`).join('\n'))
console.log('This never changes Git history, the database, account settings, or other pages.')

if (!process.argv.includes('--apply')) {
  console.log('\nPreview only. To restore: node scripts/revert-studydeck.mjs --apply')
} else {
  const backup = join(
    root,
    `.studydeck-reverted-${new Date().toISOString().replaceAll(':', '-')}.local`,
  )
  for (const file of [...modified, ...created]) {
    const source = join(root, file)
    if (!existsSync(source)) continue
    const destination = join(backup, `${file}.snapshot`)
    mkdirSync(dirname(destination), { recursive: true })
    if (modified.includes(file)) copyFileSync(source, destination)
    else renameSync(source, destination)
  }
  for (const { file, content } of originals) writeFileSync(join(root, file), content)
  console.log(`\nOriginal prototype restored. The current implementation was saved in ${backup}`)
  console.log('The implementation notes, SQL proposal, and this rollback script are retained.')
}
