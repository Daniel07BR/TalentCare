'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'
import type { ChatUsage, ChatSetor } from '@/lib/mock/chat'

// Busca a atividade do Chat Interno no período (do banco local,
// /api/chat-metrics). Devolve as DUAS visões que a tela usa e que não se somam:
// `map` (por pessoa) e `setores` (por setor, nas duas faces do chamado).
// `desde` é o dia mais antigo do espelho — a tela avisa, senão o filtro de Ano
// parece bug (a mensagem tem história do Mattermost; o chamado, só desde 21/08).
export function useChatPeriod(): { map: ChatUsage | null; setores: ChatSetor[]; desde: string | null; loading: boolean } {
  const { period } = usePeriod()
  const [map, setMap] = useState<ChatUsage | null>(null)
  const [setores, setSetores] = useState<ChatSetor[]>([])
  const [desde, setDesde] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/chat-metrics?period=${encodeURIComponent(period)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { byUser: ({ nexusUserId: string } & Record<string, number>)[]; byDept: ChatSetor[]; desde: string | null }) => {
        if (!alive) return
        const m: ChatUsage = new Map()
        for (const u of d.byUser ?? []) {
          m.set(u.nexusUserId, {
            msgCanais: u.msgCanais, msgDiretas: u.msgDiretas, msgChamados: u.msgChamados,
            chamadosAbertos: u.chamadosAbertos, chamadosAssumidos: u.chamadosAssumidos,
            chamadosConcluidos: u.chamadosConcluidos, segundosResolucao: u.segundosResolucao,
          })
        }
        setMap(m)
        setSetores(d.byDept ?? [])
        setDesde(d.desde ?? null)
      })
      .catch(() => {
        if (!alive) return
        setMap(new Map())
        setSetores([])
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [period])

  return { map, setores, desde, loading }
}
