'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'
import type { PeriodUsage } from '@/lib/mock/radio'

// Busca o uso da rádio por usuário no período selecionado (do banco local,
// /api/radio-metrics) e devolve um Map p/ alimentar o radioVM(data, map).
export function useRadioPeriod(): { map: PeriodUsage | null; loading: boolean } {
  const { period } = usePeriod()
  const [map, setMap] = useState<PeriodUsage | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/radio-metrics?period=${encodeURIComponent(period)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { byUser: { nexusUserId: string; seconds: number; sessions: number }[] }) => {
        if (!alive) return
        const m: PeriodUsage = new Map()
        for (const u of d.byUser) m.set(u.nexusUserId, { seconds: u.seconds, sessions: u.sessions })
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
