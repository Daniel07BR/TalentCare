import type { DeptMetrics } from '@/lib/ui/dept-period'
import type { ChaveDetalhe } from '../../../_visao/Detalhe'

/** O que toda seção recebe: as métricas do setor, já no período do filtro. */
export type SecaoProps = { m: DeptMetrics }

/** Seções que abrem a janela "Ver detalhes" de um sistema. */
export type ComDetalhe = SecaoProps & { abrir: (c: ChaveDetalhe) => void }

/** As cores de indicador — moram em `app/(app)/_visao/`, comuns ao painel principal. */
export type { Tom } from '../../../_visao/tipos'
