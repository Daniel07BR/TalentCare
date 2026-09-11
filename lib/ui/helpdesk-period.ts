'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'
import type { HelpdeskUsage } from '@/lib/mock/helpdesk'

// Busca a atividade do HelpDesk por usuário no período selecionado (do banco
// local, /api/helpdesk-metrics) e devolve um Map p/ alimentar o helpdeskVM(data, map).
export function useHelpdeskPeriod(): { map: HelpdeskUsage | null; loading: boolean; erro: boolean } {
  const { period, query } = usePeriod()
  const [map, setMap] = useState<HelpdeskUsage | null>(null)
  const [loading, setLoading] = useState(true)
  /* ⚠️ A leitura FALHOU (11/09/2026). O `catch` segue pondo um mapa vazio, como
     sempre, mas agora diz que foi erro: mapa vazio se lê "nenhuma atividade no
     período", e uma queda de rede não é isso. O painel novo mostra o erro. */
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setErro(false)
    fetch(`/api/helpdesk-metrics?${query}`, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then((d: { byUser: { nexusUserId: string; opened: number; resolved: number; formalized: number; resolvedSeconds: number }[] }) => {
        if (!alive) return
        const m: HelpdeskUsage = new Map()
        for (const u of d.byUser) m.set(u.nexusUserId, { opened: u.opened, resolved: u.resolved, formalized: u.formalized, resolvedSeconds: u.resolvedSeconds })
        setMap(m)
      })
      .catch(() => { if (alive) { setMap(new Map()); setErro(true) } })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [query])

  return { map, loading, erro }
}
