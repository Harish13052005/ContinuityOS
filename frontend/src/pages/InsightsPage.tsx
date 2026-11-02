import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'

export const InsightsPage = () => {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const projResponse = await api.projects.list()
        setProjects(projResponse.data)
      } catch (err: any) {
        setError(err.message || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      loadData()
    }
  }, [user])

  if (loading) {
    return <div>Loading insights...</div>
  }

  if (error) {
    return <div className="bg-red-50 p-4 rounded">{error}</div>
  }

  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Insights</h2>

      {projects.length === 0 && (
        <p className="text-slate-500">No projects yet. <Link to="/projects/create" className="font-medium text-indigo-600 underline">Create a project</Link> to get started.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="bg-white rounded-lg p-6 hover:bg-slate-50 transition-colors border border-slate-200"
          >
            <h3 className="text-lg font-medium text-slate-900">{project.name}</h3>
            <p className="text-slate-500 text-sm mt-1">{project.description || 'No description'}</p>
            <p className="text-slate-400 text-sm">Members: {project.members?.length || 0}</p>
            <Link
              to={`/projects/${project.id}`}
              className="mt-3 inline-flex items-center gap-2 text-indigo-600 rounded border border-indigo-600 px-3 py-1 text-sm hover:bg-indigo-50 transition-colors"
            >
              View
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 13l4 4L19 7" />
              </svg>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}