'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'
import type { ConsultoriaUsage } from '@/lib/mock/consultoria'

// Busca a atividade do Consultoria Plus por usuário no período selecionado (do
// banco local, /api/consultoria-metrics) e devolve um Map p/ alimentar o
// consultoriaVM(data, map).
export function useConsultoriaPeriod(): { map: ConsultoriaUsage | null; loading: boolean } {
  const { period } = usePeriod()
  const [map, setMap] = useState<ConsultoriaUsage | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/consultoria-metrics?period=${encodeURIComponent(period)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { byUser: { nexusUserId: string; studies: number; tickets: number; messages: number; comments: number }[] }) => {
        if (!alive) return
        const m: ConsultoriaUsage = new Map()
        for (const u of d.byUser) m.set(u.nexusUserId, { studies: u.studies, tickets: u.tickets, messages: u.messages, comments: u.comments })
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
