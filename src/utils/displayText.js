// Presentation only: never use these values in identifiers, filters or saved data.
const smallWords = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with'])

export function displayTitle(value = '') {
  const words = String(value ?? '').trim().split(/\s+/)
  return words.map((word, index) => {
    if (index > 0 && index < words.length - 1 && smallWords.has(word.toLowerCase())) {
      return word.toLowerCase()
    }
    return word.replace(/(^|[-–(])\p{L}/gu, (letter) => letter.toUpperCase())
  }).join(' ')
}
