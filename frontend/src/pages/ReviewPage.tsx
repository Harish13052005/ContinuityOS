import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type DashboardData, type ExtractedItem, type EvidenceRef } from '../lib/api'
import { useAuth } from '../lib/auth'
import { asList, formatKind, formatStatus, statusTone } from '../lib/format'

type Row = ExtractedItem & { project_id: string; project_name: string; role?: string | null }
const pending = new Set(['needs_review', 'unverified', 'conflicting', 'stale', 'pending', 'disputed'])

export const ReviewPage = () => {
  const { user } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [selected, setSelected] = useState<Row | null>(null)
  const [evidence, setEvidence] = useState<EvidenceRef[]>([])
  const [reason, setReason] = useState('Reviewed against the supporting source.')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const summary = await api.dashboard.get()
    const data = summary.data as DashboardData
    const items = await Promise.all(asList<DashboardData['projects'][number]>(data.projects).map(async project => {
      try {
        const result = await api.extractedItems.list(project.id)
        return asList<ExtractedItem>(result.data).map(item => ({ ...item, project_id: project.id, project_name: project.name, role: project.current_user_role }))
      } catch {
        return []
      }
    }))
    setRows(items.flat())
  }

  useEffect(() => {
    if (!user) return
    load().catch((err: Error) => setError(err.message || 'Could not load the review queue')).finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (!selected) { setEvidence([]); return }
    setContent(selected.content)
    api.extractedItems.evidence(selected.project_id, selected.id)
      .then(response => setEvidence(asList(response.data)))
      .catch(() => setEvidence([]))
  }, [selected])

  const queue = useMemo(() => rows.filter(row => pending.has((row.verification_status || 'unverified').toLowerCase())), [rows])

  const act = async (status: 'supported' | 'needs_review' | 'conflicting' | 'stale' | 'unverified', edited = false) => {
    if (!selected) return
    setBusy(true); setError(null)
    try {
      await api.extractedItems.review(selected.project_id, selected.id, {
        verification_status: status,
        review_reason: reason.trim() || 'Reviewed by an authorized reviewer.',
        content: edited ? content : undefined,
      })
      setNotice(`Claim marked as ${formatStatus(status)}. Original AI output is retained when a correction is saved.`)
      const nextId = selected.id
      await load()
      setSelected(current => current?.id === nextId ? null : current)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review update failed. You may need owner or reviewer access.')
    } finally { setBusy(false) }
  }

  if (loading) return <div className="h-40 animate-pulse rounded-2xl bg-white" />

  return (
    <div className="space-y-6 pb-8 rise">
      <header className="rounded-[1.75rem] bg-gradient-to-br from-[#2a2144] to-[#3b5271] p-6 text-white sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-amber-200">Human review and verification</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Review queue</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">AI findings remain proposals until an authorized reviewer verifies them. Preserve the original claim, record a reason, and expose conflicts instead of hiding them.</p>
      </header>
      {error && <div role="alert" className="card border-rose-200 p-4 text-sm text-rose-700">{error}</div>}
      {notice && <div role="status" className="card border-emerald-200 p-4 text-sm text-emerald-800">{notice}</div>}
      <div className="grid gap-5 xl:grid-cols-[.9fr_1.2fr]">
        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">{queue.length} items need a person</h2>
            <p className="mt-1 text-xs text-slate-500">Unverified, conflicting, stale, or returned-to-review claims.</p>
          </div>
          <ul className="max-h-[70vh] divide-y divide-slate-100 overflow-auto">
            {queue.map(item => (
              <li key={item.id}>
                <button type="button" onClick={() => setSelected(item)} className={`w-full px-5 py-4 text-left transition hover:bg-slate-50 ${selected?.id === item.id ? 'bg-indigo-50' : ''}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-semibold uppercase text-slate-500">{formatKind(item.item_type)}</span>
                    <span className={statusTone[item.verification_status || 'unverified']}>{formatStatus(item.verification_status)}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.project_name}</p>
                </button>
              </li>
            ))}
            {!queue.length && <li className="p-8 text-center text-sm text-slate-500">Nothing is waiting for review. Extract sources or open a project to inspect claims.</li>}
          </ul>
        </section>
        <section className="card p-5 sm:p-6">
          {!selected ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center text-sm text-slate-500">
              Select a claim to inspect evidence and record a review decision.
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.14em] text-indigo-600">Review item · {selected.project_name}</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">{selected.title}</h2>
                <p className="mt-1 text-xs text-slate-500">{formatKind(selected.item_type)} · {formatStatus(selected.verification_status)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">AI-extracted claim</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{selected.original_content || selected.content}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Supporting evidence</p>
                {evidence.length ? evidence.map((ref, index) => (
                  <blockquote key={index} className="mt-2 rounded-xl border-l-2 border-indigo-400 bg-indigo-50/70 p-3 text-sm leading-6 text-slate-700">
                    “{ref.excerpt}”
                    <cite className="mt-1 block text-xs not-italic text-slate-500">{ref.filename || ref.source}{ref.page_number ? ` · p.${ref.page_number}` : ''}</cite>
                  </blockquote>
                )) : <p className="mt-2 text-sm text-slate-500">No confirmed source excerpt is attached to this claim.</p>}
              </div>
              <label className="block text-xs font-semibold text-slate-700">Reviewer reason
                <input value={reason} onChange={event => setReason(event.target.value)} className="soft-input mt-1.5" minLength={3} />
              </label>
              <label className="block text-xs font-semibold text-slate-700">Edit claim
                <textarea value={content} onChange={event => setContent(event.target.value)} rows={4} className="soft-input mt-1.5" />
              </label>
              <div className="flex flex-wrap gap-2">
                <button disabled={busy} onClick={() => void act('supported')} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Verify</button>
                <button disabled={busy} onClick={() => void act('unverified')} className="btn-secondary">Reject</button>
                <button disabled={busy} onClick={() => void act('needs_review', true)} className="btn-secondary">Save edit</button>
                <button disabled={busy} onClick={() => void act('stale')} className="btn-secondary">Mark stale</button>
                <button disabled={busy} onClick={() => void act('conflicting')} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Flag conflict</button>
              </div>
              <Link to={`/projects/${selected.project_id}`} className="inline-flex text-xs font-semibold text-indigo-600">Open full project workspace →</Link>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
