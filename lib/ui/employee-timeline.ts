'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'

export type TimelineEvent = { system: string; color: string; action: string; detail: string; day: string; when: string }

// Linha do tempo REAL da pessoa no período (do banco local). null enquanto carrega.
export function useEmployeeTimeline(id: string): { events: TimelineEvent[] | null; loading: boolean } {
  const { period, query } = usePeriod()
  const [events, setEvents] = useState<TimelineEvent[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/employee-timeline?id=${encodeURIComponent(id)}&${query}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { timeline: TimelineEvent[] } | null) => { if (alive) setEvents(d?.timeline ?? []) })
      .catch(() => alive && setEvents([]))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [id, query])

  return { events, loading }
}
