import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from './api'

export interface User {
  id: string
  email: string
  full_name: string
  role: string
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('token')))
  const navigate = useNavigate()

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      setLoading(false)
      return
    }

    let active = true
    api.auth.getCurrentUser()
      .then(response => { if (active) setUser(response.data) })
      .catch(() => {
        localStorage.removeItem('token')
        if (active) {
          setUser(null)
          navigate('/login', { replace: true })
        }
      })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [navigate])

  return { user, loading }
}
