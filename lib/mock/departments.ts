/* ============================================================
   TalentCare — Departamentos (lista + detalhe). Puro em função de data.
   ============================================================ */
import { geomSpark, geomLine, scoreColor, seedOf, type TalentData } from './data'
import { heatmapFor } from './employee'

export function deptListVM(data: TalentData) {
  const cards = [...data.departments].sort((a, b) => b.score - a.score).map((d) => ({
    id: d.id, nome: d.nome, score: d.score, scoreColor: scoreColor(d.score), headcount: d.headcount,
    turnover: d.turnover, lider: d.lider, color: d.color, spark: geomSpark(d.spark, 120, 28),
  }))
  const totalHc = data.employees.length || 1
  const avgScore = Math.round(data.departments.reduce((a, d) => a + d.score * d.headcount, 0) / totalHc)
  return { cards, totalHc: data.employees.length, avgScore, n: data.departments.length }
}

export function deptDetailVM(data: TalentData, deptId: string) {
  const dep = data.departments.find((d) => d.id === deptId)
  if (!dep) return null
  const emps = data.employees.filter((e) => e.dept === dep.id).sort((a, b) => b.score - a.score)
  const ativos = data.employees.filter((e) => e.status !== 'Desligado')
  const compAvg = ativos.length ? Math.round(ativos.reduce((a, e) => a + e.score, 0) / ativos.length) : dep.score
  const hl = geomLine(dep.spark, 300, 84, 8)
  const ranking = emps.map((e, i) => ({
    rank: i + 1, id: e.id, nome: e.nome, cargo: e.cargo, initials: e.initials, color: e.color, hasAvatar: e.hasAvatar,
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
    barSelf: dep.score + '%', barComp: compAvg + '%', heat: heatmapFor(seedOf(dep.id), dep.score),
    classroom: {
      criados: dep.classroom.coursesCreated,
      assistidos: dep.classroom.coursesCompleted,
      videos: dep.classroom.videosCompleted,
    },
  }
}
