'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'
import type { CideUsage } from '@/lib/mock/cide'

// Busca a atividade do CIDE por usuário no período (do banco local,
// /api/cide-metrics) e devolve um Map p/ alimentar o cideVM(data, map).
export function useCidePeriod(): { map: CideUsage | null; loading: boolean } {
  const { period } = usePeriod()
  const [map, setMap] = useState<CideUsage | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/cide-metrics?period=${encodeURIComponent(period)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { byUser: { nexusUserId: string; atividades: number }[] }) => {
        if (!alive) return
        const m: CideUsage = new Map()
        for (const u of d.byUser) m.set(u.nexusUserId, { atividades: u.atividades })
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
