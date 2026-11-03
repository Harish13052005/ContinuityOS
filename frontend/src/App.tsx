import { useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { initials } from './lib/format'

const navItems = [
  { label: 'Dashboard', to: '/', mark: '01' },
  { label: 'Projects', to: '/projects', mark: '02' },
  { label: 'Sources', to: '/sources', mark: '03' },
  { label: 'Knowledge', to: '/knowledge', mark: '04' },
  { label: 'Review', to: '/review', mark: '05' },
  { label: 'Handovers', to: '/handovers', mark: '06' },
]

function IconMenu({ open }: { open: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  )
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading, token, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!loading && !token) return <Navigate to="/login" replace />

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut()
    navigate('/login', { replace: true })
  }

  const current = navItems.find(item => item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to))
  const name = initials(user?.full_name)

  const nav = (
    <nav aria-label="Main navigation" className="mt-3 space-y-1">
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : 'text-indigo-100/70 hover:bg-white/5 hover:text-white'}`}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-[10px] font-bold tracking-wide">{item.mark}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )

  const sidebarBody = (
    <>
      <Link to="/" className="flex h-[76px] items-center gap-3 border-b border-white/10 px-6" onClick={() => setMobileOpen(false)}>
        <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white text-sm font-bold tracking-tight text-[#242852] shadow-[0_5px_12px_rgba(36,40,82,.2)]">C<span className="text-teal-500">.</span></span>
        <span>
          <strong className="block text-sm tracking-tight text-white">Continuity<span className="text-teal-300">OS</span></strong>
          <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[.16em] text-indigo-200/70">Evidence-driven handover</span>
        </span>
      </Link>
      <div className="px-4 pt-7">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-[.17em] text-indigo-200/60">Workspace</p>
        {nav}
      </div>
      <div className="mx-4 mt-8 rounded-2xl bg-gradient-to-br from-[#3b3f73] to-[#1d2146] p-4 text-white ring-1 ring-white/10">
        <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-teal-200">Connect · Reconstruct · Verify</p>
        <strong className="mt-2 block text-base font-semibold">Transfer understanding, not just files.</strong>
        <p className="mt-2 text-xs leading-5 text-indigo-100/75">Every claim stays tied to a source. Reviewers decide what gets handed over.</p>
        <Link to="/projects" onClick={() => setMobileOpen(false)} className="mt-3 inline-flex text-xs font-semibold text-white hover:text-teal-200">Open projects →</Link>
      </div>
      <div className="mt-auto border-t border-white/10 p-4">
        <Link to="/settings" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-xs font-semibold text-white">{name}</span>
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-xs font-semibold text-white">{user?.full_name || 'Your account'}</strong>
            <span className="block truncate text-[10px] text-indigo-200/70">{user?.email || 'Personal workspace'}</span>
          </span>
        </Link>
        <button onClick={handleSignOut} disabled={signingOut} className="mt-2 w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-indigo-200/80 transition hover:bg-rose-500/10 hover:text-rose-200 disabled:opacity-60">
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </>
  )

  return (
    <div className="app-shell">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-[#1c1f3d] lg:flex">{sidebarBody}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/50" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 flex h-full w-[248px] flex-col bg-[#1c1f3d] shadow-2xl">{sidebarBody}</aside>
        </div>
      )}
      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex h-[68px] max-w-[1500px] items-center justify-between gap-3 px-4 sm:px-7 xl:px-9">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(open => !open)} aria-label="Open navigation">
                <IconMenu open={mobileOpen} />
              </button>
              <div className="hidden min-w-0 items-center gap-2 text-xs text-slate-400 lg:flex">
                <span>Workspace</span><span>/</span>
                <span className="font-medium text-slate-700">{current?.label || 'Project space'}</span>
              </div>
            </div>
            <nav aria-label="Mobile navigation" className="hidden items-center gap-1 overflow-x-auto sm:flex lg:hidden">
              {navItems.map(item => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-medium ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500'}`}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <span className="hidden rounded-full border border-slate-200 px-3 py-1.5 text-[11px] text-slate-500 md:inline">Private workspace</span>
              <Link to="/projects/create" className="btn-primary">＋ New project</Link>
              <Link to="/settings" aria-label="Account settings" className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-[11px] font-semibold text-white">{name}</Link>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7 sm:py-8 xl:px-9">
          {loading ? <div className="h-40 animate-pulse rounded-3xl bg-white/70" /> : <Outlet />}
        </main>
      </div>
    </div>
  )
}
