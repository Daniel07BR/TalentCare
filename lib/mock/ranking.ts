/* ============================================================
   TalentCare — Ranking & Comparativo. Puro em função de data.
   ============================================================ */
import { FACTORS, scoreColor, fmtTempo, type Employee, type TalentData } from './data'
import { deptName, findEmployee } from './employee'

export type RankMetric = 'score' | 'tarefas' | 'assiduidade'

export function metricVal(e: Employee, m: RankMetric): number {
  if (m === 'tarefas') return e.tasksDone
  // Assiduidade REAL (ponto): 100 − atrasos·2 − advertências·5 (faltas sem fonte).
  if (m === 'assiduidade') return Math.max(0, 100 - e.atrasos * 2 - e.advertencias * 5)
  return e.score
}
export function metricLabel(m: RankMetric): string {
  return ({ score: 'Score geral', tarefas: 'Tarefas concluídas', assiduidade: 'Assiduidade' })[m]
}

export function leaderboard(data: TalentData, m: RankMetric) {
  const list = data.employees.filter((e) => e.status !== 'Desligado').map((e) => ({ e, val: metricVal(e, m) })).sort((a, b) => b.val - a.val)
  const max = list[0] ? list[0].val : 1
  return list.map((x, i) => ({
    rank: i + 1, id: x.e.id, nome: x.e.nome, cargo: x.e.cargo, dept: deptName(data, x.e.dept), initials: x.e.initials, color: x.e.color, hasAvatar: x.e.hasAvatar,
    val: x.val, pct: Math.round(x.val / max * 100) + '%',
    medal: i === 0 ? 'var(--accent)' : i === 1 ? '#c9ccd1' : i === 2 ? '#c08457' : 'var(--text-mute)',
  }))
}

function cmpCard(data: TalentData, e: Employee) {
  return { id: e.id, hasAvatar: e.hasAvatar, nome: e.nome, cargo: e.cargo, dept: deptName(data, e.dept), initials: e.initials, color: e.color, score: e.score, scoreColor: scoreColor(e.score), tempo: fmtTempo(e.tempoMeses) }
}

export function comparison(data: TalentData, aId: string, bId: string) {
  const a = findEmployee(data, aId), b = findEmployee(data, bId)
  if (!a || !b) return null
  return {
    aCard: cmpCard(data, a), bCard: cmpCard(data, b),
    rows: FACTORS.map((f) => {
      const na = a.factors.find((x) => x.key === f.key)!.nota
      const nb = b.factors.find((x) => x.key === f.key)!.nota
      return { label: f.label, na, nb, naPct: na + '%', nbPct: nb + '%', naColor: scoreColor(na), nbColor: scoreColor(nb) }
    }),
  }
}

export function cmpOptions(data: TalentData) {
  return data.employees.filter((e) => e.status !== 'Desligado').map((e) => ({ value: e.id, label: e.nome + ' · ' + deptName(data, e.dept) }))
}
