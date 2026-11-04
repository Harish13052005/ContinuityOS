import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, type DashboardData } from '../lib/api'
import { useAuth } from '../lib/auth'
import { asList, formatKind, formatStatus, statusTone } from '../lib/format'

const palette = ['#635bff', '#0e9f8a', '#f59e0b', '#ef5b73', '#4084f4', '#9a68d7', '#78a33b', '#94a3b8']
const labels: Record<string, string> = { decision: 'Decisions', task: 'Tasks', risk: 'Risks', blocker: 'Blockers', dependency: 'Dependencies', question: 'Questions', milestone: 'Milestones', responsibility: 'Owners' }

function KnowledgeMix({ rows }: { rows: DashboardData['knowledge_by_type'] }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0)
  const radius = 39
  const circumference = 2 * Math.PI * radius
  let offset = 0
  return (
    <div className="flex flex-col items-center gap-7 sm:flex-row sm:items-center">
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={`${total} knowledge items across ${rows.length} categories`}>
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#eef0f5" strokeWidth="11" />
          {rows.map((row, index) => {
            const length = total ? circumference * row.count / total : 0
            const segment = <circle key={row.type} cx="50" cy="50" r={radius} fill="none" stroke={palette[index % palette.length]} strokeWidth="11" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} strokeLinecap="butt" />
            offset += length
            return segment
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center"><strong className="text-3xl font-semibold tracking-tight text-slate-900">{total}</strong><span className="mt-0.5 text-xs text-slate-500">knowledge items</span></div>
      </div>
      <div className="grid w-full grid-cols-2 gap-x-5 gap-y-3">
        {rows.slice(0, 8).map((row, index) => <div key={row.type} className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: palette[index % palette.length] }} /><span className="truncate text-sm text-slate-600">{labels[row.type] || row.type}</span><span className="ml-auto text-sm font-semibold text-slate-900">{row.count}</span></div>)}
        {!rows.length && <p className="col-span-2 text-sm text-slate-500">Insights appear here as your source material is processed.</p>}
      </div>
    </div>
  )
}

export const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (!user) return
    let active = true
    api.dashboard.get()
      .then(response => { if (active) setData(response.data) })
      .catch((err: Error) => { if (active) setError(err.message || 'Could not load dashboard') })
    return () => { active = false }
  }, [user])

  const projects = useMemo(() => asList<DashboardData['projects'][number]>(data?.projects).filter(project => `${project.name} ${project.description || ''}`.toLowerCase().includes(search.toLowerCase())), [data, search])
  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut()
    navigate('/login', { replace: true })
  }

  if (error) return <div role="alert" className="card p-5 text-rose-700">{error}</div>
  if (authLoading || !data) return <div className="space-y-5"><div className="h-36 animate-pulse rounded-3xl bg-white"/><div className="h-24 animate-pulse rounded-2xl bg-white/80"/></div>

  const projectName = (id: string) => data.projects.find(project => project.id === id)?.name || 'Project'
  const maxProjectItems = Math.max(1, ...data.projects.map(project => project.knowledge_count))
  const needsReview = data.stats.needs_review ?? 0
  const openBlockers = data.stats.open_blockers ?? 0
  const health = needsReview || openBlockers ? 'Needs attention' : 'Healthy'
  const cards = [
    { label: 'Sources', value: data.stats.sources, sub: 'authorized files connected', accent: 'bg-cyan-500' },
    { label: 'Knowledge items', value: data.stats.knowledge_items, sub: 'evidence-backed insights', accent: 'bg-indigo-500' },
    { label: 'Needs review', value: needsReview, sub: 'awaiting a human decision', accent: 'bg-amber-500' },
    { label: 'Open blockers', value: openBlockers, sub: 'items that can stall handover', accent: 'bg-rose-500' },
  ]

  return (
    <div className="space-y-8 pb-8 rise">
      <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-[#171a35] px-6 py-8 text-white shadow-[0_20px_60px_-30px_rgba(24,29,69,.65)] sm:px-9 sm:py-10">
        <div aria-hidden="true" className="absolute -right-12 -top-28 -z-10 h-80 w-80 rounded-full bg-indigo-500/30 blur-3xl" />
        <div aria-hidden="true" className="absolute bottom-[-150px] right-[27%] -z-10 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-indigo-100"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/> Project: workspace overview · {health.toUpperCase()}</div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.6rem]">Good to see you, {user?.full_name?.split(' ')[0] || 'there'}.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">Don't just transfer documents. Transfer the understanding needed to continue the work.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleSignOut} disabled={signingOut} className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-500/20 disabled:cursor-wait disabled:opacity-60">
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
            <Link to="/sources" className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">Connect sources</Link>
            <Link to="/projects/create" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#171a35] shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-50"><span className="text-lg leading-none">＋</span> Create project</Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Workspace metrics">
        {cards.map(card => (
          <article key={card.label} className="metric-card group transition hover:-translate-y-0.5">
            <div className={`absolute inset-x-0 top-0 h-0.5 ${card.accent}`} />
            <p className="text-xs font-medium text-slate-500 sm:text-sm">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2rem]">{card.value}</p>
            <p className="mt-3 text-xs text-slate-500 sm:text-sm">{card.sub}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <div className="card min-w-0 p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.13em] text-indigo-600">Portfolio</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Your projects</h2>
              <p className="mt-1 text-sm text-slate-500">A snapshot of captured sources, knowledge and continuity gaps.</p>
            </div>
            <label className="relative block w-full sm:w-56">
              <span className="sr-only">Search projects</span>
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a project" className="soft-input pl-3" />
            </label>
          </div>
          {projects.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {projects.map((project, index) => (
                <article key={project.id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:shadow-[0_8px_25px_-18px_rgba(45,52,120,.4)]">
                  <div className="flex items-start gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${index % 2 ? 'bg-teal-50 text-teal-700' : 'bg-indigo-50 text-indigo-700'}`}>{project.name.slice(0, 1).toUpperCase()}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-slate-900">{project.name}</h3>
                      <p className="mt-1 line-clamp-2 min-h-9 text-xs leading-5 text-slate-500">{project.description || 'Add a short project description.'}</p>
                    </div>
                    <Link aria-label={`Open ${project.name}`} to={`/projects/${project.id}`} className="rounded-lg px-2 py-1 text-lg text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600">↗</Link>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    <span className="text-slate-500">{project.source_count} sources</span>
                    <span className="text-slate-500">{project.members.length} teammates</span>
                    <span className="font-semibold text-indigo-700">{project.knowledge_count} insights</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400" style={{ width: `${Math.max(8, project.knowledge_count / maxProjectItems * 100)}%` }} /></div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 p-7 text-center">
              <p className="text-sm font-medium text-slate-700">{search ? 'No projects match your search.' : 'No projects yet'}</p>
              {!search && <Link className="mt-2 inline-block text-sm font-semibold text-indigo-600" to="/projects/create">Start your first project →</Link>}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="card p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[.13em] text-amber-700">Continuity health</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{health}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{needsReview} items await review. {openBlockers} blockers need owners.</p>
            <div className="mt-4 flex gap-2">
              <Link to="/review" className="btn-primary">Open review queue</Link>
              <Link to="/knowledge" className="btn-secondary">Inspect knowledge</Link>
            </div>
          </div>
          <div className="card p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[.13em] text-teal-700">Knowledge map</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">What the team knows</h2>
            <div className="mt-5"><KnowledgeMix rows={data.knowledge_by_type || []} /></div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.13em] text-amber-700">Recent project activity</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Recently captured</h2>
            </div>
            <Link to="/knowledge" className="text-xs font-semibold text-indigo-600 hover:underline">View knowledge</Link>
          </div>
          {data.recent_items.length ? (
            <ul className="divide-y divide-slate-100">
              {data.recent_items.map(item => (
                <li key={item.id} className="flex gap-3 py-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold uppercase text-slate-500">{item.item_type.slice(0, 2)}</span>
                  <div className="min-w-0 flex-1">
                    <Link to={`/projects/${item.project_id}`} className="line-clamp-1 text-sm font-medium text-slate-800 hover:text-indigo-700">{formatKind(item.item_type)} · {item.title}</Link>
                    <p className="mt-1 text-xs text-slate-500">{projectName(item.project_id)}</p>
                  </div>
                  <span className={statusTone[item.verification_status] || 'badge-unverified'}>{formatStatus(item.verification_status)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="py-6 text-sm text-slate-500">Add a project source to start capturing decisions and actions.</p>}
        </div>
        <div className="card p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.13em] text-violet-700">Stay aligned</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Handover reports</h2>
            </div>
            <Link to="/handovers" className="text-xs font-semibold text-indigo-600 hover:underline">All reports</Link>
          </div>
          {data.recent_handovers.length ? (
            <ul className="divide-y divide-slate-100">
              {data.recent_handovers.map(handover => (
                <li key={handover.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <Link to={`/handovers/${handover.id}`} className="block truncate text-sm font-medium text-slate-800 hover:text-indigo-700">{handover.title}</Link>
                    <p className="mt-1 truncate text-xs text-slate-500">{projectName(handover.project_id)} · {new Date(handover.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={statusTone[handover.status] || 'badge-review'}>{formatStatus(handover.status)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="py-6 text-sm text-slate-500">Create a handover from a project to share its current status.</p>}
        </div>
      </section>
    </div>
  )
}
