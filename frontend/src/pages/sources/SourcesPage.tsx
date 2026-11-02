import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useNavigate, useParams } from 'react-router-dom'

export const SourcesPage = () => {
  const { user } = useAuth()
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSources = async () => {
      try {
        const response = await api.sources.list(projectId!)
        setSources(response.data)
      } catch (err: any) {
        setError(err.message || 'Failed to load sources')
      } finally {
        setLoading(false)
      }
    }

    if (user && projectId) {
      loadSources()
    }
  }, [user, projectId])

  if (loading) {
    return <p className="text-slate-600">Loading sources...</p>
  }

  if (error) {
    return <p className="text-red-600">{error}</p>
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Sources</h2>

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate(`/projects/${projectId}/sources/create`)}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Upload Source
        </button>
      </div>

      {sources.length === 0 && (
        <p className="text-slate-500">No sources uploaded yet.</p>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left text-sm font-medium text-slate-500 px-6 py-3">Filename</th>
              <th className="text-left text-sm font-medium text-slate-500 px-6 py-3">Type</th>
              <th className="text-left text-sm font-medium text-slate-500 px-6 py-3">Uploaded</th>
              <th className="text-left text-sm font-medium text-slate-500 px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">{source.filename}</td>
                <td className="px-6 py-4 text-slate-500 text-truncate">{source.source_type}</td>
                <td className="px-6 py-4 text-slate-500 text-truncate">{new Date(source.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <button
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