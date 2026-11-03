export const itemLabels: Record<string, string> = {
  decision: 'Decision',
  task: 'Task',
  risk: 'Risk',
  blocker: 'Blocker',
  dependency: 'Dependency',
  question: 'Question',
  milestone: 'Milestone',
  responsibility: 'Owner',
}

export const statusLabels: Record<string, string> = {
  supported: 'Supported',
  verified: 'Supported',
  needs_review: 'Needs review',
  pending: 'Needs review',
  conflicting: 'Conflicting',
  disputed: 'Conflicting',
  stale: 'Stale',
  unverified: 'Unverified',
  draft: 'Draft',
  approved: 'Approved',
  ready: 'Ready',
  shared: 'Shared',
}

export const statusTone: Record<string, string> = {
  supported: 'badge-supported',
  verified: 'badge-supported',
  needs_review: 'badge-review',
  pending: 'badge-review',
  conflicting: 'badge-conflict',
  disputed: 'badge-conflict',
  stale: 'badge-stale',
  unverified: 'badge-unverified',
  draft: 'badge-review',
  approved: 'badge-supported',
  ready: 'badge-supported',
  shared: 'badge-supported',
}

export function formatStatus(value?: string | null) {
  if (!value) return 'Unverified'
  return statusLabels[value] || value.replace(/_/g, ' ')
}

export function formatKind(value?: string | null) {
  if (!value) return 'Item'
  return itemLabels[value] || value.replace(/_/g, ' ')
}

export function initials(name?: string | null) {
  if (!name) return 'CO'
  return name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

export function asList<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : []
}
