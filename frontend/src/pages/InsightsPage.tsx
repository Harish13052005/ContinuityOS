import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type DashboardData, type ExtractedItem } from '../lib/api'
import { useAuth } from '../lib/auth'
import { asList, formatKind, formatStatus, itemLabels, statusTone } from '../lib/format'

type Row = ExtractedItem & { project_id: string; project_name: string }

const tabs = ['all', 'decision', 'task', 'risk', 'question'] as const

export const InsightsPage = () => {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<(typeof tabs)[number]>('all')

  useEffect(() => {
    if (!user) return
    let active = true
    api.dashboard.get()
      .then(async response => {
        const summary = response.data as DashboardData
        const items = await Promise.all(asList<DashboardData['projects'][number]>(summary.projects).map(async project => {
          try {
            const result = await api.extractedItems.list(project.id)
            return asList<ExtractedItem>(result.data).map(item => ({ ...item, project_id: project.id, project_name: project.name }))
          } catch {
            return []
          }
        }))
        if (!active) return
        setData(summary)
        setRows(items.flat())
      })
      .catch((err: Error) => { if (active) setError(err.message || 'Could not load knowledge') })
    return () => { active = false }
  }, [user])

  const filtered = useMemo(() => rows.filter(row => {
    const matchesTab = tab === 'all' || row.item_type === tab
    const query = search.toLowerCase()
    return matchesTab && `${row.title} ${row.content} ${row.project_name}`.toLowerCase().includes(query)
  }), [rows, tab, search])

  if (error) return <div role="alert" className="card p-5 text-rose-700">{error}</div>
  if (!data) return <div className="h-40 animate-pulse rounded-2xl bg-white" />

  return (
    <div className="space-y-6 pb-8 rise">
      <header className="rounded-[1.75rem] bg-gradient-to-br from-[#202445] via-[#292c54] to-[#344a62] p-6 text-white sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[.15em] text-teal-200">Reconstructed knowledge</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Knowledge items</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Structured project insights with evidence, confidence and verification labels.</p>
          </div>
          <div className="flex gap-6">
            <div><strong className="block text-2xl">{rows.length}</strong><span className="text-xs text-slate-300">captured items</span></div>
            <div><strong className="block text-2xl">{data.stats.projects}</strong><span className="text-xs text-slate-300">projects</span></div>
          </div>
        </div>
      </header>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map(item => (
              <button key={item} type="button" onClick={() => setTab(item)} className={`tab-btn ${tab === item ? 'tab-btn-on' : 'tab-btn-off'}`}>
                {item === 'all' ? 'All items' : itemLabels[item]}
              </button>
            ))}
          </div>
          <input aria-label="Search knowledge" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search insights" className="soft-input sm:w-56" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Insight</th>
                <th className="px-4 py-3 font-semibold">Project</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(row => (
                <tr key={row.id} className="hover:bg-indigo-50/40">
                  <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase text-slate-600">{formatKind(row.item_type)}</span></td>
                  <td className="px-4 py-3">
                    <Link to={`/projects/${row.project_id}`} className="font-medium text-slate-900 hover:text-indigo-700">{row.title}</Link>
                    <p className="mt-1 line-clamp-2 max-w-xl text-xs text-slate-500">{row.content}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{row.project_name}</td>
                  <td className="px-4 py-3"><span className={statusTone[row.verification_status || 'unverified']}>{formatStatus(row.verification_status)}</span></td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-700">{row.confidence == null ? '—' : row.confidence >= 80 ? 'High' : row.confidence >= 50 ? 'Medium' : 'Low'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <p className="p-8 text-center text-sm text-slate-500">No knowledge items match this view yet. Connect sources and run extraction.</p>}
        </div>
      </section>
    </div>
  )
}
