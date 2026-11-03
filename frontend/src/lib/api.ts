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

export interface Project { id: string; name: string; description?: string | null; owner_id?: string; current_user_role?: string | null; created_at?: string; members?: unknown[] }
export interface Source { id: string; filename: string; source_type: string; created_at: string; page_count?: number }
export interface ProjectMember { id: string; user_id: string; email: string; full_name: string; project_role: string; joined_at: string }
export interface ExtractedItem { id: string; title: string; item_type: string; content: string; confidence?: number; verification_status?: string; created_at: string; original_content?: string | null; review_reason?: string | null }
export interface Handover {
  id: string; project_id: string; title: string; status: string; version: number; created_at: string
  recipient_email?: string | null; recipient_name?: string | null
  project_overview?: string | null; current_status?: string | null; decisions?: string | null
  pending_tasks?: string | null; dependencies_blockers?: string | null; risks_questions?: string | null
  milestones?: string | null; next_actions?: string | null; missing_conflicting?: string | null
  supporting_evidence?: { item_id: string; title: string; source: string; excerpt: string; page_number?: number | null; location_reference?: string | null }[]
}
export interface DashboardProject extends Project { source_count: number; knowledge_count: number; handover_count: number; members: { full_name: string; role: string }[] }
export interface DashboardData {
  stats: { projects: number; sources: number; knowledge_items: number; handovers: number; collaborators: number }
  projects: DashboardProject[]
  knowledge_by_type: { type: string; count: number }[]
  recent_items: { id: string; project_id: string; item_type: string; title: string; verification_status: string; created_at: string }[]
  recent_handovers: { id: string; project_id: string; title: string; status: string; created_at: string }[]
}

const handleResponse = async (response: Response) => {
  const data = response.status === 204 ? null : await response.json().catch(() => null)

  if (!response.ok) {
    const detail = data?.detail || data?.message
    throw new Error(typeof detail === 'string' ? detail : 'Request failed')
  }

  return { data }
}

export const api = {
  dashboard: {
    get: () => fetch(`${API_BASE}/api/v1/dashboard`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }).then(handleResponse),
  },
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
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      }).then(handleResponse),

    getCurrentUser: () => fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }).then(handleResponse),

    updateCurrentUser: (payload: { full_name: string }) => fetch(`${API_BASE}/api/v1/auth/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(payload),
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

    members: (projectId: string) => fetch(`${API_BASE}/api/v1/projects/${projectId}/members`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }).then(handleResponse),

    invite: (projectId: string, payload: { email: string; project_role: 'admin' | 'reviewer' | 'contributor' }) => fetch(`${API_BASE}/api/v1/projects/${projectId}/members`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify(payload),
    }).then(handleResponse),

    removeMember: (projectId: string, userId: string) => fetch(`${API_BASE}/api/v1/projects/${projectId}/members/${userId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }).then(handleResponse),
  },

  // Source endpoints
  sources: {
    list: (projectId: string) =>
      fetch(`${API_BASE}/api/v1/projects/${projectId}/sources`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      }).then(handleResponse),

    upload: (projectId: string, file: File) => {
      const form = new FormData()
      form.append('file', file)
      return fetch(`${API_BASE}/api/v1/projects/${projectId}/sources`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: form,
      }).then(handleResponse)
    },

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

    preview: (sourceId: string) => fetch(`${API_BASE}/api/v1/sources/${sourceId}/preview`, {
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

    review: (projectId: string, itemId: string, payload: { verification_status: 'supported' | 'needs_review' | 'conflicting' | 'stale' | 'unverified'; review_reason: string; title?: string; content?: string }) =>
      fetch(`${API_BASE}/api/v1/projects/${projectId}/extracted-items/${itemId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify(payload),
      }).then(handleResponse),

    evidence: (projectId: string, itemId: string) => fetch(`${API_BASE}/api/v1/projects/${projectId}/extracted-items/${itemId}/evidence`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }).then(handleResponse),
  },

  extraction: {
    fromSource: (sourceId: string) => fetch(`${API_BASE}/api/v1/extraction/source/${sourceId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }).then(handleResponse),
  },

  // Handovers endpoints
  handovers: {
    list: (projectId: string) =>
      fetch(`${API_BASE}/api/v1${projectId ? `/projects/${projectId}/handovers` : '/handovers'}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      }).then(handleResponse),

    get: (handoverId: string) => fetch(`${API_BASE}/api/v1/handovers/${handoverId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }).then(handleResponse),

    create: (projectId: string, payload: {
      title: string
      status?: string
      recipient_email?: string
    }) =>
      fetch(`${API_BASE}/api/v1/projects/${projectId}/handovers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      }).then(handleResponse),

    approve: (handoverId: string) => fetch(`${API_BASE}/api/v1/handovers/${handoverId}/approve`, {
      method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }).then(handleResponse),

    share: (handoverId: string, recipient_email: string) => fetch(`${API_BASE}/api/v1/handovers/${handoverId}/share`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ recipient_email }),
    }).then(handleResponse),

    exportPdf: (handoverId: string) => fetch(`${API_BASE}/api/v1/handovers/${handoverId}/export.pdf`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }).then(async response => {
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.detail || 'Could not export PDF')
      return response.blob()
    }),
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
