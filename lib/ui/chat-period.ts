'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'
import type { ChatUsage } from '@/lib/mock/chat'

// Busca as MENSAGENS do Chat Interno no período (do banco local,
// /api/chat-metrics). `desde` é o dia mais antigo do espelho — a tela avisa,
// senão o filtro de Ano parece bug (a mensagem tem história do Mattermost).
//
// ⚠️ Os CHAMADOS não estão mais aqui: saíram para o Fluxo em 16/09/2026, e quem
// os busca é `useFluxoPeriod`.
export function useChatPeriod(): { map: ChatUsage | null; desde: string | null; loading: boolean; erro: boolean } {
  const { period, query } = usePeriod()
  const [map, setMap] = useState<ChatUsage | null>(null)
  const [desde, setDesde] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  /* ⚠️ A leitura FALHOU (11/09/2026). O `catch` segue pondo um mapa vazio, como
     sempre, mas agora diz que foi erro: mapa vazio se lê "nenhuma atividade no
     período", e uma queda de rede não é isso. O painel novo mostra o erro. */
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setErro(false)
    fetch(`/api/chat-metrics?${query}`, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then((d: { byUser: ({ nexusUserId: string } & Record<string, number>)[]; desde: string | null }) => {
        if (!alive) return
        const m: ChatUsage = new Map()
        for (const u of d.byUser ?? []) {
          m.set(u.nexusUserId, {
            msgCanais: u.msgCanais, msgDiretas: u.msgDiretas, msgChamados: u.msgChamados,
          })
        }
        setMap(m)
        setDesde(d.desde ?? null)
      })
      .catch(() => {
        if (!alive) return
        setErro(true)
        setMap(new Map())
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [query])

  return { map, desde, loading, erro }
}
