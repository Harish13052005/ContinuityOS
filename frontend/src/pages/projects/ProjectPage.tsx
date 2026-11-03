import { useEffect, useState } from 'react'
import { api, type Project, type Source } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useNavigate, useParams } from 'react-router-dom'

export const ProjectPage = () => {
  const { user } = useAuth()
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProject = async () => {
      try {
        const projectResp = await api.projects.get(projectId!)
        setProject(projectResp.data)
        const sourcesResp = await api.sources.list(projectId!)
        setSources(sourcesResp.data.sources)
      } catch (err: any) {
        setError(err.message || 'Failed to load project')
        navigate('/projects')
      } finally {
        setLoading(false)
      }
    }

    if (user && projectId) {
      loadProject()
    }
  }, [user, projectId])

  if (loading) {
    return <p className="text-slate-600">Loading project...</p>
  }

  if (error) {
    return <p className="text-red-600">{error}</p>
  }

  if (!project) {
    return <p className="text-slate-500">Project not found.</p>
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">{project.name}</h2>

      <div className="bg-slate-50 rounded-lg p-4">
        <p className="text-slate-500 text-sm">{project.description || 'No description'}</p>
      </div>

      <h3 className="text-lg font-medium text-slate-900 mb-3">Sources ({sources.length})</h3>

      {sources.length === 0 && (
        <p className="text-slate-500">No sources uploaded yet.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sources.map((source) => (
          <div
            key={source.id}
            className="bg-white rounded-lg p-3 border border-slate-200 hover:border-indigo-200 transition-colors"
          >
            <div className="text-sm text-slate-500">{source.filename}</div>
            <div className="text-xs text-slate-400 mt-1">{source.source_type}</div>
          </div>
        ))}
      </div>

      <a
        href="/projects/create"
        className="mt-3 inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        Add Source
      </a>
    </div>
  )
}
