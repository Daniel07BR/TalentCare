'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'
import type { GerenciaUsage } from '@/lib/mock/gerencia'
import type { GerenciaStat } from '@/lib/mock/data'

// Busca a atividade da Gerência por usuário no período (do banco local,
// /api/gerencia-metrics) e devolve um Map p/ alimentar o gerenciaVM(data, map).
export function useGerenciaPeriod(): { map: GerenciaUsage | null; loading: boolean; erro: boolean } {
  const { period, query } = usePeriod()
  const [map, setMap] = useState<GerenciaUsage | null>(null)
  const [loading, setLoading] = useState(true)
  /* ⚠️ A leitura FALHOU (11/09/2026). O `catch` segue pondo um mapa vazio, como
     sempre, mas agora diz que foi erro: mapa vazio se lê "nenhuma atividade no
     período", e uma queda de rede não é isso. O painel novo mostra o erro. */
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setErro(false)
    fetch(`/api/gerencia-metrics?${query}`, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then((d: { byUser: ({ nexusUserId: string } & GerenciaStat)[] }) => {
        if (!alive) return
        const m: GerenciaUsage = new Map()
        for (const u of d.byUser) {
          const { nexusUserId, ...stat } = u
          m.set(nexusUserId, stat)
        }
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
