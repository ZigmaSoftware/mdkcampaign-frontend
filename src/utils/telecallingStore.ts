/* Telecalling assignment store — persisted to localStorage */

export interface AssignedVoter {
  id: number
  name: string
  voter_id: string
  phone?: string
  address?: string
  booth: number
  booth_name?: string
  age?: number
  gender?: string
}

export interface AssignmentGroup {
  id: string
  telecaller: { id: number; name: string; phone?: string }
  voters: AssignedVoter[]
  date: string
}

const STORAGE_KEY = 'telecalling_assignments'

function load(): AssignmentGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save(groups: AssignmentGroup[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups))
  } catch {}
}

let groups: AssignmentGroup[] = load()
const listeners = new Set<() => void>()

export function addGroup(group: AssignmentGroup) {
  groups = [...groups, group]
  save(groups)
  listeners.forEach(fn => fn())
}

export function getGroups(): AssignmentGroup[] {
  return groups
}

export function removeVoterByName(voterName: string) {
  const lower = voterName.toLowerCase()
  groups = groups
    .map(g => ({ ...g, voters: g.voters.filter(v => v.name.toLowerCase() !== lower) }))
    .filter(g => g.voters.length > 0)
  save(groups)
  listeners.forEach(fn => fn())
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
