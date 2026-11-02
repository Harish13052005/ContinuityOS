import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export const Sidebar = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const menus = [
    { name: 'Dashboard', href: '/', icon: '📊' },
    { name: 'Projects', href: '/projects', icon: '📁' },
    { name: 'Sources', href: '/sources', icon: '📄' },
    { name: 'Insights', href: '/insights', icon: '💡' },
    { name: 'Handovers', href: '/handovers', icon: '📋' },
    { name: 'Settings', href: '/settings', icon: '⚙️' },
  ]

  return (
    <aside className="bg-white h-screen border-r border-slate-200 shadow-sm sticky left-0 top-0 z-10 max-w-sidebar transform transition-transform duration-300 sm:translate-x-0 sm:translate-x-lg-0">
      <div className="p-4 sm:p-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="flex-1 pr-2">
            <h2 className="font-medium text-sm text-slate-900 truncate">ContinuityOS</h2>
            <p className="text-xs text-slate-500">{user?.full_name || ''}</p>
          </div>
        </div>
      </div>

      <nav className="px-4 sm:px-6">
        <ul className="space-y-1 sm:space-y-2">
          {menus.map((menu) => (
            <li key={menu.href} className="group">
              <a
                href={menu.href}
                className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 group-hover:text-indigo-600 transition-colors sm:flex sm:items-center sm:gap-3"
              >
                <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0">{menu.icon}</span>
                <span className="ml-2 flex-1 truncate">{menu.name}</span>
                {menu.href === window.location.pathname ? (
                  <svg className="w-3.5 h-3.5 shrink-0 -ml-1.5 text-indigo-600 group-hover:text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                ) : null}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 sm:p-6 border-t border-slate-200">
        <button
          onClick={() => navigate('/login')}
          className="w-full text-sm font-medium text-indigo-600 underline"
        >
          Sign Out
        </button>
      </div>
    </aside>
  )
}