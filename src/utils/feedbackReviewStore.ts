/* Feedback Review decisions — persisted to localStorage */

export type ReviewAction = 'followup_required' | 'followup_not_required'

export interface ReviewDecision {
  record_id:       number
  voter_name:      string
  telecaller_name: string
  action:          ReviewAction
  date:            string
}

const STORAGE_KEY = 'feedback_review_decisions'

function load(): ReviewDecision[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function save(decisions: ReviewDecision[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions)) } catch {}
}

let decisions: ReviewDecision[] = load()
const listeners = new Set<() => void>()

export function setDecision(d: ReviewDecision) {
  decisions = [
    ...decisions.filter(x => x.record_id !== d.record_id),
    d,
  ]
  save(decisions)
  listeners.forEach(fn => fn())
}

export function getDecisions(): ReviewDecision[] {
  return decisions
}

export function getDecisionByRecordId(id: number): ReviewDecision | undefined {
  return decisions.find(d => d.record_id === id)
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
