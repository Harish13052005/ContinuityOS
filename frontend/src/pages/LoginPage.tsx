import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

export const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.auth.login({ username: email, password: password })
      localStorage.setItem('token', response.data.token)
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-lg p-8 sm:p-10 max-w-md w-full shadow-md animate-fade-in">
          <div className="animate-spin rounded-full border-4 border-indigo-200 border-t-4 w-12 h-12 mx-auto mb-4"></div>
          <p className="text-center text-slate-600 mb-4">Signing in...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-lg p-8 sm:p-10 max-w-md w-full shadow-md animate-fade-in">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Welcome Back</h2>
        <p className="text-slate-500 mb-6">Sign in to continue your project knowledge handover</p>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded mb-4">
            <p className="font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={e => { e.preventDefault(); handleLogin() }} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-indigo-600 text-white font-medium rounded hover:bg-indigo-700 transition-colors"
          >
            Sign In
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-slate-500">
          Don't have an account? <a href="/register" className="font-medium text-indigo-600 underline">Sign up</a>
        </p>
      </div>
    </div>
  )
}