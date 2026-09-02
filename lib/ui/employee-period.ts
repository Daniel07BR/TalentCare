'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'

export type EmployeeMetrics = {
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
  assiduidade: { assid: number; atrasos: number; atrasosAbon: number; minutos: number; advertencias: number; faltas: number | null; suspensoes: number | null }
}

// Métricas reais da pessoa NO PERÍODO (do banco local) p/ a ficha respeitar o filtro.
export function useEmployeePeriod(id: string): { m: EmployeeMetrics | null; loading: boolean } {
  const { period } = usePeriod()
  const [m, setM] = useState<EmployeeMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/employee-metrics?id=${encodeURIComponent(id)}&period=${encodeURIComponent(period)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: EmployeeMetrics | null) => { if (alive) setM(d) })
      .catch(() => alive && setM(null))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [id, period])

  return { m, loading }
}
