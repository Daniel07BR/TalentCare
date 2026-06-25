'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'
import type { HelpdeskUsage } from '@/lib/mock/helpdesk'

// Busca a atividade do HelpDesk por usuário no período selecionado (do banco
// local, /api/helpdesk-metrics) e devolve um Map p/ alimentar o helpdeskVM(data, map).
export function useHelpdeskPeriod(): { map: HelpdeskUsage | null; loading: boolean } {
  const { period } = usePeriod()
  const [map, setMap] = useState<HelpdeskUsage | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/helpdesk-metrics?period=${encodeURIComponent(period)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { byUser: { nexusUserId: string; opened: number; resolved: number; formalized: number; resolvedSeconds: number }[] }) => {
        if (!alive) return
        const m: HelpdeskUsage = new Map()
        for (const u of d.byUser) m.set(u.nexusUserId, { opened: u.opened, resolved: u.resolved, formalized: u.formalized, resolvedSeconds: u.resolvedSeconds })
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
