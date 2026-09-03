'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'

export type DeptMetrics = {
  setor: { id: string; nome: string; pelaDiretoria: boolean }
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
  assiduidade: { atrasos: number; abonados: number; minutos: number; advertencias: number; faltas: number | null }
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
export function useDeptPeriod(id: string): { m: DeptMetrics | null; loading: boolean } {
  const { query } = usePeriod()
  const [m, setM] = useState<DeptMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let vivo = true
    setLoading(true)
    fetch(`/api/dept-metrics?id=${encodeURIComponent(id)}&${query}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: DeptMetrics | null) => { if (vivo) setM(d) })
      .catch(() => vivo && setM(null))
      .finally(() => vivo && setLoading(false))
    return () => { vivo = false }
  }, [id, query])

  return { m, loading }
}
