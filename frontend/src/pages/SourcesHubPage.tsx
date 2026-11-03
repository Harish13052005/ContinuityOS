import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type Project, type Source } from '../lib/api'
import { useAuth } from '../lib/auth'
import { asList } from '../lib/format'

type Row = Source & { project_id: string; project_name: string }

export const SourcesHubPage = () => {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [projectId, setProjectId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const load = async () => {
    const response = await api.projects.list()
    const list = asList<Project>(response.data)
    setProjects(list)
    if (!projectId && list[0]) setProjectId(list[0].id)
    const sources = await Promise.all(list.map(async project => {
      try {
        const result = await api.sources.list(project.id)
        return asList<Source>(result.data?.sources).map(source => ({ ...source, project_id: project.id, project_name: project.name }))
      } catch {
        return []
      }
    }))
    setRows(sources.flat())
  }

  useEffect(() => {
    if (!user) return
    load().catch((err: Error) => setError(err.message || 'Could not load sources'))
  }, [user])

  const upload = async (file?: File) => {
    if (!file) return
    if (!projectId) { setError('Create or select a project before uploading sources.'); return }
    setUploading(true); setError(null); setNotice(null)
    try {
      await api.sources.upload(projectId, file)
      await load()
      setNotice(`${file.name} added. Extraction can be run from this table or the project workspace.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Use PDF, DOCX, TXT, Markdown, CSV or JSON up to 10 MB.')
    } finally { setUploading(false) }
  }

  const extract = async (row: Row) => {
    setBusy(row.id); setError(null)
    try {
      const result = await api.extraction.fromSource(row.id)
      setNotice(`${result.data.items_created ?? 0} knowledge items captured from ${row.filename}.`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed. You can retry this source.')
    } finally { setBusy(null) }
  }

  return (
    <div className="space-y-6 pb-8 rise">
      <header className="rounded-[1.75rem] bg-gradient-to-br from-[#202445] to-[#395c68] p-6 text-white sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-teal-200">Connect</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Project sources</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Upload authorized files with visible processing status. File type, size, project membership and private storage are checked on the server.</p>
      </header>
      {error && <div role="alert" className="card border-rose-200 p-4 text-sm text-rose-700">{error}</div>}
      {notice && <div role="status" className="card border-emerald-200 p-4 text-sm text-emerald-800">{notice}</div>}
      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <label className={`card cursor-pointer p-7 ${dragging ? 'border-indigo-400 bg-indigo-50' : ''}`}
          onDragEnter={event => { event.preventDefault(); setDragging(true) }}
          onDragOver={event => event.preventDefault()}
          onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false) }}
          onDrop={event => { event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files[0]) }}
        >
          <input type="file" className="sr-only" accept=".txt,.md,.markdown,.csv,.json,.pdf,.docx" disabled={uploading} onChange={event => { void upload(event.currentTarget.files?.[0]); event.currentTarget.value = '' }} />
          <p className="text-sm font-semibold text-slate-900">{uploading ? 'Uploading…' : '＋  Upload PDF, DOCX, TXT, Markdown, CSV or JSON'}</p>
          <p className="mt-2 text-xs text-slate-500">Maximum 10 MB. Text extraction keeps PDF page references when parsing succeeds.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-slate-600">Add to project</span>
            <select value={projectId} onChange={event => setProjectId(event.target.value)} className="soft-input max-w-xs" onClick={event => event.stopPropagation()}>
              {!projects.length && <option value="">No projects yet</option>}
              {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>
        </label>
        <aside className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-[.13em] text-indigo-600">Ingestion safeguards</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li>File type and size validation</li>
            <li>Secure, non-public storage</li>
            <li>Text extraction with page references</li>
            <li>Processing status and retry handling</li>
            <li>Project membership checks</li>
          </ul>
        </aside>
      </div>
      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">{rows.length} connected sources</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Project</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(row => (
                <tr key={row.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.filename}</td>
                  <td className="px-4 py-3 uppercase text-xs text-slate-500">{row.source_type}</td>
                  <td className="px-4 py-3"><Link to={`/projects/${row.project_id}`} className="text-indigo-700 hover:underline">{row.project_name}</Link></td>
                  <td className="px-4 py-3"><span className="badge-supported">Processed</span></td>
                  <td className="px-4 py-3">
                    <button disabled={busy !== null} onClick={() => void extract(row)} className="text-xs font-semibold text-indigo-700 hover:underline disabled:opacity-50">
                      {busy === row.id ? 'Extracting…' : 'Extract / retry'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="p-8 text-center text-sm text-slate-500">No sources yet. Upload authorized meeting notes, documentation or a task export.</p>}
        </div>
      </section>
    </div>
  )
}
