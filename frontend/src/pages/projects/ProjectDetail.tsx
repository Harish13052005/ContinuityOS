import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'

export const ProjectDetail = () => {
  const { user } = useAuth()
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [sources, setSources] = useState([])
  const [extractedItems, setExtractedItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProject = async () => {
      try {
        // Load project
        const projResponse = await api.projects.get(projectId!)
        setProject(projResponse.data)

        // Load sources
        const sourcesResponse = await api.sources.list(projectId!)
        setSources(sourcesResponse.data.sources)

        // Load extracted items
        const itemsResponse = await api.extractedItems.list(projectId!)
        setExtractedItems(itemsResponse.data)
      } catch (err: any) {
        setError(err.message || 'Failed to load project')
        navigate('/projects')
      } finally {
        setLoading(false)
      }
    }

    if (projectId) {
      loadProject()
    }
  }, [projectId, user])

  if (loading) {
    return (
      <div className="p-6 sm:p-8">
        <div className="animate-spin rounded-full border-4 border-indigo-200 border-t-4 w-8 h-8 mb-4"></div>
        <p className="text-slate-600">Loading project...</p>
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

  if (!project) {
    return <p className="text-slate-500">Project not found</p>
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 sm:p-8 border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900">{project.name}</h2>
        {project.description && (
          <p className="text-slate-500 mt-1 line-clamp-2">{project.description}</p>
        )}
        <div className="mt-4 flex items-center gap-2 text-slate-400 text-sm">
          <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-medium text-slate-600 mb-3">Sources ({sources.length})</h3>
          {sources.length === 0 && (
            <p className="text-slate-400 text-sm">No sources uploaded yet</p>
          )}
          <div className="space-y-2">
            {sources.map((source) => (
              <div
                key={source.id}
                className="bg-slate-50 rounded p-3 border border-slate-200"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{source.filename}</span>
                  <span className="text-xs text-slate-500">{source.source_type}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Pages: {source.page_count || 0}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-slate-600 mb-3">Extracted Items ({extractedItems.length})</h3>
          {extractedItems.length === 0 && (
            <p className="text-slate-400 text-sm">No extracted items yet</p>
          )}
          <div className="space-y-2">
            {extractedItems.map((item) => (
              <div
                key={item.id}
                className="bg-slate-50 rounded p-3 border border-slate-200"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{item.title}</span>
                  <span className="text-xs text-slate-500">{item.item_type}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 line-clamp-1">{item.content?.substring(0, 100) || ''}...</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <Link to={`/projects/${projectId}/edit`} className="inline-flex items-center gap-2 text-indigo-600 rounded border border-indigo-600 px-3 py-1 text-sm hover:bg-indigo-50 transition-colors">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 13l4 4L19 7" />
          </svg>
          Edit Project
        </Link>
        <Link to={`/projects/${projectId}/sources`} className="inline-flex items-center gap-2 text-green-600 rounded border border-green-600 px-3 py-1 text-sm hover:bg-green-50 transition-colors">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 6v6l4 2" />
          </svg>
          Manage Sources
        </Link>
      </div>
    </div>
  )
}