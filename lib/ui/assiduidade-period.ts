'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'
import type { PeriodAssid } from '@/lib/mock/assiduidade'

type Row = { personKey: string; atrasos: number; abonados: number; minutos: number; advertencias: number }

export type AssidPeriodo = {
  map: PeriodAssid | null
  /** Atrasos por dia na janela — a sparkline do KPI, do mesmo `where` do número. */
  porDia: { day: string; atrasos: number }[]
  /** A janela pedida cai dentro do que o ponto realmente cobriu? */
  janelaComPonto: boolean
  /** "ponto importado até 25/06/2026" — o que a tela mostra no lugar do número. */
  motivoSemPonto: string | null
  /** Primeiro e último dia de ponto importado (AAAA-MM-DD). ⚠️ As DUAS pontas:
   *  a sparkline precisa saber quais buckets a cobertura alcança, não só se a
   *  janela toca a cobertura em algum ponto. */
  pontoDesde: string | null
  pontoAte: string | null
  loading: boolean
  /**
   * A busca FALHOU.
   *
   * ⚠️⚠️ Antes o `catch` fazia `setMap(new Map())`, e Map vazio é
   * indistinguível de "ninguém se atrasou": uma queda de rede virava **0
   * atrasos** no KPI, em verde, debaixo de "Últimos 30 dias". Erro tem de
   * aparecer como erro — a tela mostra "—" e diz que não conseguiu ler.
   */
  erro: boolean
}

// Busca a assiduidade por pessoa no período (do banco local, /api/assiduidade-metrics)
// e devolve um Map p/ alimentar o assiduidadeVM(data, map).
//
// ⚠️⚠️ Devolve TAMBÉM se a janela foi medida. Sem isso, um período que o import
// do ponto nunca alcançou volta como um Map vazio, e Map vazio se lê como "zero
// atraso para todo mundo" — a resposta mais tranquilizadora e a única errada.
const VAZIO: Omit<AssidPeriodo, 'loading'> = {
  map: null, porDia: [], janelaComPonto: false, motivoSemPonto: null, pontoDesde: null, pontoAte: null, erro: false,
}

export function useAssiduidadePeriod(): AssidPeriodo {
  const { query } = usePeriod()
  const [st, setSt] = useState(VAZIO)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/assiduidade-metrics?${query}`, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then((d: {
        byPerson: Row[]; porDia?: { day: string; atrasos: number }[]
        janelaComPonto?: boolean; motivoSemPonto?: string | null
        pontoDesde?: string | null; pontoAte?: string | null
      }) => {
        if (!alive) return
        const m: PeriodAssid = new Map()
        for (const u of d.byPerson) m.set(u.personKey, { atrasos: u.atrasos, abonados: u.abonados, minutos: u.minutos, advertencias: u.advertencias })
        /* ⚠️ `?? false`, nunca `?? true`: rota velha, resposta em cache ou deploy
           pela metade têm de cair no "—", não no "está tudo em ordem". */
        setSt({
          map: m,
          porDia: d.porDia ?? [],
          janelaComPonto: d.janelaComPonto ?? false,
          motivoSemPonto: d.motivoSemPonto ?? null,
          pontoDesde: d.pontoDesde ?? null,
          pontoAte: d.pontoAte ?? null,
          erro: false,
        })
      })
      /* ⚠️⚠️ `map: null` e `erro: true` — NÃO um Map vazio. Map vazio se lê como
         "zero atraso para todo mundo", e a tela mostrava isso em verde, com o
         mesmo desenho de um dia sem ocorrência. Queda de rede não é boa notícia. */
      .catch(() => alive && setSt({ ...VAZIO, erro: true }))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [query])

  return { ...st, loading }
}
