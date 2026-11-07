import { type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

function HomeIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  )
}

function StoreIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  )
}

function FeedbackIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  )
}

interface SidebarItemDef {
  id: string
  label: string
  path: string
  exact?: boolean
  icon: (props: { className?: string }) => ReactNode
}

const SIDEBAR_ITEMS: SidebarItemDef[] = [
  {
    id: 'dashboard',
    label: 'Inicio',
    path: '/',
    exact: true,
    icon: HomeIcon,
  },
  {
    id: 'stores',
    label: 'Tiendas',
    path: '/stores',
    icon: StoreIcon,
  },
  {
    id: 'feedback',
    label: 'Feedback',
    path: '/feedback',
    icon: FeedbackIcon,
  },
]

export function AdminSidebar() {
  return (
    <div className="w-[50px] shrink-0 relative z-30">
      <aside
        className="fixed top-[50px] left-0 bottom-0 w-[50px] hover:w-56 group/sidebar transition-[width] duration-300 ease-in-out bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col justify-between py-3 select-none overflow-x-hidden overflow-y-auto shadow-xs dark:shadow-[1px_0_4px_rgba(0,0,0,0.5)] hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-2xl dark:hover:shadow-black/80"
        aria-label="Sidebar de navegación Super Admin"
      >
        <div className="space-y-1 px-1">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.exact}
                className={({ isActive }) =>
                  `w-full flex items-center h-10 px-2.5 rounded-md transition-colors group/item relative focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500 dark:focus-visible:ring-zinc-400 ${
                    isActive
                      ? 'bg-zinc-900 dark:bg-zinc-800 text-white dark:text-zinc-50 font-semibold shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`
                }
                title={item.label}
                aria-label={item.label}
              >
                {({ isActive }) => (
                  <>
                    <div className="w-5 h-10 flex items-center justify-center shrink-0">
                      <Icon
                        className={`w-5 h-5 transition-colors ${
                          isActive
                            ? 'text-white dark:text-zinc-50'
                            : 'text-zinc-500 dark:text-zinc-400 group-hover/item:text-zinc-900 dark:group-hover/item:text-white'
                        }`}
                      />
                    </div>

                    <span className="text-xs whitespace-nowrap overflow-hidden opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-75 pl-3 pr-2 font-medium">
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </aside>
    </div>
  )
}

export default AdminSidebar
