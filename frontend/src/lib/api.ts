import { useEffect, useState } from 'react'

// API client for ContinuityOS backend
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface ErrorResponse {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

const handleResponse = async (response: Response) => {
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Request failed')
  }

  return data
}

export const api = {
  // Auth endpoints
  auth: {
    register: (payload: { email: string; full_name: string; password: string }) =>
      fetch(`${API_BASE}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(handleResponse),

    login: (payload: { username: string; password: string }) =>
      fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: payload.username, password: payload.password }),
      }).then(handleResponse),

    logout: () =>
      fetch(`${API_BASE}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).then(handleResponse),

    getCurrentUser: () => fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }).then(handleResponse),
  },

  // Project endpoints
  projects: {
    list: () => fetch(`${API_BASE}/api/v1/projects`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }).then(handleResponse),

    create: (payload: { name: string; description?: string }) =>
      fetch(`${API_BASE}/api/v1/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      }).then(handleResponse),

    get: (projectId: string) =>
      fetch(`${API_BASE}/api/v1/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      }).then(handleResponse),
  },

  // Source endpoints
  sources: {
    list: (projectId: string) =>
      fetch(`${API_BASE}/api/v1/projects/${projectId}/sources`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      }).then(handleResponse),

    create: (projectId: string, payload: { filename: string; source_type: string }) =>
      fetch(`${API_BASE}/api/v1/projects/${projectId}/sources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      }).then(handleResponse),

    remove: (projectId: string, sourceId: string) =>
      fetch(`${API_BASE}/api/v1/projects/${projectId}/sources/${sourceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      }).then(handleResponse),
  },

  // Extracted items endpoints
  extractedItems: {
    list: (projectId: string) =>
      fetch(`${API_BASE}/api/v1/projects/${projectId}/extracted-items`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      }).then(handleResponse),

    create: (projectId: string, payload: {
      item_type: string
      title: string
      content: string
      confidence?: number
    }) =>
      fetch(`${API_BASE}/api/v1/projects/${projectId}/extracted-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      }).then(handleResponse),

    update: (projectId: string, itemId: string, payload: any) =>
      fetch(`${API_BASE}/api/v1/projects/${projectId}/extracted-items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      }).then(handleResponse),
  },

  // Handovers endpoints
  handovers: {
    list: (projectId: string) =>
      fetch(`${API_BASE}/api/v1/projects/${projectId}/handovers`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      }).then(handleResponse),

    create: (projectId: string, payload: {
      title: string
      status?: string
    }) =>
      fetch(`${API_BASE}/api/v1/projects/${projectId}/handovers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      }).then(handleResponse),
  },

  // Evidence endpoints
  evidence: {
    list: (extractedItemId: string, sourceId: string) =>
      fetch(`${API_BASE}/api/v1/evidence`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      }).then(handleResponse),
  },
}

export type { ApiResponse, ErrorResponse }