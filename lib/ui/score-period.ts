'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'
import type { ScoreSignals } from '@/lib/mock/data'

// Busca os sinais do score no período (/api/score-metrics) → Map por id.
// Alimenta withRealScores(data, signals) p/ o score period-aware nas telas.
/**
 * ⚠️⚠️ `signals === null` NÃO quer dizer "sem sinal" — quer dizer **ainda não
 * chegou**, e `withRealScores(data, null)` devolve o score ACUMULADO de toda a
 * história. Medido em 03/09/2026: média 57 no acumulado contra 60 na janela de
 * 30 dias, e individualmente o salto chega a +57 pontos numa pessoa. Enquanto
 * isso o cabeçalho já diz "Período: Últimos 30 dias".
 *
 * Por isso o hook devolve `loading` e `erro` — e a tela tem de usar os dois. O
 * `catch` mudo era o pior caso: uma queda de rede deixava o acumulado na tela
 * para sempre, rotulado com uma janela que ele não respeita.
 */
export function useScoreSignals(): { signals: ScoreSignals | null; loading: boolean; erro: boolean } {
  const { query } = usePeriod()
  const [signals, setSignals] = useState<ScoreSignals | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setErro(false)
    fetch(`/api/score-metrics?${query}`, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then((d: {
        byPerson: { id: string; activity: number; atrasos: number; advertencias: number }[]
        janelaComPonto?: boolean
        motivoSemPonto?: string | null
      }) => {
        if (!alive) return
        const porPessoa = new Map<string, { activity: number; atrasos: number; advertencias: number }>()
        for (const p of d.byPerson) porPessoa.set(p.id, { activity: p.activity, atrasos: p.atrasos, advertencias: p.advertencias })
        /* ⚠️ `?? false` e não `?? true`: se a rota (velha, em cache, ou de um
           deploy pela metade) não mandar a bandeira, o seguro é tratar a janela
           como NÃO medida. O erro para o lado do "—", nunca para o lado do 100 —
           é a diferença entre um painel que se cala e um que elogia quem não
           mediu. */
        setSignals({
          porPessoa,
          janelaComPonto: d.janelaComPonto ?? false,
          motivoSemPonto: d.motivoSemPonto ?? null,
        })
      })
      .catch(() => { if (alive) { setSignals(null); setErro(true) } })
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [query])

  return { signals, loading, erro }
}
