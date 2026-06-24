/* ============================================================
   TalentCare — ClassRoom (dados REAIS, frente B). Puro em função de data.
   Aceita override por período (Map nexusUserId → {videos,courses,created}); sem
   ele, usa o acumulado (e.classroom). Mesmo padrão do radioVM.
   ============================================================ */
import type { TalentData } from './data'
import { deptName } from './employee'

export type ClassroomUsage = Map<string, { videos: number; courses: number; created: number }>

export type ClassroomDeptBar = {
  id: string; nome: string; color: string; videos: number; courses: number; created: number; pct: string
}
export type ClassroomPerson = {
  id: string; nome: string; cargo: string; dept: string; initials: string; color: string; hasAvatar: boolean; value: number
}

const DONUT_COLORS = ['#f5a623', '#36b9a6', '#a78bfa', '#56c5e8', '#f1788a', '#b6d957', '#5b9df0', '#e0857a', '#3fb255', '#c9a227', '#7c8ff0']

export function classroomVM(data: TalentData, period?: ClassroomUsage) {
  const emps = data.employees
  // Por funcionário: período (override) OU acumulado.
  const stat = (e: typeof emps[number]) => {
    if (period) {
      const p = e.nexusUserId ? period.get(e.nexusUserId) : undefined
      return { videos: p?.videos ?? 0, courses: p?.courses ?? 0, created: p?.created ?? 0 }
    }
    return { videos: e.classroom.videosCompleted, courses: e.classroom.coursesCompleted, created: e.classroom.coursesCreated }
  }

  const totals = emps.reduce(
    (a, e) => { const s = stat(e); return { videos: a.videos + s.videos, courses: a.courses + s.courses, created: a.created + s.created } },
    { videos: 0, courses: 0, created: 0 },
  )

  // Agrega por departamento a partir dos funcionários.
  type Agg = { id: string; nome: string; color: string; videos: number; courses: number; created: number }
  const deptColor = new Map<string, string>()
  data.departments.forEach((d, i) => deptColor.set(d.id, DONUT_COLORS[i % DONUT_COLORS.length]))
  const barColor = new Map(data.departments.map((d) => [d.id, d.color]))
  const aggMap = new Map<string, Agg>()
  for (const e of emps) {
    const s = stat(e)
    if (s.videos + s.courses + s.created <= 0) continue
    let g = aggMap.get(e.dept)
    if (!g) { g = { id: e.dept, nome: deptName(data, e.dept), color: barColor.get(e.dept) ?? 'var(--accent)', videos: 0, courses: 0, created: 0 }; aggMap.set(e.dept, g) }
    g.videos += s.videos; g.courses += s.courses; g.created += s.created
  }
  const aggs = [...aggMap.values()]

  const depts = [...aggs].sort((a, b) => b.videos - a.videos)
  const maxV = Math.max(1, ...depts.map((d) => d.videos))
  const deptBars: ClassroomDeptBar[] = depts.map((d) => ({
    id: d.id, nome: d.nome, color: d.color, videos: d.videos, courses: d.courses, created: d.created,
    pct: Math.round((d.videos / maxV) * 100) + '%',
  }))

  const person = (e: typeof emps[number], value: number): ClassroomPerson => ({
    id: e.id, nome: e.nome, cargo: e.cargo, dept: deptName(data, e.dept), initials: e.initials, color: e.color, hasAvatar: e.hasAvatar, value,
  })
  const withStat = emps.map((e) => ({ e, s: stat(e) }))
  const topCreators = withStat.filter((x) => x.s.created > 0).sort((a, b) => b.s.created - a.s.created).slice(0, 8).map((x) => person(x.e, x.s.created))
  const topLearners = withStat.filter((x) => x.s.videos > 0).sort((a, b) => b.s.videos - a.s.videos).slice(0, 8).map((x) => person(x.e, x.s.videos))

  const seg = (pick: (g: Agg) => number) =>
    aggs.map((g) => ({ id: g.id, nome: g.nome, value: pick(g), color: deptColor.get(g.id)! }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value)
  const donuts = {
    videos: { segments: seg((g) => g.videos), total: totals.videos },
    cursos: { segments: seg((g) => g.courses), total: totals.courses },
    criados: { segments: seg((g) => g.created), total: totals.created },
  }
  const legend = aggs.map((g) => ({ id: g.id, nome: g.nome, color: deptColor.get(g.id)! }))

  return { totals, deptBars, topCreators, topLearners, deptCount: deptBars.length, donuts, legend }
}
