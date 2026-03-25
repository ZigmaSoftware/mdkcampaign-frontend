import { useState, useEffect } from 'react'

function formatPollTime(): string {
  return new Date()
    .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    .toUpperCase()
}

export function usePollClock(): string {
  const [time, setTime] = useState(formatPollTime)
  useEffect(() => {
    const id = setInterval(() => setTime(formatPollTime()), 1000)
    return () => clearInterval(id)
  }, [])
  return time
}
