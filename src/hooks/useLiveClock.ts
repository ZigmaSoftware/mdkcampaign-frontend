import { useState, useEffect } from 'react'

function format(): string {
  return new Date().toLocaleString('en-IN', {
    weekday: 'short',
    day:     '2-digit',
    month:   'short',
    year:    'numeric',
    hour:    '2-digit',
    minute:  '2-digit',
    second:  '2-digit',
  })
}

export function useLiveClock(): string {
  const [clock, setClock] = useState(format)
  useEffect(() => {
    const id = setInterval(() => setClock(format()), 1000)
    return () => clearInterval(id)
  }, [])
  return clock
}
