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
