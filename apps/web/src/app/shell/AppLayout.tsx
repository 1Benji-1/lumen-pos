import { Outlet, useLocation } from 'react-router-dom'
import { NavigationHeader } from './NavigationHeader'
import { AppSidebar } from './AppSidebar'

export function AppLayout() {
  const location = useLocation()
  const isDocs = location.pathname.startsWith('/docs')

  return (
    <div className="min-h-screen bg-[#E8EDDF] text-[#242423] flex flex-col font-sans">
      <NavigationHeader />
      <div className="flex-1 flex relative">
        {!isDocs && <AppSidebar />}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
