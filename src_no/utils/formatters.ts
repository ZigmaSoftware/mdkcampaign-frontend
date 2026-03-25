export function toIndianLocale(n: number): string {
  return n.toLocaleString('en-IN')
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function padTwo(n: number): string {
  return String(n).padStart(2, '0')
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function nowDatetimeLocal(): string {
  return new Date().toISOString().slice(0, 16)
}

export function currentDateLabel(): string {
  return new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}
