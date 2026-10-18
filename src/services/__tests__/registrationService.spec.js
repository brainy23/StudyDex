import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerUser, validateRegistration } from '../registrationService'

const { signUp } = vi.hoisted(() => ({ signUp: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ getSupabase: () => ({ auth: { signUp } }) }))

const valid = {
  email: ' learner@example.edu.sg ',
  displayName: ' Ash ',
  schoolLevel: 'p3',
  avatarChoice: 'male',
  password: 'Password123 ',
  confirmPassword: 'Password123 ',
}

describe('registration', () => {
  beforeEach(() => signUp.mockReset())

  it('passes the profile metadata to Auth and preserves the exact password', async () => {
    signUp.mockResolvedValue({ data: { user: { id: 'new-user' }, session: null }, error: null })
    await expect(registerUser(valid)).resolves.toEqual({ needsEmailConfirmation: true })
    expect(signUp).toHaveBeenCalledWith({
      email: 'learner@example.edu.sg',
      password: 'Password123 ',
      options: {
        data: { display_name: 'Ash', school_level_number: 3, avatar_choice: 'male' },
        emailRedirectTo: expect.stringMatching(/\/register$/),
      },
    })
  })

  it('handles signup when confirmation is disabled', async () => {
    signUp.mockResolvedValue({
      data: { user: { id: 'new-user' }, session: { access_token: 'token' } },
      error: null,
    })
    await expect(registerUser(valid)).resolves.toEqual({ needsEmailConfirmation: false })
  })

  it.each([
    { email: 'invalid' },
    { displayName: '   ' },
    { displayName: 'a'.repeat(81) },
    { schoolLevel: 'p7' },
    { avatarChoice: '' },
    { avatarChoice: 'unsupported' },
    { password: 'abc123' },
    { confirmPassword: 'Password123' },
  ])('rejects invalid fields before contacting Supabase: %j', async (patch) => {
    const fields = { ...valid, ...patch }
    expect(validateRegistration(fields)).not.toBe('')
    await expect(registerUser(fields)).rejects.toThrow()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('surfaces Auth errors for the page to display', async () => {
    signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: new Error('Too many requests'),
    })
    await expect(registerUser(valid)).rejects.toThrow('Too many requests')
  })
})

it.each(['male', 'female', 'prefer_not_to_say'])(
  'preserves the %s avatar choice in signup',
  async (avatarChoice) => {
    signUp.mockResolvedValue({ data: { user: { id: 'new-user' }, session: null }, error: null })
    await registerUser({ ...valid, avatarChoice })
    expect(signUp).toHaveBeenLastCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: expect.objectContaining({ avatar_choice: avatarChoice }),
        }),
      }),
    )
  },
)
