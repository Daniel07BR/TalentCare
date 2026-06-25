'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'
import type { ScoreSignals } from '@/lib/mock/data'

// Busca os sinais do score no período (/api/score-metrics) → Map por id.
// Alimenta withRealScores(data, signals) p/ o score period-aware nas telas.
export function useScoreSignals(): { signals: ScoreSignals | null; loading: boolean } {
  const { period } = usePeriod()
  const [signals, setSignals] = useState<ScoreSignals | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/score-metrics?period=${encodeURIComponent(period)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { byPerson: { id: string; activity: number; atrasos: number; advertencias: number }[] }) => {
        if (!alive) return
        const m: ScoreSignals = new Map()
        for (const p of d.byPerson) m.set(p.id, { activity: p.activity, atrasos: p.atrasos, advertencias: p.advertencias })
        setSignals(m)
      })
      .catch(() => alive && setSignals(null))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [period])

  return { signals, loading }
}
