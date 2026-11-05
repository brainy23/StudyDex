import { beforeEach, expect, it, vi } from 'vitest'
import { checkedRpc } from '../backendClient'
const { getSession, getUser, rpc, header } = vi.hoisted(() => ({ getSession:vi.fn(), getUser:vi.fn(), rpc:vi.fn(), header:vi.fn() }))
vi.mock('../../lib/supabase', () => ({ getSupabase: () => ({ auth:{ getSession,getUser },rpc }) }))
beforeEach(() => {
  vi.resetAllMocks()
  getSession.mockResolvedValue({ data:{ session:{ access_token:'token-a',user:{ id:'account-a' } } } })
  getUser.mockResolvedValue({ data:{ user:{ id:'account-a' } } })
  header.mockReturnThis()
  rpc.mockReturnValue(Object.assign(Promise.resolve({ data:{ saved:true },error:null }), { setHeader:header }))
})
it('pins the verified account token to writes', async () => {
  await expect(checkedRpc('save', { value:1 }, 'account-a')).resolves.toEqual({ saved:true })
  expect(header).toHaveBeenCalledWith('Authorization','Bearer token-a')
})
it('refuses a stale owner before issuing a write', async () => {
  await expect(checkedRpc('save', {}, 'account-b')).rejects.toThrow('account changed')
  expect(rpc).not.toHaveBeenCalled()
})
it('discards an old account response after another account signs in', async () => {
  getSession.mockResolvedValueOnce({ data:{ session:{ access_token:'token-a', user:{ id:'account-a' } } } })
    .mockResolvedValueOnce({ data:{ session:{ user:{ id:'account-b' } } } })
  await expect(checkedRpc('save', {}, 'account-a')).rejects.toThrow('account changed')
  expect(header).toHaveBeenCalledWith('Authorization','Bearer token-a')
})
