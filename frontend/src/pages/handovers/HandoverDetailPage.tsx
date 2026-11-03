import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, type Handover, type Project } from '../../lib/api'
import { useAuth } from '../../lib/auth'

export const HandoverDetailPage = () => {
  const { user } = useAuth()
  const { handoverId } = useParams<{ handoverId: string }>()
  const [handover, setHandover] = useState<Handover | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!handoverId) return
    api.handovers.get(handoverId)
      .then(async response => { setHandover(response.data); const p = await api.projects.get(response.data.project_id); setProject(p.data) })
      .catch((err: Error) => setError(err.message || 'Failed to load handover'))
  }, [handoverId])

  if (error) return <p role="alert" className="text-red-600">{error}</p>
  if (!handover) return <p className="text-slate-600">Loading handover…</p>

  const canApprove = ['owner', 'admin', 'reviewer', 'project lead'].includes(project?.current_user_role?.toLowerCase() || '') || user?.role === 'admin'
  const approve = async () => {
    setBusy(true); setError(null)
    try { const response = await api.handovers.approve(handover.id); setHandover(response.data) }
    catch (err) { setError(err instanceof Error ? err.message : 'Approval failed') }
    finally { setBusy(false) }
  }
  const share = async () => {
    setBusy(true); setError(null)
    try { const response = await api.handovers.share(handover.id, recipientEmail); setHandover(response.data); setRecipientEmail('') }
    catch (err) { setError(err instanceof Error ? err.message : 'Sharing failed') }
    finally { setBusy(false) }
  }
  const exportPdf = async () => {
    setBusy(true); setError(null)
    try { const blob = await api.handovers.exportPdf(handover.id); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${handover.title.replace(/[^a-z0-9-_ ]/gi, '').replace(/\s+/g, '-')}.pdf`; link.click(); URL.revokeObjectURL(url) }
    catch (err) { setError(err instanceof Error ? err.message : 'PDF export failed') }
    finally { setBusy(false) }
  }

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
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Project handover</p><h1 className="mt-1 text-2xl font-bold text-slate-900">{handover.title}</h1><p className="mt-2 text-sm text-slate-500">Version {handover.version} · Created {new Date(handover.created_at).toLocaleDateString()}</p>{handover.recipient_email && <p className="mt-1 text-xs text-slate-500">Shared with {handover.recipient_name || handover.recipient_email}</p>}</div><span className={`rounded-full px-3 py-1 text-sm capitalize ${handover.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{handover.status.replace('_', ' ')}</span></div>
      </header>
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <section className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        {canApprove && handover.status !== 'approved' && <button onClick={approve} disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{busy ? 'Saving…' : 'Approve handover'}</button>}
        {canApprove && handover.status === 'approved' && <form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); void share() }}><label className="sr-only" htmlFor="recipient-email">Recipient email</label><input id="recipient-email" type="email" required value={recipientEmail} onChange={event => setRecipientEmail(event.target.value)} placeholder="recipient@example.com" className="rounded-lg border border-slate-200 px-3 py-2 text-sm"/><button disabled={busy} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">Share approved report</button></form>}
        {handover.status === 'approved' && <button onClick={exportPdf} disabled={busy} className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60">Export PDF</button>}
        {handover.status !== 'approved' && <span className="text-xs text-slate-500">Review this preview, then approve before sharing or exporting.</span>}
      </section>
      {sections.length ? <div className="grid gap-4 sm:grid-cols-2">{sections.map(([title, content]) => <section key={title} className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">{title}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{content}</p></section>)}</div> : <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">This handover does not have report content yet.</div>}
      {!!handover.supporting_evidence?.length && <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">Supporting evidence</h2><ul className="mt-3 space-y-3">{handover.supporting_evidence.map((ref, index) => <li key={`${ref.item_id}-${index}`} className="rounded-lg bg-slate-50 p-3"><p className="text-sm font-medium text-slate-800">{ref.title}</p><blockquote className="mt-1 text-sm leading-5 text-slate-600">“{ref.excerpt}”</blockquote><p className="mt-1 text-xs text-slate-400">{ref.source}{ref.page_number ? ` · Page ${ref.page_number}` : ''}</p></li>)}</ul></section>}
    </div>
  )
}
