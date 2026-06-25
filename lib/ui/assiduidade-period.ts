'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'
import type { PeriodAssid } from '@/lib/mock/assiduidade'

type Row = { personKey: string; atrasos: number; abonados: number; minutos: number; advertencias: number }

// Busca a assiduidade por pessoa no período (do banco local, /api/assiduidade-metrics)
// e devolve um Map p/ alimentar o assiduidadeVM(data, map).
export function useAssiduidadePeriod(): { map: PeriodAssid | null; loading: boolean } {
  const { period } = usePeriod()
  const [map, setMap] = useState<PeriodAssid | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/assiduidade-metrics?period=${encodeURIComponent(period)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { byPerson: Row[] }) => {
        if (!alive) return
        const m: PeriodAssid = new Map()
        for (const u of d.byPerson) m.set(u.personKey, { atrasos: u.atrasos, abonados: u.abonados, minutos: u.minutos, advertencias: u.advertencias })
        setMap(m)
      })
      .catch(() => alive && setMap(new Map()))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [period])

  return { map, loading }
}
