import { useEffect } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

export default function App() {
  useEffect(() => {
    const token = localStorage.getItem('token')
    const location = useLocation()
    const navigate = useNavigate()

    if (!token) {
      // Redirect to login if not authenticated and trying to access protected routes
      if (
        location.pathname !== '/login' &&
        location.pathname !== '/register' &&
        !location.pathname.startsWith('/projects') &&
        location.pathname !== '/sources' &&
        location.pathname !== '/settings'
      ) {
        navigate('/login')
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-md bg-indigo-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-semibold">ContinuityOS</span>
            </div>
            <div className="flex items-center gap-3">
              {localStorage.getItem('token') ? (
                <button onClick={() => localStorage.removeItem('token')} onClick={() => navigate('/login')} className="px-4 py-2 text-sm font-medium text-indigo-600 rounded hover:bg-indigo-50">
                  Sign Out
                </button>
              ) : (
                <>
                  <a href="/login" className="px-4 py-2 text-sm font-medium text-indigo-600 rounded hover:bg-indigo-50">
                    Sign In
                  </a>
                  <a href="/register" className="px-4 py-2 text-sm font-medium text-indigo-600 rounded hover:bg-indigo-50">
                    Sign Up
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 p-4 sm:p-6">
        {/* Routes are handled in main.tsx */}
      </main>
    </div>
  )
}