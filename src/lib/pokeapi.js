const baseUrl = (import.meta.env.VITE_POKE_API_URL || 'https://pokeapi.co/api/v2').replace(
  /\/+$/,
  '',
)

export function pokemonUrl(name) {
  return `${baseUrl}/pokemon/${encodeURIComponent(name.toLowerCase())}`
}
