import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'

export const ProjectCreate = () => {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true); setError(null)
    try { await api.projects.create({ name: name.trim(), description: description.trim() }); navigate('/projects') }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not create the project.') }
    finally { setLoading(false) }
  }

  return <div className="mx-auto max-w-3xl space-y-5 pb-8"><Link to="/projects" className="inline-flex text-xs font-semibold text-slate-500 hover:text-indigo-700">← Back to projects</Link><header className="rounded-[1.75rem] bg-gradient-to-br from-[#202445] to-[#3b5271] p-6 text-white sm:p-8"><p className="text-xs font-semibold uppercase tracking-[.14em] text-teal-200">New workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Start a project</h1><p className="mt-2 max-w-lg text-sm leading-6 text-slate-300">Bring project notes and decisions together in one place your team can return to.</p></header><form onSubmit={handleCreate} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7"><div className="space-y-5"><div><label htmlFor="name" className="mb-1.5 block text-xs font-semibold text-slate-700">Project name <span className="text-rose-500">*</span></label><input id="name" value={name} onChange={event => setName(event.target.value)} required maxLength={255} placeholder="e.g. Customer onboarding refresh" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"/><p className="mt-1.5 text-[11px] text-slate-400">Choose a name your teammates will recognize.</p></div><div><label htmlFor="description" className="mb-1.5 block text-xs font-semibold text-slate-700">What is this project about?</label><textarea id="description" value={description} onChange={event => setDescription(event.target.value)} rows={4} maxLength={2000} placeholder="Add a short goal, scope, or outcome to give your team context." className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm leading-6 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"/><p className="mt-1.5 text-right text-[11px] text-slate-400">{description.length}/2000</p></div></div>{error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}<div className="mt-7 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5"><Link to="/projects" className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</Link><button type="submit" disabled={loading || !name.trim()} className="rounded-xl bg-[#242852] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Creating workspace…' : 'Create project'}</button></div></form></div>
}
