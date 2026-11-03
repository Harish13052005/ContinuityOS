import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, type ExtractedItem, type Project, type ProjectMember, type Source } from '../../lib/api'
import { portfolioProject } from '../../lib/portfolio'
import { useAuth } from '../../lib/auth'

const kindColor: Record<string, string> = { decision: 'bg-indigo-50 text-indigo-700', task: 'bg-teal-50 text-teal-700', risk: 'bg-rose-50 text-rose-700', blocker: 'bg-orange-50 text-orange-700', dependency: 'bg-sky-50 text-sky-700', question: 'bg-violet-50 text-violet-700', milestone: 'bg-amber-50 text-amber-700', responsibility: 'bg-lime-50 text-lime-800' }
const extractable = new Set(['txt', 'markdown', 'csv', 'json'])

export const ProjectDetail = () => {
  const { user } = useAuth()
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [sources, setSources] = useState<Source[]>([])
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'reviewer' | 'contributor'>('contributor')
  const [items, setItems] = useState<ExtractedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busySource, setBusySource] = useState<string | null>(null)
  const [makingHandover, setMakingHandover] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedScreenshot, setSelectedScreenshot] = useState(0)
  const [evidenceByItem, setEvidenceByItem] = useState<Record<string, { filename: string; excerpt: string; page_number?: number | null; location_reference?: string | null }[]>>({})
  const [preview, setPreview] = useState<{ filename: string; content: string; truncated: boolean } | null>(null)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [correctedContent, setCorrectedContent] = useState('')
  const [correctionReason, setCorrectionReason] = useState('')

  const load = useCallback(async () => {
    if (!projectId) return
    const [projectResponse, sourcesResponse, itemsResponse] = await Promise.all([api.projects.get(projectId), api.sources.list(projectId), api.extractedItems.list(projectId)])
    setProject(projectResponse.data)
    setSources(sourcesResponse.data.sources)
    setItems(itemsResponse.data)
    if (projectResponse.data.current_user_role !== 'recipient') {
      try { const response = await api.projects.members(projectId); setMembers(response.data) } catch { setMembers([]) }
    }
  }, [projectId])

  useEffect(() => {
    let active = true
    load().catch((err: Error) => { if (active) setError(err.message || 'Could not load this project') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [load])

  const counts = useMemo(() => items.reduce<Record<string, number>>((acc, item) => { acc[item.item_type] = (acc[item.item_type] || 0) + 1; return acc }, {}), [items])
  const handleExtract = async (source: Source) => {
    setBusySource(source.id)
    setNotice(null)
    try {
      const response = await api.extraction.fromSource(source.id)
      await load()
      setNotice(`${response.data.items_created ?? 0} knowledge items captured from ${source.filename}.`)
    } catch (err) { setNotice(err instanceof Error ? err.message : 'Could not extract this source.') }
    finally { setBusySource(null) }
  }
  const handleHandover = async () => {
    if (!projectId || !project) return
    setMakingHandover(true)
    try {
      const response = await api.handovers.create(projectId, { title: `${project.name} handover` })
      navigate(`/handovers/${response.data.id}`)
    } catch (err) { setNotice(err instanceof Error ? err.message : 'Could not create handover.') }
    finally { setMakingHandover(false) }
  }
  const handleReview = async (item: ExtractedItem, verification_status: 'supported' | 'needs_review') => {
    if (!projectId) return
    setNotice(null)
    try {
      await api.extractedItems.review(projectId, item.id, { verification_status, review_reason: verification_status === 'supported' ? 'Reviewed by a project reviewer against the supporting source.' : 'Returned to review for another project check.' })
      await load()
      setNotice(verification_status === 'supported' ? 'Knowledge item marked as supported.' : 'Knowledge item returned to review.')
    } catch (err) { setNotice(err instanceof Error ? err.message : 'Could not update review status.') }
  }
  const handleCorrection = async (item: ExtractedItem) => {
    if (!projectId || !correctionReason.trim()) return
    try {
      await api.extractedItems.review(projectId, item.id, { verification_status: 'needs_review', content: correctedContent, review_reason: correctionReason.trim() })
      setEditingItem(null); setCorrectionReason(''); await load(); setNotice('Correction saved and retained for reviewer verification.')
    } catch (err) { setNotice(err instanceof Error ? err.message : 'Could not save the correction.') }
  }
  const handleInvite = async (event: FormEvent) => {
    event.preventDefault()
    if (!projectId || !inviteEmail.trim()) return
    try { const response = await api.projects.invite(projectId, { email: inviteEmail.trim(), project_role: inviteRole }); setMembers(current => [...current, response.data]); setInviteEmail(''); setNotice('Project member added with the selected role.') }
    catch (err) { setNotice(err instanceof Error ? err.message : 'Could not add this project member.') }
  }
  const handleRemoveMember = async (member: ProjectMember) => {
    if (!projectId || !window.confirm(`Remove ${member.full_name} from this project?`)) return
    try { await api.projects.removeMember(projectId, member.user_id); setMembers(current => current.filter(existing => existing.id !== member.id)); setNotice(`${member.full_name} removed from the project.`) }
    catch (err) { setNotice(err instanceof Error ? err.message : 'Could not remove this member.') }
  }
  const toggleEvidence = async (itemId: string) => {
    if (!projectId) return
    if (evidenceByItem[itemId]) { setEvidenceByItem(current => { const next = { ...current }; delete next[itemId]; return next }); return }
    try { const response = await api.extractedItems.evidence(projectId, itemId); setEvidenceByItem(current => ({ ...current, [itemId]: response.data })) }
    catch (err) { setNotice(err instanceof Error ? err.message : 'Could not load evidence.') }
  }
  const handlePreview = async (source: Source) => {
    try { const response = await api.sources.preview(source.id); setPreview(response.data) }
    catch (err) { setNotice(err instanceof Error ? err.message : 'Could not preview this source.') }
  }

  if (loading) return <div className="space-y-5"><div className="h-40 animate-pulse rounded-3xl bg-slate-200"/><div className="h-56 animate-pulse rounded-2xl bg-slate-100"/></div>
  if (error) return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700"><p className="font-semibold">Could not open this project</p><p className="mt-1">{error}</p><Link className="mt-3 inline-block font-semibold underline" to="/projects">Return to projects</Link></div>
  if (!project) return <p className="text-slate-500">Project not found.</p>
  const showcase = portfolioProject(project.name)
  const canManageTeam = ['owner', 'admin'].includes(project.current_user_role?.toLowerCase() || '') || user?.role === 'admin'

  return (
    <div className="space-y-6 pb-8">
      <Link to="/projects" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-700">← All projects</Link>
      <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-[#202445] px-6 py-7 text-white sm:px-8 sm:py-8"><div aria-hidden="true" className="absolute -right-12 -top-24 -z-10 h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl"/><div className="flex flex-wrap items-start justify-between gap-5"><div className="max-w-2xl"><span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.14em] text-indigo-100">Project workspace</span><h1 className="mt-4 text-3xl font-semibold tracking-tight">{project.name}</h1><p className="mt-2 text-sm leading-6 text-slate-300">{project.description || 'Project knowledge, sources and delivery handovers.'}</p><p className="mt-4 text-xs text-slate-400">Created {project.created_at ? new Date(project.created_at).toLocaleDateString() : 'Recently'}</p></div><div className="flex flex-wrap gap-2"><Link to={`/projects/${projectId}/sources`} className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10">＋ Add sources</Link><button onClick={handleHandover} disabled={makingHandover} className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-[#202445] transition hover:bg-indigo-50 disabled:opacity-60">{makingHandover ? 'Preparing…' : 'Prepare handover →'}</button></div></div></section>

      {notice && <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800"><span>{notice}</span><button aria-label="Dismiss notice" onClick={() => setNotice(null)} className="text-indigo-500">×</button></div>}
      {canManageTeam && <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.13em] text-indigo-600">Team access</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Project members</h2><p className="mt-1 text-sm text-slate-500">Invite an existing account and assign the access it needs.</p></div><form onSubmit={handleInvite} className="flex flex-wrap gap-2"><label className="sr-only" htmlFor="member-email">Member email</label><input id="member-email" type="email" required value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} placeholder="teammate@example.com" className="rounded-lg border border-slate-200 px-3 py-2 text-sm"/><label className="sr-only" htmlFor="member-role">Project role</label><select id="member-role" value={inviteRole} onChange={event => setInviteRole(event.target.value as typeof inviteRole)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="contributor">Contributor</option><option value="reviewer">Reviewer</option><option value="admin">Project admin</option></select><button className="rounded-lg bg-[#242852] px-3 py-2 text-xs font-semibold text-white">Add member</button></form></div><div className="mt-4 divide-y divide-slate-100">{members.map(member => <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium text-slate-800">{member.full_name}</p><p className="text-xs text-slate-500">{member.email} · {member.project_role}</p></div><button onClick={() => handleRemoveMember(member)} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50">Remove</button></div>)}{!members.length && <p className="py-4 text-sm text-slate-500">No members added yet.</p>}</div></section>}

      {showcase && <section className="grid gap-5 xl:grid-cols-[1.35fr_.8fr]">
        <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"><div className="relative aspect-[16/8.5] bg-slate-100"><img src={showcase.screenshots[selectedScreenshot].src} alt={showcase.screenshots[selectedScreenshot].alt} className="h-full w-full object-cover object-top"/><span className="absolute bottom-3 left-3 rounded-lg bg-slate-950/75 px-3 py-1.5 text-xs font-medium text-white">{showcase.screenshots[selectedScreenshot].label}</span></div><div className="flex gap-2 overflow-x-auto p-3">{showcase.screenshots.map((shot, index) => <button key={shot.src} onClick={() => setSelectedScreenshot(index)} aria-label={`Show ${shot.label} screenshot`} aria-pressed={selectedScreenshot === index} className={`shrink-0 overflow-hidden rounded-lg border-2 transition ${selectedScreenshot === index ? 'border-indigo-500' : 'border-transparent opacity-70 hover:opacity-100'}`}><img src={shot.src} alt="" className="h-14 w-24 object-cover object-top sm:h-16 sm:w-28"/></button>)}</div></article>
        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"><p className="text-xs font-semibold uppercase tracking-[.13em] text-indigo-600">Reviewer walkthrough</p><h2 className="mt-1 text-lg font-semibold text-slate-900">A guided project demo</h2><ol className="mt-5 space-y-4">{showcase.workflow.map((step, index) => <li key={step} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">{index + 1}</span><span className="pt-1 text-sm leading-5 text-slate-600">{step}</span></li>)}</ol><div className="mt-6 border-t border-slate-100 pt-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Technology and capabilities</p><div className="mt-3 flex flex-wrap gap-2">{showcase.stack.map(tag => <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium text-slate-600">{tag}</span>)}</div></div><p className="mt-5 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Screenshots and project notes are portfolio samples. Follow the repository link to review implementation and current capabilities.</p><a href={showcase.repo} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-semibold text-indigo-700 hover:underline">Open source repository ↗</a></article>
      </section>}

      {showcase && <a href={showcase.repo} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-indigo-100 bg-white px-4 py-3 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50">Open {project.name} on GitHub <span aria-hidden="true">↗</span></a>}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[
        { label: 'Sources', count: sources.length, note: 'in this workspace', tone: 'text-cyan-700 bg-cyan-50' },
        { label: 'Knowledge items', count: items.length, note: 'captured from sources', tone: 'text-indigo-700 bg-indigo-50' },
        { label: 'Decisions', count: counts.decision || 0, note: 'recorded by the team', tone: 'text-violet-700 bg-violet-50' },
        { label: 'Open follow-ups', count: (counts.task || 0) + (counts.blocker || 0), note: 'tasks and blockers', tone: 'text-amber-800 bg-amber-50' },
      ].map(metric => <article key={metric.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_3px_12px_rgba(26,35,60,.035)] sm:p-5"><span className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${metric.tone}`}>{metric.label}</span><p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{metric.count}</p><p className="mt-1 text-xs text-slate-500">{metric.note}</p></article>)}</section>

      <section className="grid gap-5 xl:grid-cols-[.9fr_1.4fr]">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_12px_rgba(26,35,60,.035)] sm:p-6"><div><p className="text-xs font-semibold uppercase tracking-[.13em] text-indigo-600">Knowledge map</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Project signals</h2><p className="mt-1 text-sm text-slate-500">How the captured knowledge breaks down.</p></div><div className="mt-5 space-y-3">{Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([kind, count], index) => <div key={kind}><div className="mb-1.5 flex items-center justify-between text-xs"><span className="capitalize text-slate-600">{kind.replace('_', ' ')}</span><span className="font-semibold text-slate-800">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${Math.max(5, count / Math.max(1, items.length) * 100)}%`, backgroundColor: ['#635bff', '#0e9f8a', '#f59e0b', '#ef5b73', '#4084f4'][index % 5] }}/></div></div>)}{!items.length && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No knowledge captured yet. Add a text source, then extract insights from it.</p>}</div></div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_12px_rgba(26,35,60,.035)] sm:p-6"><div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.13em] text-teal-700">Source library</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Project materials</h2><p className="mt-1 text-sm text-slate-500">Extract decisions and actions while keeping their source context.</p></div><Link to={`/projects/${projectId}/sources`} className="shrink-0 text-xs font-semibold text-indigo-600 hover:underline">Manage sources →</Link></div>{sources.length ? <div className="space-y-2">{sources.map(source => { const canExtract = extractable.has(source.source_type); return <article key={source.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-slate-200 hover:bg-slate-50/70"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[10px] font-bold uppercase text-slate-500">{source.source_type.slice(0, 3)}</span><div className="min-w-0"><button onClick={() => handlePreview(source)} className="truncate text-left text-sm font-medium text-indigo-700 hover:underline">{source.filename} <span aria-hidden="true">⌕</span></button><p className="mt-1 text-xs capitalize text-slate-400">{source.source_type} · added {new Date(source.created_at).toLocaleDateString()}</p></div></div><div className="flex items-center gap-2">{canExtract ? <button onClick={() => handleExtract(source)} disabled={busySource !== null} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-wait disabled:opacity-50">{busySource === source.id ? 'Extracting…' : 'Extract insights'}</button> : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] text-slate-500">Extraction unavailable</span>}</div></article>})}</div> : <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-7 text-center"><p className="text-sm font-medium text-slate-700">No project materials yet</p><p className="mt-1 text-xs text-slate-500">Upload notes, plans, or decisions to build the project memory.</p><Link to={`/projects/${projectId}/sources`} className="mt-3 inline-block text-xs font-semibold text-indigo-600">Add the first source →</Link></div>}</div>
              </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_12px_rgba(26,35,60,.035)] sm:p-6"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.13em] text-violet-700">Project memory</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Decisions, actions and risks</h2></div><span className="text-xs text-slate-500">{items.length} items · linked to their source</span></div>{items.length ? <div className="grid gap-3 md:grid-cols-2">{items.map(item => <article key={item.id} className="rounded-xl border border-slate-100 p-4"><div className="flex items-center justify-between gap-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${kindColor[item.item_type] || 'bg-slate-100 text-slate-600'}`}>{item.item_type.replace('_', ' ')}</span><span className="text-[10px] capitalize text-slate-400">{(item.verification_status || 'unverified').replace('_', ' ')}</span></div><h3 className="mt-3 text-sm font-semibold leading-5 text-slate-800">{item.title}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.content}</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => toggleEvidence(item.id)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">{evidenceByItem[item.id] ? 'Hide evidence' : 'View evidence'}</button>{(['owner', 'admin', 'reviewer', 'project lead'].includes(project.current_user_role?.toLowerCase() || '') || user?.role === 'admin') && <><button onClick={() => handleReview(item, 'supported')} className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100">Mark supported</button><button onClick={() => handleReview(item, 'needs_review')} className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-100">Needs review</button><button onClick={() => { setEditingItem(item.id); setCorrectedContent(item.content); setCorrectionReason('') }} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Correct claim</button></>}</div>{editingItem === item.id && <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3"><label className="block text-[11px] font-semibold text-slate-600" htmlFor={`correct-${item.id}`}>Corrected claim</label><textarea id={`correct-${item.id}`} value={correctedContent} onChange={event => setCorrectedContent(event.target.value)} rows={3} className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs leading-5"/><label className="block text-[11px] font-semibold text-slate-600" htmlFor={`reason-${item.id}`}>Reason for correction</label><input id={`reason-${item.id}`} value={correctionReason} onChange={event => setCorrectionReason(event.target.value)} required minLength={3} maxLength={2000} className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs" placeholder="What did you verify or change?"/><div className="flex justify-end gap-2"><button onClick={() => setEditingItem(null)} className="rounded-md px-2 py-1 text-xs text-slate-500">Cancel</button><button onClick={() => handleCorrection(item)} disabled={!correctionReason.trim()} className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Save correction</button></div>{item.original_content && <p className="text-[10px] text-slate-400">An earlier version of this claim is retained in the project record.</p>}</div>}{item.review_reason && <p className="mt-2 text-[10px] text-slate-400">Reviewer note: {item.review_reason}</p>}{evidenceByItem[item.id]?.map((evidence, index) => <blockquote key={index} className="mt-3 rounded-lg border-l-2 border-indigo-300 bg-indigo-50/60 p-3 text-xs leading-5 text-slate-600"><p>“{evidence.excerpt}”</p><cite className="mt-1 block not-italic text-[10px] text-slate-400">{evidence.filename}{evidence.page_number ? ` · Page ${evidence.page_number}` : evidence.location_reference ? ` · ${evidence.location_reference}` : ''}</cite></blockquote>)}</article>)}</div> : <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Captured insights will appear here. Try “Extract insights” on one of the text sources above.</p>}</section>
      <div className="flex justify-end"><Link to={`/projects/${projectId}/edit`} className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-white hover:text-indigo-600">Edit project details</Link></div>
      {preview && <div role="dialog" aria-modal="true" aria-label={`${preview.filename} preview`} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={() => setPreview(null)}><section className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}><header className="flex items-center justify-between border-b border-slate-100 p-4"><div><h2 className="font-semibold text-slate-900">{preview.filename}</h2><p className="text-xs text-slate-500">Secure text preview</p></div><button onClick={() => setPreview(null)} className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">Close</button></header><pre className="max-h-[65vh] overflow-auto whitespace-pre-wrap p-5 text-xs leading-6 text-slate-700">{preview.content}</pre>{preview.truncated && <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">Preview limited to first 100,000 characters.</p>}</section></div>}
    </div>
  )
}
