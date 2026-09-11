import type { DeptMetrics } from '@/lib/ui/dept-period'
import type { ChaveDetalhe } from '../Detalhe'

/** O que toda seção recebe: as métricas do setor, já no período do filtro. */
export type SecaoProps = { m: DeptMetrics }

/** Seções que abrem a janela "Ver detalhes" de um sistema. */
export type ComDetalhe = SecaoProps & { abrir: (c: ChaveDetalhe) => void }

/** As cores de indicador da paleta nova — cada uma tem a forte e a suave. */
export type Tom = 'blue' | 'red' | 'orange' | 'amber' | 'purple' | 'green' | 'pink'

export type Variacao = { pct: number; mes: string; anterior: string } | null
