import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, type Project, type Source } from '../../lib/api'
import { useAuth } from '../../lib/auth'

export const SourcesPage = () => {
  const { user } = useAuth()
  const { projectId } = useParams<{ projectId: string }>()
  const fileInput = useRef<HTMLInputElement>(null)
  const [sources, setSources] = useState<Source[]>([])
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const load = useCallback(async () => {
    if (!projectId) return
    const [sourceResponse, projectResponse] = await Promise.all([api.sources.list(projectId), api.projects.get(projectId)])
    setSources(sourceResponse.data.sources); setProject(projectResponse.data)
  }, [projectId])
  useEffect(() => { if (user && projectId) load().catch((err: Error) => setError(err.message || 'Could not load project sources')).finally(() => setLoading(false)) }, [user, projectId, load])
  const upload = async (file?: File) => {
    if (!file || !projectId) return
    setUploading(true); setError(null); setNotice(null)
    try { await api.sources.upload(projectId, file); await load(); setNotice(`${file.name} added to the project source library.`) }
    catch (err) { setError(err instanceof Error ? err.message : 'Upload failed. Check the file type and size.') }
    finally { setUploading(false); if (fileInput.current) fileInput.current.value = '' }
  }

  if (loading) return <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
  return <div className="mx-auto max-w-4xl space-y-5 pb-8"><Link to={`/projects/${projectId}`} className="inline-flex text-xs font-semibold text-slate-500 hover:text-indigo-700">← Back to project</Link><header className="rounded-[1.75rem] bg-gradient-to-br from-[#202445] to-[#395c68] p-6 text-white sm:p-8"><p className="text-xs font-semibold uppercase tracking-[.14em] text-teal-200">{project?.name || 'Project workspace'}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Source library</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Keep plans, notes and project records in one place. Text sources can be turned into traceable decisions and actions.</p></header>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}{notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
    <input ref={fileInput} type="file" className="sr-only" accept=".txt,.md,.markdown,.csv,.json,.pdf,.docx" disabled={uploading} onChange={event => { void upload(event.currentTarget.files?.[0]); event.currentTarget.value = '' }}/><button type="button" onClick={() => fileInput.current?.click()} onDragEnter={event => { event.preventDefault(); setDragging(true) }} onDragOver={event => event.preventDefault()} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false) }} onDrop={event => { event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files[0]) }} disabled={uploading} className={`w-full rounded-2xl border border-dashed p-7 text-left transition sm:p-8 ${dragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/40'} disabled:cursor-wait disabled:opacity-70`}><span className="flex flex-wrap items-center justify-between gap-5"><span className="flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-xl font-semibold text-indigo-600">↑</span><span><strong className="block text-sm text-slate-800">{uploading ? 'Adding your source…' : 'Drop a file here or browse'}</strong><span className="mt-1 block text-xs text-slate-500">TXT, Markdown, CSV, JSON, PDF or DOCX · up to 10 MB</span></span></span><span className="rounded-xl bg-[#242852] px-4 py-2.5 text-xs font-semibold text-white">Browse files</span></span></button>
    <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-semibold text-slate-900">Project materials</h2><p className="mt-1 text-xs text-slate-500">{sources.length} {sources.length === 1 ? 'source' : 'sources'} connected</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-500">Private to this project</span></div>{sources.length ? <ul className="divide-y divide-slate-100">{sources.map(source => <li key={source.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[10px] font-bold uppercase text-slate-500">{source.source_type.slice(0, 3)}</span><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-800">{source.filename}</p><p className="mt-1 text-xs text-slate-400">Added {new Date(source.created_at).toLocaleDateString()} · {source.page_count ? `${source.page_count} pages` : source.source_type.toUpperCase()}</p></div></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium capitalize text-emerald-700">Connected</span></li>)}</ul> : <div className="p-9 text-center"><p className="text-sm font-medium text-slate-700">No sources in this library yet</p><p className="mt-1 text-xs text-slate-500">Add a project brief, meeting notes, or decision log to get started.</p></div>}</section></div>
}
