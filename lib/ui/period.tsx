'use client'
import { createContext, useContext, useMemo, useState } from 'react'
import type { Period } from '@/lib/mock/dashboard'
import { periodDays, rotuloDoIntervalo } from '@/lib/period-range'

type Ctx = {
  period: Period
  /** Só preenchidos quando `period === 'custom'`. */
  from: string
  to: string
  setPeriod: (p: Period) => void
  /** Escolher datas no calendário JÁ liga o modo `custom` — pedir dois cliques
   *  (escolher a data e depois "aplicar") faria a tela mostrar 30 dias enquanto
   *  o calendário mostra outra coisa. */
  setRange: (from: string, to: string) => void
  /**
   * O trecho de query que TODA rota de métrica recebe: `period=…&from=…&to=…`.
   *
   * ⚠️⚠️ Existe para que os ~12 hooks não montem a URL cada um do seu jeito. Ao
   * acrescentar o intervalo por calendário, o hook esquecido continuaria pedindo
   * só `period` e a rota devolveria 30 dias — enquanto a tela mostra "1 a 15 de
   * agosto". Números certos, intervalo errado, e nada acusa.
   */
  query: string
  /** Rótulo humano do que está selecionado ("1 a 15 de ago de 2026"). */
  label: string
}

const PeriodCtx = createContext<Ctx>({
  period: '30d', from: '', to: '',
  setPeriod: () => {}, setRange: () => {},
  query: 'period=30d', label: 'Últimos 30 dias',
})

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const [period, setPeriodRaw] = useState<Period>('30d')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const valor = useMemo<Ctx>(() => {
    const { fromDay, toDay } = periodDays(period, from, to)
    const qs = new URLSearchParams({ period })
    if (period === 'custom') { qs.set('from', fromDay); qs.set('to', toDay) }
    return {
      period, from, to,
      setPeriod: (p) => setPeriodRaw(p),
      setRange: (f, t) => {
        setFrom(f); setTo(t)
        // ⚠️ Só entra em `custom` quando as DUAS pontas existem: com uma só, o
        // intervalo seria "de 5 de agosto até hoje" sem a pessoa ter pedido isso.
        if (f && t) setPeriodRaw('custom')
      },
      query: qs.toString(),
      label: rotuloDoIntervalo(period, fromDay, toDay),
    }
  }, [period, from, to])

  return <PeriodCtx.Provider value={valor}>{children}</PeriodCtx.Provider>
}

export function usePeriod() {
  return useContext(PeriodCtx)
}
