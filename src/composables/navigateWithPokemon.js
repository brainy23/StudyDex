import { usePokemonTransition } from './usePokemonTransition'

export function navigateWithPokemon(router, target, presentation) {
  const expected = router.resolve(target).fullPath
  return usePokemonTransition().run({
    ...presentation,
    animate: true,
    task: async signal => {
      const failure = await router.push(target)
      if (signal.aborted) throw signal.reason
      if (failure || router.currentRoute.value.fullPath !== expected) {
        throw new Error('Navigation was interrupted. Please try again.')
      }
    },
  })
}
