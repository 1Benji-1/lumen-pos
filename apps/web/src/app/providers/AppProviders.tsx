import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../../shared/lib/supabaseClient'

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  useEffect(() => {
    let accountId: string | null = null
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextAccountId = session?.user.id ?? null
      if (nextAccountId !== accountId) {
        accountId = nextAccountId
        queryClient.clear()
      }
    })
    return () => { data.subscription.unsubscribe(); queryClient.clear() }
  }, [queryClient])
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  )
}