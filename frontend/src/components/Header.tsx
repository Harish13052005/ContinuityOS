import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'

export const Header = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await api.auth.getCurrentUser()
      } catch {
        localStorage.removeItem('token')
        navigate('/login')
      }
    }

    checkAuth()
  }, [navigate])

  if (loading) {
    return null
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-indigo-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="font-semibold text-lg">ContinuityOS</h1>
            <p className="text-sm text-slate-500">Knowledge Handover Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900">{user.full_name}</span>
              <span className="w-2.5 h-2.5 shrink-0 bg-slate-500 rounded-full" aria-hidden="true" />
            </div>
          ) : (
            <button onClick={() => navigate('/login')} className="text-sm font-medium text-indigo-600 underline">
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
