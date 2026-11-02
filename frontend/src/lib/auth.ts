import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useNavigate } from 'react-router-dom'

export interface User {
  id: string
  email: string
  full_name: string
  role: string
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await api.auth.getCurrentUser()
        setUser(response.data)
      } catch (error) {
        // User not authenticated, redirect to login
        localStorage.removeItem('token')
        navigate('/login')
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  return { user, loading }
}

export const useNavigate = () => {
  const navigate = useNavigate()
  return navigate
}