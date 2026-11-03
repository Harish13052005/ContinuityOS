import { useEffect, useState } from 'react'
import { api, type Project } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useNavigate } from 'react-router-dom'

export const ProjectsPage = () => {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

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
    return <p className="text-slate-600">Loading projects...</p>
  }

  if (error) {
    return <p className="text-red-600">{error}</p>
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Projects</h2>

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/projects/create')}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Create Project
        </button>
      </div>

      {projects.length === 0 && (
        <p className="text-slate-500 text-sm">No projects yet. Create your first project.</p>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left text-sm font-medium text-slate-500 px-6 py-3">Name</th>
              <th className="text-left text-sm font-medium text-slate-500 px-6 py-3">Description</th>
              <th className="text-left text-sm font-medium text-slate-500 px-6 py-3">Members</th>
              <th className="text-left text-sm font-medium text-slate-500 px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">{project.name}</td>
                <td className="px-6 py-4 text-slate-500 text-truncate">{project.description || '-'}</td>
                <td className="px-6 py-4 text-slate-500 text-truncate">{project.members?.length || 0}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="underline text-indigo-600 text-sm hover:text-indigo-500"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
