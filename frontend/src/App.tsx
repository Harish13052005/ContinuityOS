import { useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from './lib/auth'

const navItems = [
  { label: 'Overview', to: '/', mark: 'OV', end: true },
  { label: 'Projects', to: '/projects', mark: 'PR' },
  { label: 'Insights', to: '/insights', mark: 'IN' },
  { label: 'Handovers', to: '/handovers', mark: 'HO' },
]

export default function App() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const token = localStorage.getItem('token')

  if (!token) return <Navigate to="/login" replace />

  const signOut = async () => {
    setSigningOut(true)
    try { await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }) } catch { /* Local sign-out still works when the API is offline. */ }
    localStorage.removeItem('token')
    navigate('/login', { replace: true })
  }
  const initials = user?.full_name?.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'CO'

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-slate-200/80 bg-white lg:flex">
        <Link to="/" className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#242852] text-sm font-bold tracking-tight text-white shadow-[0_5px_12px_rgba(36,40,82,.2)]">C<span className="text-teal-300">.</span></span>
          <span><strong className="block text-sm tracking-tight text-slate-900">Continuity<span className="text-indigo-600">OS</span></strong><span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[.16em] text-slate-400">Project memory</span></span>
        </Link>
        <div className="px-4 pt-7"><p className="px-3 text-[10px] font-semibold uppercase tracking-[.17em] text-slate-400">Workspace</p><nav aria-label="Main navigation" className="mt-3 space-y-1">{navItems.map(item => <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${isActive ? 'bg-indigo-50 text-indigo-700 shadow-[inset_2px_0_0_#635bff]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[9px] font-bold tracking-wide text-slate-400 ring-1 ring-slate-200/70 transition group-[.active]:text-indigo-600">{item.mark}</span>{item.label}</NavLink>)}</nav></div>
        <div className="mx-4 mt-8 rounded-2xl bg-gradient-to-br from-[#252951] to-[#414275] p-4 text-white shadow-[0_12px_24px_-16px_rgba(34,39,86,.55)]"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-teal-200">Keep work moving</p><strong className="mt-2 block text-base font-semibold">Context travels with the project.</strong><p className="mt-2 text-xs leading-5 text-indigo-100/75">Connect source notes to decisions, follow-ups and useful handovers.</p><Link to="/projects" className="mt-3 inline-flex text-xs font-semibold text-white hover:text-teal-200">Explore projects →</Link></div>
        <div className="mt-auto border-t border-slate-100 p-4"><Link to="/settings" className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-semibold text-white">{initials}</span><span className="min-w-0 flex-1"><strong className="block truncate text-xs font-semibold text-slate-800">{user?.full_name || 'Your account'}</strong><span className="block truncate text-[10px] text-slate-400">{user?.email || 'Personal workspace'}</span></span><span className="text-slate-400">···</span></Link><button onClick={signOut} disabled={signingOut} className="mt-2 w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60">{signingOut ? 'Signing out…' : 'Sign out'}</button></div>
      </aside>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex h-[68px] max-w-[1500px] items-center justify-between px-4 sm:px-7 xl:px-9"><Link to="/" className="flex items-center gap-2.5 lg:hidden"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#242852] text-xs font-bold text-white">C<span className="text-teal-300">.</span></span><strong className="text-sm">Continuity<span className="text-indigo-600">OS</span></strong></Link><div className="hidden min-w-0 items-center gap-2 text-xs text-slate-400 lg:flex"><span>Workspace</span><span>/</span><span className="font-medium text-slate-700">{navItems.find(item => item.to === window.location.pathname)?.label || 'Project space'}</span></div><nav aria-label="Mobile navigation" className="flex items-center gap-1 overflow-x-auto lg:hidden">{navItems.map(item => <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-medium ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500'}`}>{item.label}</NavLink>)}</nav><div className="flex items-center gap-3"><Link to="/settings" aria-label="Account settings" className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-[11px] font-semibold text-white">{initials}</Link><div className="hidden items-center gap-3 lg:flex"><span className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] text-slate-500">Private workspace</span><Link to="/projects/create" className="rounded-xl bg-[#242852] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-800">＋ New project</Link></div></div></div>
        </header>
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7 sm:py-8 xl:px-9"><Outlet /></main>
      </div>
    </div>
  )
}
