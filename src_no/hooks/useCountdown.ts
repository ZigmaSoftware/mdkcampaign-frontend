import { useState, useEffect } from 'react'
import { ELECTION_DATE } from '../constants/app.constants'

interface CountdownValues {
  d: string
  h: string
  m: string
  s: string
  expired: boolean
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function compute(): CountdownValues {
  const diff = ELECTION_DATE.getTime() - Date.now()
  if (diff <= 0) return { d: '00', h: '00', m: '00', s: '00', expired: true }
  const d = Math.floor(diff / 864e5)
  const h = Math.floor((diff % 864e5) / 36e5)
  const m = Math.floor((diff % 36e5) / 6e4)
  const s = Math.floor((diff % 6e4) / 1e3)
  return { d: pad(d), h: pad(h), m: pad(m), s: pad(s), expired: false }
}

export function useCountdown(): CountdownValues {
  const [values, setValues] = useState<CountdownValues>(compute)
  useEffect(() => {
    const id = setInterval(() => setValues(compute()), 1000)
    return () => clearInterval(id)
  }, [])
  return values
}
