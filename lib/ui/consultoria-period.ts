'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'
import type { ConsultoriaUsage } from '@/lib/mock/consultoria'

// Busca a atividade do Consultoria Plus por usuário no período selecionado (do
// banco local, /api/consultoria-metrics) e devolve um Map p/ alimentar o
// consultoriaVM(data, map).
export function useConsultoriaPeriod(): { map: ConsultoriaUsage | null; loading: boolean; erro: boolean } {
  const { period, query } = usePeriod()
  const [map, setMap] = useState<ConsultoriaUsage | null>(null)
  const [loading, setLoading] = useState(true)
  /* ⚠️ A leitura FALHOU (11/09/2026). O `catch` segue pondo um mapa vazio, como
     sempre, mas agora diz que foi erro: mapa vazio se lê "nenhuma atividade no
     período", e uma queda de rede não é isso. O painel novo mostra o erro. */
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setErro(false)
    fetch(`/api/consultoria-metrics?${query}`, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then((d: { byUser: { nexusUserId: string; studies: number; tickets: number; messages: number; comments: number }[] }) => {
        if (!alive) return
        const m: ConsultoriaUsage = new Map()
        for (const u of d.byUser) m.set(u.nexusUserId, { studies: u.studies, tickets: u.tickets, messages: u.messages, comments: u.comments })
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
