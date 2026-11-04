export function isScienceSubject(name) {
  return /^science$/i.test(String(name || '').trim())
}

export function getSubjectTheme(name) {
  const normalized = String(name || '').trim().toLowerCase()
  if (isScienceSubject(normalized)) return 'purple'
  if (/^(math|maths|mathematics)$/.test(normalized)) return 'green'
  return 'gold'
}
