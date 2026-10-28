function normalise(value = '') {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

// Existing content names are the semantic key until the catalogue has demonstration slugs.
// Keep this explicit: unrelated lessons must never receive a guessed demonstration.
export function interactiveConceptKind(topic, concept) {
  if (
    normalise(topic?.name) === 'diversity of living and non living things' &&
    normalise(concept?.title) === 'what living things need'
  )
    return 'plant-water'
  return null
}
