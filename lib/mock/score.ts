/* ============================================================
   TalentCare — Score REAL period-aware. withRealScores devolve um TalentData
   com score/factors recalculados a partir dos sinais do período (atividade nos
   sistemas + assiduidade). Sem sinais (carregando) → cai no acumulado já embutido.
   As VMs existentes consomem o TalentData normalmente — basta a página embrulhar.
   ============================================================ */
import { computeScores, type ScoreSignals, type TalentData } from './data'

export type { ScoreSignals }

export function withRealScores(data: TalentData, signals?: ScoreSignals | null): TalentData {
  if (!signals) return data // já vem com o score acumulado real do assembleData
  const sm = computeScores(data.employees, signals)
  const employees = data.employees.map((e) => {
    const rs = sm.get(e.id)
    return rs ? { ...e, score: rs.score, hasScore: rs.hasScore, factors: rs.factors, hist: Array(12).fill(rs.score), delta: 0 } : e
  })
  // Recalcula o score do departamento (média dos AVALIÁVEIS ativos) no período.
  const departments = data.departments.map((d) => {
    const ativos = employees.filter((e) => e.dept === d.id && e.status !== 'Desligado')
    const base = ativos.length ? ativos : employees.filter((e) => e.dept === d.id)
    const scored = base.filter((e) => e.hasScore)
    const score = scored.length ? Math.round(scored.reduce((a, e) => a + e.score, 0) / scored.length) : d.score
    return { ...d, score }
  })
  return { ...data, employees, departments }
}
