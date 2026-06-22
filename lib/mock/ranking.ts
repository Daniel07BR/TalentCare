/* ============================================================
   TalentCare — Ranking & Comparativo. Porte de rankVM/cmpCard.
   ============================================================ */
import { buildData, FACTORS, scoreColor, fmtTempo, type Employee } from './data'
import { deptName, findEmployee } from './employee'

export type RankMetric = 'score' | 'tarefas' | 'assiduidade'

export function metricVal(e: Employee, m: RankMetric): number {
  if (m === 'tarefas') return e.tasksDone
  if (m === 'assiduidade') return Math.max(0, 100 - e.faltas * 5 - e.atrasos * 2)
  return e.score
}
export function metricLabel(m: RankMetric): string {
  return ({ score: 'Score geral', tarefas: 'Tarefas concluídas', assiduidade: 'Assiduidade' })[m]
}

export function leaderboard(m: RankMetric) {
  const D = buildData()
  const list = D.employees.filter((e) => e.status !== 'Desligado').map((e) => ({ e, val: metricVal(e, m) })).sort((a, b) => b.val - a.val)
  const max = list[0] ? list[0].val : 1
  return list.map((x, i) => ({
    rank: i + 1, id: x.e.id, nome: x.e.nome, cargo: x.e.cargo, dept: deptName(x.e.dept), initials: x.e.initials, color: x.e.color,
    val: x.val, pct: Math.round(x.val / max * 100) + '%',
    medal: i === 0 ? 'var(--accent)' : i === 1 ? '#c9ccd1' : i === 2 ? '#c08457' : 'var(--text-mute)',
  }))
}

function cmpCard(e: Employee) {
  return { nome: e.nome, cargo: e.cargo, dept: deptName(e.dept), initials: e.initials, color: e.color, score: e.score, scoreColor: scoreColor(e.score), tempo: fmtTempo(e.tempoMeses) }
}

export function comparison(aId: string, bId: string) {
  const a = findEmployee(aId), b = findEmployee(bId)
  if (!a || !b) return null
  return {
    aCard: cmpCard(a), bCard: cmpCard(b),
    rows: FACTORS.map((f) => {
      const na = a.factors.find((x) => x.key === f.key)!.nota
      const nb = b.factors.find((x) => x.key === f.key)!.nota
      return { label: f.label, na, nb, naPct: na + '%', nbPct: nb + '%', naColor: scoreColor(na), nbColor: scoreColor(nb) }
    }),
  }
}

export function cmpOptions() {
  return buildData().employees.map((e) => ({ value: e.id, label: e.nome + ' · ' + deptName(e.dept) }))
}
