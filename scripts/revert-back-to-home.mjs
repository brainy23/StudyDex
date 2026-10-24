import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const root = fileURLToPath(new URL('../', import.meta.url))
const backup = join(root, '.back-home-backup.local')
const modified = [
  'src/views/AccountView.vue',
  'src/views/studyView.vue',
  'src/views/quizView.vue',
  'src/views/TrainerView.vue',
  'src/views/dashboardView.vue',
  'src/views/rewardsView.vue',
  'src/router/__tests__/flow.spec.js',
]
const created = ['src/components/common/BackToHome.vue']
const hash = (content) => createHash('sha256').update(content).digest('hex')
const currentHash = (file) => existsSync(join(root, file)) ? hash(readFileSync(join(root, file))) : null

if (process.argv.slice(2).some((argument) => argument !== '--apply')) {
  throw new Error('Usage: node scripts/revert-back-to-home.mjs [--apply]')
}
if (!existsSync(join(backup, 'manifest.json'))) {
  throw new Error('The local Back to Town backup is missing. No files were changed.')
}
const manifest = JSON.parse(readFileSync(join(backup, 'manifest.json'), 'utf8'))
const originals = modified.map((file) => {
  const content = readFileSync(join(backup, `${file}.snapshot`))
  if (hash(content) !== manifest.before[file]) {
    throw new Error(`Backup verification failed for ${file}. No files were changed.`)
  }
  return { file, content }
})

if (modified.every((file) => currentHash(file) === manifest.before[file]) && created.every((file) => currentHash(file) === null)) {
  console.log('Shared Back to Town navigation has already been reverted. No files were changed.')
  process.exit(0)
}
const changed = [...modified, ...created].filter((file) => currentHash(file) !== manifest.after[file])
if (changed.length) {
  throw new Error(`These files changed after the navigation update:\n${changed.join('\n')}\nNo files were changed. Review later edits before restoring the snapshots.`)
}

console.log('Restore the versions saved immediately before shared home navigation:')
modified.forEach((file) => console.log(`  ${file}`))
console.log('Archive the new component:')
created.forEach((file) => console.log(`  ${file}`))
console.log('Earlier avatar, weather and Flashcards changes are preserved. Git history and the database are untouched.')
if (!process.argv.includes('--apply')) {
  console.log('\nPreview only. To restore: node scripts/revert-back-to-home.mjs --apply')
  process.exit(0)
}

const archive = join(root, `.back-home-reverted-${new Date().toISOString().replaceAll(':', '-')}.local`)
for (const file of [...modified, ...created]) {
  const destination = join(archive, `${file}.snapshot`)
  mkdirSync(dirname(destination), { recursive: true })
  if (created.includes(file)) renameSync(join(root, file), destination)
  else copyFileSync(join(root, file), destination)
}
for (const { file, content } of originals) writeFileSync(join(root, file), content)
console.log(`\nPrevious navigation restored. The current files were saved in ${archive}`)
console.log('The rollback script, documentation and original snapshots were retained.')
