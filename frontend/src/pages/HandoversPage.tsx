import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type DashboardData, type Handover } from '../lib/api'
import { useAuth } from '../lib/auth'

export const HandoversPage = () => {
  const { user } = useAuth()
  const [handovers, setHandovers] = useState<Handover[]>([])
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!user) return
    Promise.all([api.handovers.list(''), api.dashboard.get()]).then(([reports, summary]) => { setHandovers(reports.data); setDashboard(summary.data) }).catch((err: Error) => setError(err.message || 'Could not load handovers'))
  }, [user])
  const projectName = (projectId: string) => dashboard?.projects.find(project => project.id === projectId)?.name || 'Project'
  const filtered = useMemo(() => handovers.filter(report => `${report.title} ${projectName(report.project_id)}`.toLowerCase().includes(search.toLowerCase())), [handovers, search, dashboard])
  if (error) return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{error}</div>
  if (!dashboard) return <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />

  return <div className="space-y-6 pb-8">
    <header className="rounded-[1.75rem] bg-gradient-to-br from-[#26304d] to-[#41635f] p-6 text-white sm:p-8"><p className="text-xs font-semibold uppercase tracking-[.14em] text-teal-200">Continuity & handoff</p><div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight">Handovers</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-200">Keep context moving with structured updates grounded in project knowledge.</p></div><div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3"><strong className="block text-2xl">{handovers.length}</strong><span className="text-xs text-slate-200">reports in workspace</span></div></div></header>
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"><div><h2 className="font-semibold text-slate-900">Project reports</h2><p className="mt-1 text-xs text-slate-500">Open a report to review its decisions, tasks, risks and next actions.</p></div><input aria-label="Search handovers" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search reports" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 sm:w-56" /></div>
    {filtered.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((handover, index) => <article key={handover.id} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className={`h-1.5 ${index % 3 === 0 ? 'bg-gradient-to-r from-teal-500 to-cyan-400' : index % 3 === 1 ? 'bg-gradient-to-r from-indigo-500 to-violet-400' : 'bg-gradient-to-r from-amber-400 to-rose-400'}`} /><div className="p-5"><div className="flex items-start justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-sm font-bold text-teal-700">HO</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-medium capitalize ${handover.status === 'ready' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{handover.status.replace('_', ' ')}</span></div><p className="mt-4 text-[10px] font-semibold uppercase tracking-[.12em] text-slate-400">{projectName(handover.project_id)}</p><h3 className="mt-1 line-clamp-2 min-h-12 text-base font-semibold text-slate-900">{handover.title}</h3><p className="mt-2 text-xs text-slate-500">Version {handover.version} · {new Date(handover.created_at).toLocaleDateString()}</p><Link to={`/handovers/${handover.id}`} className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-teal-600 hover:text-white">Review handover <span aria-hidden="true">→</span></Link></div></article>)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-semibold text-slate-800">{search ? 'No reports match your search' : 'No handovers yet'}</h2><p className="mt-2 text-sm text-slate-500">Open a project and choose “Prepare handover” to create a source-backed report.</p>{!search && dashboard.projects[0] && <Link to={`/projects/${dashboard.projects[0].id}`} className="mt-4 inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white">Open a project</Link>}</div>}
  </div>
}
