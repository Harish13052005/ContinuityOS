import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

export const Dashboard = () => {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await api.projects.list()
        setProjects(response.data)
      } catch (err: any) {
        setError(err.message || 'Failed to load projects')
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      loadProjects()
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 sm:p-12">
        <div className="animate-spin rounded-full border-4 border-indigo-200 border-t-4 sm:w-8 sm:h-8 mx-auto mb-4"></div>
        <p className="text-slate-600">Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6">
        <p className="font-medium">{error}</p>
      </div>
    )
  }

  return null
}