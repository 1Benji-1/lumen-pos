import type { ReactNode } from 'react'
import { act, render } from '@testing-library/react'
import { useQueryClient } from '@tanstack/react-query'
import { expect, it, vi } from 'vitest'
const f = vi.hoisted(() => ({ callbacks: [] as ((event: string, session: unknown) => void)[] }))
vi.mock('../../shared/lib/supabaseClient', () => ({ supabase: { auth: { onAuthStateChange: (cb: (event: string, session: unknown) => void) => { f.callbacks.push(cb); return { data: { subscription: { unsubscribe() {} } } } } } } }))
vi.mock('../../../../admin/src/shared/lib/supabaseClient', () => ({ supabase: { auth: { onAuthStateChange: (cb: (event: string, session: unknown) => void) => { f.callbacks.push(cb); return { data: { subscription: { unsubscribe() {} } } } } } } }))
vi.mock('../../../../admin/src/shared/context/ToastContext', () => ({ ToastProvider: ({ children }: { children: ReactNode }) => children }))
vi.mock('../../../../admin/src/shared/context/ThemeContext', () => ({ ThemeProvider: ({ children }: { children: ReactNode }) => children }))
import { AppProviders as WebProviders } from '../../app/providers/AppProviders'
import { AppProviders as AdminProviders } from '../../../../admin/src/app/providers/AppProviders'

it.each([['web', WebProviders], ['admin', AdminProviders]] as const)('%s clears cached tenant queries on account changes', (_name, Providers) => {
  let client: ReturnType<typeof useQueryClient>
  function Child() { client = useQueryClient(); return null }
  f.callbacks = []
  const view = render(<Providers><Child /></Providers>)
  expect(f.callbacks).toHaveLength(1)
  act(() => f.callbacks[0]('SIGNED_IN', { user: { id: 'a' } }))
  client!.setQueryData(['products', 'store-a'], ['secret'])
  act(() => f.callbacks[0]('SIGNED_IN', { user: { id: 'b' } }))
  expect(client!.getQueryData(['products', 'store-a'])).toBeUndefined()
  client!.setQueryData(['admin-data'], ['private'])
  act(() => f.callbacks[0]('SIGNED_OUT', null))
  expect(client!.getQueryData(['admin-data'])).toBeUndefined()
  view.unmount()
})
