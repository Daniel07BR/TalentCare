'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'
import type { ClassroomUsage } from '@/lib/mock/classroom'

// Busca o uso do ClassRoom por usuário no período (banco local) p/ o classroomVM.
export function useClassroomPeriod(): { map: ClassroomUsage | null; loading: boolean } {
  const { period } = usePeriod()
  const [map, setMap] = useState<ClassroomUsage | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/classroom-metrics?period=${encodeURIComponent(period)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { byUser: { nexusUserId: string; videos: number; courses: number; created: number }[] }) => {
        if (!alive) return
        const m: ClassroomUsage = new Map()
        for (const u of d.byUser) m.set(u.nexusUserId, { videos: u.videos, courses: u.courses, created: u.created })
        setMap(m)
      })
      .catch(() => alive && setMap(new Map()))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [period])

  return { map, loading }
}
