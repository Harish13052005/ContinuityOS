import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'

export const ProjectsList = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
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
      <div className="p-6 sm:p-8">
        <div className="animate-spin rounded-full border-4 border-indigo-200 border-t-4 w-8 h-8 mb-4"></div>
        <p className="text-slate-600">Loading projects...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-4">
        <p className="font-medium">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!projects.length && (
        <p className="text-slate-500 text-sm">No projects found. <Link to="/projects/create" className="font-medium text-indigo-600 underline">Create your first project</Link></p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="bg-white rounded-lg p-6 hover:bg-slate-50 transition-colors border border-slate-200"
          >
            <h3 className="text-lg font-medium text-slate-900 line-clamp-2">{project.name}</h3>
            <p className="text-slate-500 text-sm line-clamp-1 mt-1">{project.description || 'No description'}</p>
            <div className="mt-3 flex items-center gap-2 text-slate-400 text-sm">
              <span>{project.members?.length || 0} members</span>
            </div>
            <Link
              to={`/projects/${project.id}`}
              className="mt-3 inline-flex items-center text-indigo-600 rounded border border-indigo-600 px-3 py-1 text-sm hover:bg-indigo-50 transition-colors"
            >
              View Project
              <svg className="w-3 h-3 ml-1" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 13l4 4L19 7" />
              </svg>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}