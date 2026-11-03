import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, type Handover } from '../../lib/api'

export const HandoverDetailPage = () => {
  const { handoverId } = useParams<{ handoverId: string }>()
  const [handover, setHandover] = useState<Handover | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!handoverId) return
    api.handovers.get(handoverId)
      .then(response => setHandover(response.data))
      .catch((err: Error) => setError(err.message || 'Failed to load handover'))
  }, [handoverId])

  if (error) return <p role="alert" className="text-red-600">{error}</p>
  if (!handover) return <p className="text-slate-600">Loading handover…</p>

  const sections = [
    ['Project overview', handover.project_overview],
    ['Current status', handover.current_status],
    ['Decisions', handover.decisions],
    ['Pending tasks', handover.pending_tasks],
    ['Dependencies and blockers', handover.dependencies_blockers],
    ['Risks and questions', handover.risks_questions],
    ['Milestones', handover.milestones],
    ['Next actions', handover.next_actions],
    ['Items to confirm', handover.missing_conflicting],
  ].filter((section): section is [string, string] => Boolean(section[1]))

  return (
    <div className="max-w-3xl space-y-5">
      <Link to="/handovers" className="text-sm text-indigo-600 hover:underline">← Back to handovers</Link>
      <header className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Project handover</p><h1 className="mt-1 text-2xl font-bold text-slate-900">{handover.title}</h1><p className="mt-2 text-sm text-slate-500">Version {handover.version} · Created {new Date(handover.created_at).toLocaleDateString()}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-sm capitalize text-emerald-700">{handover.status.replace('_', ' ')}</span></div>
      </header>
      {sections.length ? <div className="grid gap-4 sm:grid-cols-2">{sections.map(([title, content]) => <section key={title} className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">{title}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{content}</p></section>)}</div> : <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">This handover does not have report content yet.</div>}
    </div>
  )
}
