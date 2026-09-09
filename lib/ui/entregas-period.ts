'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'

/* Hook da área de Entregas. Segue o contrato de `PERIODO-E-DEPLOY.md`: monta a
   URL a partir do `query` do contexto e reage a `[query]`. Hook que monta a
   própria URL é o que fez, na primeira versão do calendário, a tela mostrar
   "1 a 15 de agosto" enquanto a rota devolvia 30 dias. */

export type PessoaEntregas = {
  id: string
  nome: string
  cargo: string
  hasAvatar: boolean
  ativo: boolean
  entrouEm: string | null
  saiuEm: string | null
  naFonte: boolean
  diasComRegistro: number
  diasDaFonteNaJanela: number
  servicos: number
  km: number
  saidas: number
  viagens: number
  jornadaMin: number
  jornadaTetoMin: number | null
  protAbertos: number
  protAprovados: number
  servCriados: number
  reagendados: number
  cancelados: number
  datasAlteradas: number
  primeiroDia: string | null
  ultimoDia: string | null
  servicosNaVida: number
  fontePara: boolean
  diasParado: number | null
  pontos: number | null
  pontosOrigem: string | null
  pontosDetalhe: string | null
  semNota: string | null
}

export type EntregasMetrics = {
  period: string
  fromDay: string
  toDay: string
  dias: number
  setor: { id: string; nome: string }
  competencia: string
  pontuacao: { parcial: boolean; previa: boolean; motivo: string | null }
  pessoas: PessoaEntregas[]
  totais: {
    servicos: number; km: number; saidas: number; viagens: number
    jornadaMin: number; jornadaTetoMin: number | null
    protAbertos: number; protAprovados: number; servCriados: number
    reagendados: number; cancelados: number; datasAlteradas: number
    pessoasComRegistro: number; pessoasNaEquipe: number
  }
  serie: { day: string; servicos: number; km: number; saidas: number }[]
  cobertura: {
    kmDesde: string | null
    saidasDesde: string | null
    servicosDesde: string | null
    /** A janela inteira é anterior ao dia em que o app passou a medir. */
    appFora: boolean
    /** Quantos dias da janela o app cobre. */
    appDiasNaJanela: number
    fonteAte: string | null
    fonteParada: boolean
  }
}

export function useEntregas(): { m: EntregasMetrics | null; loading: boolean; erro: string | null } {
  const { query } = usePeriod()
  const [m, setM] = useState<EntregasMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    setLoading(true)
    setErro(null)
    fetch(`/api/entregas-metrics?${query}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 403 ? 'Sem permissão para ver este setor.' : `Falha ao ler (${r.status})`)
        return r.json()
      })
      .then((d: EntregasMetrics) => { if (vivo) setM(d) })
      /* ⚠️ Falha de rede NÃO vira tela zerada: zero se lê como "não houve
         trabalho", que é a pior resposta possível para um erro de leitura. */
      .catch((e: Error) => { if (vivo) { setM(null); setErro(e.message) } })
      .finally(() => { if (vivo) setLoading(false) })
    return () => { vivo = false }
  }, [query])

  return { m, loading, erro }
}
