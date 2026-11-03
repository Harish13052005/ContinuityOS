const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export interface Project { id: string; name: string; description?: string | null; owner_id?: string; current_user_role?: string | null; created_at?: string; members?: unknown[] }
export interface Source { id: string; filename: string; source_type: string; created_at: string; page_count?: number; uploaded_by?: string; project_id?: string }
export interface ProjectMember { id: string; user_id: string; email: string; full_name: string; project_role: string; joined_at: string }
export interface ExtractedItem { id: string; title: string; item_type: string; content: string; confidence?: number; verification_status?: string; created_at: string; original_content?: string | null; review_reason?: string | null; source_id?: string | null }
export interface EvidenceRef { filename?: string; source?: string; excerpt: string; page_number?: number | null; location_reference?: string | null; item_id?: string; title?: string }
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
  stats: { projects: number; sources: number; knowledge_items: number; handovers: number; collaborators: number; needs_review?: number; open_blockers?: number }
  projects: DashboardProject[]
  knowledge_by_type: { type: string; count: number }[]
  recent_items: { id: string; project_id: string; item_type: string; title: string; verification_status: string; created_at: string }[]
  recent_handovers: { id: string; project_id: string; title: string; status: string; created_at: string }[]
}

export interface Reconstruction {
  project_id: string
  project_name: string
  generated_at: string
  timeline: { id: string; title: string; item_type: string; confidence: number; verification_status: string; created_at?: string | null; source_reference: string; labels: string[] }[]
  decision_history: { decision: Record<string, unknown>; evidence: EvidenceRef[]; labels: string[] }[]
  tasks: { pending: Record<string, unknown>[]; completed: Record<string, unknown>[]; ownership_gaps: Record<string, unknown>[] }
  dependencies: { dependency_graph: { nodes: { id: string; label: string; status: string }[]; edges: unknown[] }; total_dependencies: number }
  risks_blockers: { risks: Record<string, unknown>[]; blockers: Record<string, unknown>[]; risk_count: number; blocker_count: number }
  unresolved_questions: { id: string; title: string; content: string; confidence: number; labels: string[]; evidence: EvidenceRef[] }[]
  milestones: { id: string; title: string; content: string; confidence: number; has_date: boolean; labels: string[]; evidence: EvidenceRef[] }[]
  conflicts: { item_a: Record<string, unknown>; item_b: Record<string, unknown>; similarity: number; labels: string[] }[]
  label_mapping: { item_id: string; item_type: string; labels: string[] }[]
}

function errorMessage(data: unknown, fallback: string) {
  const detail = (data as { detail?: unknown; message?: unknown } | null)?.detail ?? (data as { message?: unknown } | null)?.message
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map(item => typeof item === 'string' ? item : item?.msg || JSON.stringify(item)).join(' · ') || fallback
  }
  return fallback
}

const handleResponse = async (response: Response) => {
  if (response.status === 401 && !response.url.includes('/auth/login')) {
    localStorage.removeItem('token')
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(errorMessage(data, response.status === 401 ? 'Your session expired. Please sign in again.' : 'Request failed'))
  }
  return { data }
}

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` })

export const api = {
  dashboard: {
    get: () => fetch(`${API_BASE}/api/v1/dashboard`, { headers: authHeader() }).then(handleResponse),
  },
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
    logout: () => fetch(`${API_BASE}/api/v1/auth/logout`, { method: 'POST', headers: authHeader() }).then(handleResponse),
    getCurrentUser: () => fetch(`${API_BASE}/api/v1/auth/me`, { headers: authHeader() }).then(handleResponse),
    updateCurrentUser: (payload: { full_name: string }) => fetch(`${API_BASE}/api/v1/auth/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(payload),
    }).then(handleResponse),
  },
  projects: {
    list: () => fetch(`${API_BASE}/api/v1/projects`, { headers: authHeader() }).then(handleResponse),
    create: (payload: { name: string; description?: string }) =>
      fetch(`${API_BASE}/api/v1/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(payload),
      }).then(handleResponse),
    get: (projectId: string) => fetch(`${API_BASE}/api/v1/projects/${projectId}`, { headers: authHeader() }).then(handleResponse),
    members: (projectId: string) => fetch(`${API_BASE}/api/v1/projects/${projectId}/members`, { headers: authHeader() }).then(handleResponse),
    invite: (projectId: string, payload: { email: string; project_role: 'admin' | 'reviewer' | 'contributor' }) => fetch(`${API_BASE}/api/v1/projects/${projectId}/members`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify(payload),
    }).then(handleResponse),
    removeMember: (projectId: string, userId: string) => fetch(`${API_BASE}/api/v1/projects/${projectId}/members/${userId}`, {
      method: 'DELETE', headers: authHeader(),
    }).then(handleResponse),
  },
  sources: {
    list: (projectId: string) => fetch(`${API_BASE}/api/v1/projects/${projectId}/sources`, { headers: authHeader() }).then(handleResponse),
    upload: (projectId: string, file: File) => {
      const form = new FormData()
      form.append('file', file)
      return fetch(`${API_BASE}/api/v1/projects/${projectId}/sources`, { method: 'POST', headers: authHeader(), body: form }).then(handleResponse)
    },
    remove: (projectId: string, sourceId: string) =>
      fetch(`${API_BASE}/api/v1/sources/${sourceId}`, { method: 'DELETE', headers: authHeader() }).then(handleResponse),
    preview: (sourceId: string) => fetch(`${API_BASE}/api/v1/sources/${sourceId}/preview`, { headers: authHeader() }).then(handleResponse),
  },
  extractedItems: {
    list: (projectId: string) => fetch(`${API_BASE}/api/v1/projects/${projectId}/extracted-items`, { headers: authHeader() }).then(handleResponse),
    review: (projectId: string, itemId: string, payload: { verification_status: 'supported' | 'needs_review' | 'conflicting' | 'stale' | 'unverified'; review_reason: string; title?: string; content?: string }) =>
      fetch(`${API_BASE}/api/v1/projects/${projectId}/extracted-items/${itemId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify(payload),
      }).then(handleResponse),
    evidence: (projectId: string, itemId: string) => fetch(`${API_BASE}/api/v1/projects/${projectId}/extracted-items/${itemId}/evidence`, { headers: authHeader() }).then(handleResponse),
  },
  extraction: {
    fromSource: (sourceId: string) => fetch(`${API_BASE}/api/v1/extraction/source/${sourceId}`, {
      method: 'POST', headers: authHeader(),
    }).then(handleResponse),
  },
  reconstruction: {
    get: (projectId: string) => fetch(`${API_BASE}/api/v1/reconstruction/project/${projectId}/state`, {
      method: 'GET', headers: authHeader(),
    }).then(handleResponse),
  },
  handovers: {
    list: (projectId: string) =>
      fetch(`${API_BASE}/api/v1${projectId ? `/projects/${projectId}/handovers` : '/handovers'}`, { headers: authHeader() }).then(handleResponse),
    get: (handoverId: string) => fetch(`${API_BASE}/api/v1/handovers/${handoverId}`, { headers: authHeader() }).then(handleResponse),
    create: (projectId: string, payload: { title: string; status?: string; recipient_email?: string }) =>
      fetch(`${API_BASE}/api/v1/projects/${projectId}/handovers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify(payload),
      }).then(handleResponse),
    approve: (handoverId: string) => fetch(`${API_BASE}/api/v1/handovers/${handoverId}/approve`, { method: 'POST', headers: authHeader() }).then(handleResponse),
    share: (handoverId: string, recipient_email: string) => fetch(`${API_BASE}/api/v1/handovers/${handoverId}/share`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify({ recipient_email }),
    }).then(handleResponse),
    exportPdf: (handoverId: string) => fetch(`${API_BASE}/api/v1/handovers/${handoverId}/export.pdf`, { headers: authHeader() }).then(async response => {
      if (!response.ok) throw new Error(errorMessage(await response.json().catch(() => null), 'Could not export PDF'))
      return response.blob()
    }),
  },
}
