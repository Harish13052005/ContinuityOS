import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'

export const ProjectCreate = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    setLoading(true)
    setError(null)
    try {
      await api.projects.create({ name, description })
      navigate('/projects')
    } catch (err: any) {
      setError(err.message || 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 sm:p-8">
        <div className="animate-spin rounded-full border-4 border-indigo-200 border-t-4 w-8 h-8 mb-4"></div>
        <p className="text-slate-600">Creating project...</p>
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
    <div className="max-w-md w-full">
      <h2 className="text-2xl font-bold text-slate-900 mb-4">Create Project</h2>
      <p className="text-slate-500 mb-6">Set up a new project for knowledge handover</p>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded mb-4">
          <p className="font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={e => { e.preventDefault(); handleCreate() }} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
            Project name
          </label>
          <input
            id="name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
            Description (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button
          type="submit"
          className="w-full py-2 px-4 bg-indigo-600 text-white font-medium rounded hover:bg-indigo-700 transition-colors"
        >
          Create Project
        </button>
      </form>
    </div>
  )
}