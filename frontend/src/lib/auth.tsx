import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from './api'

export interface User {
  id: string
  email: string
  full_name: string
  role: string
}

type AuthContextValue = {
  user: User | null
  loading: boolean
  token: string | null
  signIn: (accessToken: string) => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('token')))

  const refresh = useCallback(async () => {
    const current = localStorage.getItem('token')
    if (!current) {
      setToken(null)
      setUser(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const response = await api.auth.getCurrentUser()
      setUser(response.data)
      setToken(current)
    } catch {
      localStorage.removeItem('token')
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const signIn = useCallback(async (accessToken: string) => {
    localStorage.setItem('token', accessToken)
    setToken(accessToken)
    setLoading(true)
    try {
      const response = await api.auth.getCurrentUser()
      setUser(response.data)
    } catch {
      localStorage.removeItem('token')
      setToken(null)
      setUser(null)
      throw new Error('Signed in, but the account profile could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await api.auth.logout()
    } catch {
      /* Local sign-out still works when the API is offline. */
    }
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, token, signIn, signOut, refresh }), [user, loading, token, signIn, signOut, refresh])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
