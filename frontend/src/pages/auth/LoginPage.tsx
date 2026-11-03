import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'

export const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { signIn, token } = useAuth()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const response = await api.auth.login({ username: email, password })
      const accessToken = response.data?.access_token
      if (!accessToken) throw new Error('Sign-in succeeded but no session token was returned.')
      await signIn(accessToken)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in. Check your details and try again.')
    } finally { setLoading(false) }
  }

  if (token) return <Navigate to="/" replace />

  return <main className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_.95fr]">
    <section className="relative isolate hidden overflow-hidden bg-[#202445] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-20"><div aria-hidden="true" className="absolute -right-32 top-[-5rem] -z-10 h-[34rem] w-[34rem] rounded-full border border-white/[.08]"/><div aria-hidden="true" className="absolute -right-12 top-12 -z-10 h-[27rem] w-[27rem] rounded-full border border-white/[.08]"/><div aria-hidden="true" className="absolute right-12 top-32 -z-10 h-[19rem] w-[19rem] rounded-full border border-white/[.08]"/><div aria-hidden="true" className="absolute bottom-[-8rem] left-[-8rem] -z-10 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl"/>
      <Link to="/login" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/10 text-sm font-bold">C<span className="text-teal-300">.</span></span><span><strong className="block text-sm">Continuity<span className="text-teal-300">OS</span></strong><small className="text-[10px] uppercase tracking-[.15em] text-indigo-200">Project memory</small></span></Link>
      <div className="max-w-xl"><span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.14em] text-teal-200">Knowledge that moves work forward</span><h1 className="mt-6 text-5xl font-semibold leading-[1.12] tracking-tight xl:text-6xl">Good work deserves to be remembered.</h1><p className="mt-5 max-w-lg text-base leading-7 text-slate-300">Bring project sources, decisions, risks, and next steps together. Give every teammate the context to keep moving.</p>
        <div className="mt-10 grid max-w-md grid-cols-3 gap-3"><div className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><span className="text-xs text-indigo-200">Capture</span><strong className="mt-2 block text-sm">Source-backed</strong><span className="mt-1 block text-[10px] text-slate-400">Project memory</span></div><div className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><span className="text-xs text-teal-200">Connect</span><strong className="mt-2 block text-sm">Team decisions</strong><span className="mt-1 block text-[10px] text-slate-400">Clear ownership</span></div><div className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><span className="text-xs text-amber-200">Continue</span><strong className="mt-2 block text-sm">Useful handovers</strong><span className="mt-1 block text-[10px] text-slate-400">Less lost context</span></div></div></div>
      <p className="text-xs text-slate-400">One shared memory for the work behind the work.</p>
    </section>
    <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-10"><div className="w-full max-w-[410px]"><Link to="/login" className="mb-10 flex items-center gap-2.5 lg:hidden"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#202445] text-sm font-bold text-white">C<span className="text-teal-300">.</span></span><strong className="text-sm">Continuity<span className="text-indigo-600">OS</span></strong></Link><div className="mb-8"><p className="text-xs font-semibold uppercase tracking-[.14em] text-indigo-600">Welcome back</p><h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Sign in to your workspace</h2><p className="mt-2 text-sm leading-6 text-slate-500">Your team's project context is waiting for you.</p></div>
      <form onSubmit={handleSubmit} className="space-y-5"><div><label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-slate-700">Email address</label><input id="email" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50" placeholder="you@company.com" /></div><div><div className="mb-1.5 flex items-center justify-between"><label htmlFor="password" className="block text-xs font-semibold text-slate-700">Password</label></div><div className="relative"><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 pr-16 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50" placeholder="Enter your password"/><button type="button" onClick={() => setShowPassword(value => !value)} className="absolute inset-y-0 right-3 text-xs font-medium text-slate-500 hover:text-indigo-600">{showPassword ? 'Hide' : 'Show'}</button></div></div>{error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">{error}</div>}<button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#242852] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-800 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-wait disabled:opacity-60">{loading ? 'Signing in…' : 'Sign in'}{!loading && <span aria-hidden="true">→</span>}</button></form>
      <p className="mt-7 text-center text-sm text-slate-500">New to ContinuityOS? <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-800">Create an account</Link></p><p className="mt-12 text-center text-[11px] leading-5 text-slate-400">By continuing, you’ll enter your private project workspace.</p></div></section>
  </main>
}
