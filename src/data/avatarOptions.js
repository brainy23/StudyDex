export const legacyAvatarOptions = [
  { value: 'male', label: 'Male', image: '/avatars/male.png', idleImage: '/avatars/male-idle.png' },
  {
    value: 'female',
    label: 'Female',
    image: '/avatars/female.png',
    idleImage: '/avatars/female-idle.png',
  },
  {
    value: 'prefer_not_to_say',
    label: 'Prefer not to say',
    image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/132.png',
    imageAlt: 'Ditto avatar',
  },
]

// New selections use the ten room styles; legacy values remain readable.
const styles = ['Classic', 'Explorer', 'Sporty', 'Scholar', 'Artist']
export const avatarOptions = styles.flatMap((style, index) =>
  ['female', 'male'].map((gender) => {
    const file = `${gender === 'female' ? 'girl' : 'boy'}_${index}`
    return {
      value: `${gender}-${index === 0 ? 'classic' : index}`,
      label: `${style} ${gender === 'female' ? 'girl' : 'boy'}`,
      gender,
      image: `/avatars/${file}.png`,
      head: `/heads/${file}-head.png`,
      idleImage: `/avatars/${index === 0 ? gender : file}-idle.png`,
    }
  }),
)

export function findAvatar(value) {
  return [...avatarOptions, ...legacyAvatarOptions].find((option) => option.value === value) || null
}
