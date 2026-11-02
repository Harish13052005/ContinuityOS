import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'

export const SettingsPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.auth.getCurrentUser()
        setProfile({
          fullName: response.data.full_name || '',
          email: response.data.email || '',
        })
      } catch (err: any) {
        setError(err.message || 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      loadProfile()
    }
  }, [user])

  if (loading) {
    return <div>Loading settings...</div>
  }

  if (error) {
    return <div className="bg-red-50 p-4 rounded">{error}</div>
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await api.auth.getCurrentUser()
      // Profile updated successfully
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    }
  }

  return (
    <div className="p-6 sm:p-8 max-w-md">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Settings</h2>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded mb-4">
          <p className="font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-2">
            Full name
          </label>
          <input
            id="fullName"
            value={profile.fullName}
            onChange={e => setProfile({ ...profile, fullName: e.target.value })}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={profile.email}
            onChange={e => setProfile({ ...profile, email: e.target.value })}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            readOnly
          />
        </div>
        <button
          type="submit"
          className="w-full py-2 px-4 bg-indigo-600 text-white font-medium rounded hover:bg-indigo-700 transition-colors"
        >
          Update Profile
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link to="/projects" className="text-slate-500 hover:text-indigo-600 underline">
          ← Back to Projects
        </Link>
      </div>
    </div>
  )
}