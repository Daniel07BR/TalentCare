/* ============================================================
   TalentCare — Departamentos (lista + detalhe). Porte de deptListVM/deptDetailVM.
   ============================================================ */
import { buildData, geomSpark, geomLine, scoreColor } from './data'
import { heatmapFor } from './employee'

export function deptListVM() {
  const D = buildData()
  const cards = [...D.departments].sort((a, b) => b.score - a.score).map((d) => ({
    id: d.id, nome: d.nome, score: d.score, scoreColor: scoreColor(d.score), headcount: d.headcount,
    turnover: d.turnover, lider: d.lider, color: d.color, spark: geomSpark(d.spark, 120, 28),
  }))
  const totalHc = D.employees.length
  const avgScore = Math.round(D.departments.reduce((a, d) => a + d.score * d.headcount, 0) / totalHc)
  return { cards, totalHc, avgScore, n: D.departments.length }
}

export function deptDetailVM(deptId: string) {
  const D = buildData()
  const dep = D.departments.find((d) => d.id === deptId)
  if (!dep) return null
  const emps = D.employees.filter((e) => e.dept === dep.id).sort((a, b) => b.score - a.score)
  const ativos = D.employees.filter((e) => e.status !== 'Desligado')
  const compAvg = Math.round(ativos.reduce((a, e) => a + e.score, 0) / ativos.length)
  const hl = geomLine(dep.spark, 300, 84, 8)
  const ranking = emps.map((e, i) => ({
    rank: i + 1, id: e.id, nome: e.nome, cargo: e.cargo, initials: e.initials, color: e.color,
    score: e.score, scoreColor: scoreColor(e.score), scorePct: e.score + '%',
  }))
  const kpis = [
    { label: 'Score do setor', value: dep.score, unit: '/100', color: scoreColor(dep.score) },
    { label: 'Headcount', value: dep.headcount, unit: '', color: 'var(--text)' },
    { label: 'Turnover', value: dep.turnover, unit: '%', color: 'var(--danger)' },
    { label: 'vs. média empresa', value: (dep.score - compAvg >= 0 ? '+' : '') + (dep.score - compAvg), unit: 'pts', color: dep.score - compAvg >= 0 ? 'var(--success)' : 'var(--danger)' },
  ]
  return {
    name: dep.nome, kpis, ranking, histLine: hl.line, histArea: hl.area, compAvg, score: dep.score,
    barSelf: dep.score + '%', barComp: compAvg + '%', heat: heatmapFor(dep.headcount, dep.score),
  }
}
