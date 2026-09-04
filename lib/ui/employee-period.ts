'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'

export type EmployeeMetrics = {
  /** O intervalo que estes números cobrem — a ficha compara com a vida da pessoa. */
  fromDay: string
  toDay: string
  radio: { horas: number; sessoes: number; ultimaDay: string | null }
  classroom: { videos: number; courses: number; created: number; total: number }
  whatsapp: { has: boolean; abertos: number; finalizados: number; tempoMedio: string }
  consultoria: { has: boolean; studies: number; tickets: number; messages: number; comments: number; total: number }
  helpdesk: { has: boolean; opened: number; resolved: number; formalized: number; tempoMedio: string }
  cide: { has: boolean; atividades: number }
  // Gerência: as duas faces (execução e escritório) com flags próprias, p/ a
  // ficha só mostrar o bloco de saída de quem realmente saiu na rua.
  gerencia: {
    servicos: number; km: number; saidas: number; viagens: number; jornadaMin: number
    protAbertos: number; protAprovados: number; servCriados: number
    reagendados: number; cancelados: number; datasAlteradas: number
    hasSaida: boolean; hasEscritorio: boolean
  }
  // Chat Interno: CONVERSA e CHAMADO com flags próprias, p/ a ficha de quem só
  // conversa não mostrar um bloco de chamados zerado (que se lê como "não
  // atendeu nada") e vice-versa.
  chat: {
    msgCanais: number; msgDiretas: number; msgChamados: number; mensagens: number
    chamadosAbertos: number; chamadosAssumidos: number; chamadosConcluidos: number
    tempoMedio: string; hasConversa: boolean; hasChamado: boolean
  }
  /** Histórico de advertências COM motivo — vem daqui, e não do dataset do
   *  cliente, porque esta rota confere `podeVer`. */
  disciplina: { data: string; motivo: string | null; tipo: string; dias: number | null }[]
  assiduidade: {
    assid: number; atrasos: number; atrasosAbon: number; minutos: number; advertencias: number
    faltas: number | null; suspensoes: number | null
    /* A cobertura do ponto vem NESTA rota, que a ficha já chama — ela evita
       fetch extra de propósito. `pessoaMedida` = está no roster do ponto;
       `janelaComPonto` = o import alcançou esta janela. Ver `lib/ponto-cobertura.ts`. */
    pessoaMedida?: boolean; janelaComPonto?: boolean; motivoSemPonto?: string | null
  }
  /** Serviços da planilha do setor (11ª fonte). Opcional: resposta em cache
   *  de antes desta rota devolver o campo não traz. */
  servicos?: {
    /** `false` = este setor não manda planilha. NÃO é "fez zero serviços". */
    temFonte: boolean
    concluidos: number; abertos: number; desconsiderados: number; minutos: number
    porMes: { mes: string; concluidos: number; minutos: number }[]
    porTarefa: { tarefa: string; n: number; minutos: number }[]
  }
  /** Pontuação mensal do setor. `origem` distingue informado de calculado. */
  pontuacao?: { competencia: string; pontos: number; origem: string; detalhe: string | null }[]
}

// Métricas reais da pessoa NO PERÍODO (do banco local) p/ a ficha respeitar o filtro.
export function useEmployeePeriod(id: string): { m: EmployeeMetrics | null; loading: boolean } {
  const { period, query } = usePeriod()
  const [m, setM] = useState<EmployeeMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/employee-metrics?id=${encodeURIComponent(id)}&${query}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: EmployeeMetrics | null) => { if (alive) setM(d) })
      .catch(() => alive && setM(null))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [id, query])

  return { m, loading }
}
