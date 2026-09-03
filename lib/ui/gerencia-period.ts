'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'
import type { GerenciaUsage } from '@/lib/mock/gerencia'
import type { GerenciaStat } from '@/lib/mock/data'

// Busca a atividade da Gerência por usuário no período (do banco local,
// /api/gerencia-metrics) e devolve um Map p/ alimentar o gerenciaVM(data, map).
export function useGerenciaPeriod(): { map: GerenciaUsage | null; loading: boolean } {
  const { period, query } = usePeriod()
  const [map, setMap] = useState<GerenciaUsage | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/gerencia-metrics?${query}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { byUser: ({ nexusUserId: string } & GerenciaStat)[] }) => {
        if (!alive) return
        const m: GerenciaUsage = new Map()
        for (const u of d.byUser) {
          const { nexusUserId, ...stat } = u
          m.set(nexusUserId, stat)
        }
        setMap(m)
      })
      .catch(() => alive && setMap(new Map()))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [query])

  return { map, loading }
}
