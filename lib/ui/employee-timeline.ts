'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'

export type TimelineEvent = { system: string; color: string; action: string; detail: string; day: string; when: string }

/**
 * Linha do tempo REAL da pessoa no período.
 *
 * ⚠️⚠️ TRÊS ESTADOS, e a razão é a pior linha que a ficha já teve. Antes, um 403
 * ou uma falha de rede caía em `setEvents([])` — e `[]` e "a pessoa não fez
 * nada" eram a mesma coisa para a tela, que imprimia **"Sem atividade registrada
 * nos sistemas integrados neste período"**.
 *
 * Era o único ponto da ficha em que a tela AFIRMAVA UM FATO sobre alguém que ela
 * não verificou — e para o leitor que está prestes a pontuar entrega e
 * iniciativa daquela pessoa. Negativa de permissão virava negativa de trabalho.
 */
export type EstadoTimeline = 'carregando' | 'ok' | 'negado' | 'erro'

export function useEmployeeTimeline(id: string): {
  events: TimelineEvent[] | null
  estado: EstadoTimeline
} {
  const { query } = usePeriod()
  const [events, setEvents] = useState<TimelineEvent[] | null>(null)
  const [estado, setEstado] = useState<EstadoTimeline>('carregando')

  useEffect(() => {
    let alive = true
    setEstado('carregando')
    fetch(`/api/employee-timeline?id=${encodeURIComponent(id)}&${query}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!alive) return
        if (r.status === 401 || r.status === 403) { setEvents(null); setEstado('negado'); return }
        if (!r.ok) { setEvents(null); setEstado('erro'); return }
        const d = (await r.json()) as { timeline: TimelineEvent[] }
        setEvents(d.timeline ?? [])
        setEstado('ok')
      })
      .catch(() => { if (alive) { setEvents(null); setEstado('erro') } })
    return () => { alive = false }
  }, [id, query])

  return { events, estado }
}
