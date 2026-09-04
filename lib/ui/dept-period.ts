'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'

export type PessoaDoSetor = {
  id: string; nome: string; cargo: string
  /** Sem conta no Nexus → não aparece em fonte nenhuma. `0` seria mentira. */
  semFonte: boolean
  hasAvatar: boolean
  atividade: number; mensagens: number
  atrasos: number; minutosAtraso: number; advertencias: number
  /** null = ainda não avaliada nesta competência (≠ nota zero). */
  nota: number | null
}

export type PessoaRank = {
  id: string; nome: string; cargo: string; hasAvatar: boolean; valor: number
  /** Legenda de quem está em ZERO — "último em 02/07 · 692 no total". */
  nota?: string
}

export type DeptMetrics = {
  pessoas: PessoaDoSetor[]
  /** Quem fez o quê em cada fonte, do maior para o menor. Só quem tem valor > 0. */
  /** Por fonte: por QUAL grandeza está ranqueado, e quem. `gente` vazia é o
   *  caso comum (o setor abre chamado e não resolve) — o cartão diz isso. */
  rankings: Record<'whatsapp' | 'helpdesk' | 'classroom' | 'consultoria' | 'cide' | 'gerencia' | 'chat' | 'radio' | 'servicos',
    { rotulo: string; gente: PessoaRank[] }>
  setor: { id: string; nome: string; pelaDiretoria: boolean; podeGerir?: boolean }
  /** Quem está lendo alcança a empresa toda (Diretoria/admin). */
  ehAdmin: boolean
  /** Gestor e sub-encarregados do setor, do vínculo gravado. */
  chefia: { id: string; nome: string; cargo: string; hasAvatar: boolean; nivel: string; deOutroSetor: boolean }[]
  /** Turnover REAL. `taxa12m` não acompanha o filtro — taxa só diz algo em 12 meses. */
  turnover: {
    saidasNoPeriodo: number; saidas12m: number; taxa12m: number
    /** Quem saiu DENTRO do filtro. */
    noPeriodo: { id: string; nome: string; cargo: string; hasAvatar: boolean; quando: string | null }[]
    /** Quem saiu em 12 meses — a gente por trás da TAXA. */
    em12m: { id: string; nome: string; cargo: string; hasAvatar: boolean; quando: string | null }[]
  }
  /** Atividade real mês a mês, do primeiro mês COM registro. */
  serie: { mes: string; atividade: number }[]
  period: string; fromDay: string; toDay: string; dias: number; label: string
  equipe: { ativos: number; total: number; comNexus: number }
  classroom: { criados: number; assistidos: number; videos: number }
  helpdesk: { abertos: number; resolvidos: number; segundos: number; resolvidosNormais: number }
  cide: { atividades: number }
  consultoria: { estudos: number; chamados: number; mensagens: number; comentarios: number }
  radio: { horas: number; sessoes: number }
  gerencia: {
    servicos: number; km: number; saidas: number; viagens: number; horasJornada: number
    protAbertos: number; protAprovados: number; servCriados: number; reagendados: number; cancelados: number
  }
  chat: {
    msgCanais: number; msgDiretas: number; msgChamados: number
    chamadosAbertos: number; chamadosConcluidos: number; segundos: number
  }
  chamadosDoSetor: null | {
    pediu: number; pediuConcluidos: number; recebeu: number; recebeuConcluidos: number
    cancelados: number; segundos: number
  }
  whatsapp: { abertos: number; finalizados: number; handleSum: number }
  assiduidade: {
    atrasos: number; abonados: number; minutos: number; advertencias: number; faltas: number | null
    /** A janela pedida foi coberta pelo import do ponto? Ver `lib/ponto-cobertura.ts`.
     *  Opcional porque resposta antiga em cache não traz o campo. */
    janelaComPonto?: boolean
    motivoSemPonto?: string | null
  }
  /** Serviços da planilha do setor (11ª fonte). `temFonte` distingue "este setor
   *  não manda planilha" de "o setor não fez nada". Opcional: resposta em cache
   *  de antes desta rota devolver o campo não traz. */
  servicos?: {
    temFonte: boolean
    concluidos: number; abertos: number; minutos: number
    /** Linhas de gente que não é da casa — contam para o setor, não creditam ninguém. */
    semDono: number
    cobertura: { de: string; ate: string; arquivo: string } | null
    /** O arquivo inteiro, sem filtro de período. */
    total?: { linhas: number; concluidos: number }
    porPessoa: { personKey: string; concluidos: number; minutos: number }[]
  }
  demografia: {
    idadeMedia: number | null; idadesInformadas: number
    tempoCasaMeses: number | null; generos: Record<string, number>
  }
  avaliacao: {
    competencia: string; publicadas: number; avaliaveis: number; media: number | null
    porCriterio: { criterio: string; media: number; n: number }[]
  }
}

// Relatório do setor NO PERÍODO (inclusive o intervalo escolhido no calendário).
// ⚠️ A URL sai do `query` do contexto: é o único lugar que sabe montar
// `period=…&from=…&to=…`, e um hook que montasse a URL sozinho passaria a
// ignorar o calendário em silêncio.
/**
 * ⚠️⚠️ Distingue CARREGANDO de PROIBIDO de QUEBRADO. Antes os três davam
 * `m === null` e a tela ficava idêntica nos três casos — e, pior, o topo
 * continuava mostrando nome, score, escolaridade e o mapa de atrasos do setor,
 * porque esses vêm do dataset do cliente e não passam pela régua da rota. Um
 * gestor que trocasse o `id` na URL levava 403 e ainda via aquilo.
 */
export type EstadoDept = 'carregando' | 'ok' | 'negado' | 'erro'

export function useDeptPeriod(id: string): { m: DeptMetrics | null; estado: EstadoDept } {
  const { query } = usePeriod()
  const [m, setM] = useState<DeptMetrics | null>(null)
  const [estado, setEstado] = useState<EstadoDept>('carregando')

  useEffect(() => {
    let vivo = true
    setEstado('carregando')
    fetch(`/api/dept-metrics?id=${encodeURIComponent(id)}&${query}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!vivo) return
        if (r.status === 401 || r.status === 403) { setM(null); setEstado('negado'); return }
        if (!r.ok) { setM(null); setEstado('erro'); return }
        setM(await r.json())
        setEstado('ok')
      })
      .catch(() => { if (vivo) { setM(null); setEstado('erro') } })
    return () => { vivo = false }
  }, [id, query])

  return { m, estado }
}
