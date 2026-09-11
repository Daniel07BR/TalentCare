'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'
import type { CideUsage } from '@/lib/mock/cide'

// Busca a atividade do CIDE por usuário no período (do banco local,
// /api/cide-metrics) e devolve um Map p/ alimentar o cideVM(data, map).
export function useCidePeriod(): { map: CideUsage | null; loading: boolean; erro: boolean } {
  const { period, query } = usePeriod()
  const [map, setMap] = useState<CideUsage | null>(null)
  const [loading, setLoading] = useState(true)
  /* ⚠️ A leitura FALHOU (11/09/2026). O `catch` segue pondo um mapa vazio, como
     sempre, mas agora diz que foi erro: mapa vazio se lê "nenhuma atividade no
     período", e uma queda de rede não é isso. O painel novo mostra o erro. */
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setErro(false)
    fetch(`/api/cide-metrics?${query}`, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then((d: { byUser: { nexusUserId: string; atividades: number }[] }) => {
        if (!alive) return
        const m: CideUsage = new Map()
        for (const u of d.byUser) m.set(u.nexusUserId, { atividades: u.atividades })
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
