/* ============================================================
   TalentCare — ClassRoom (dados REAIS, frente B). Puro em função de data.
   ============================================================ */
import { scoreColor, type TalentData } from './data'
import { deptName } from './employee'

export type ClassroomDeptBar = {
  id: string; nome: string; color: string; videos: number; courses: number; created: number; pct: string
}
export type ClassroomPerson = {
  id: string; nome: string; cargo: string; dept: string; initials: string; color: string; hasAvatar: boolean; value: number
}

export function classroomVM(data: TalentData) {
  const emps = data.employees
  const totals = emps.reduce(
    (a, e) => ({
      videos: a.videos + e.classroom.videosCompleted,
      courses: a.courses + e.classroom.coursesCompleted,
      created: a.created + e.classroom.coursesCreated,
    }),
    { videos: 0, courses: 0, created: 0 },
  )

  const depts = [...data.departments]
    .filter((d) => d.classroom.videosCompleted + d.classroom.coursesCompleted + d.classroom.coursesCreated > 0)
    .sort((a, b) => b.classroom.videosCompleted - a.classroom.videosCompleted)
  const maxV = Math.max(1, ...depts.map((d) => d.classroom.videosCompleted))
  const deptBars: ClassroomDeptBar[] = depts.map((d) => ({
    id: d.id, nome: d.nome, color: d.color,
    videos: d.classroom.videosCompleted, courses: d.classroom.coursesCompleted, created: d.classroom.coursesCreated,
    pct: Math.round((d.classroom.videosCompleted / maxV) * 100) + '%',
  }))

  const person = (e: typeof emps[number], value: number): ClassroomPerson => ({
    id: e.id, nome: e.nome, cargo: e.cargo, dept: deptName(data, e.dept), initials: e.initials, color: e.color, hasAvatar: e.hasAvatar, value,
  })
  const topCreators = emps.filter((e) => e.classroom.coursesCreated > 0)
    .sort((a, b) => b.classroom.coursesCreated - a.classroom.coursesCreated).slice(0, 8)
    .map((e) => person(e, e.classroom.coursesCreated))
  const topLearners = emps.filter((e) => e.classroom.videosCompleted > 0)
    .sort((a, b) => b.classroom.videosCompleted - a.classroom.videosCompleted).slice(0, 8)
    .map((e) => person(e, e.classroom.videosCompleted))

  // Cor distinta por departamento (mesma cor nos 3 donuts).
  const DONUT_COLORS = ['#f5a623', '#36b9a6', '#a78bfa', '#56c5e8', '#f1788a', '#b6d957', '#5b9df0', '#e0857a', '#3fb255', '#c9a227', '#7c8ff0']
  const deptColor = new Map<string, string>()
  data.departments.forEach((d, i) => deptColor.set(d.id, DONUT_COLORS[i % DONUT_COLORS.length]))
  const seg = (pick: (d: typeof data.departments[number]) => number) =>
    data.departments
      .map((d) => ({ id: d.id, nome: d.nome, value: pick(d), color: deptColor.get(d.id)! }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value)
  const donuts = {
    videos: { segments: seg((d) => d.classroom.videosCompleted), total: totals.videos },
    cursos: { segments: seg((d) => d.classroom.coursesCompleted), total: totals.courses },
    criados: { segments: seg((d) => d.classroom.coursesCreated), total: totals.created },
  }
  const legend = data.departments
    .filter((d) => d.classroom.videosCompleted + d.classroom.coursesCompleted + d.classroom.coursesCreated > 0)
    .map((d) => ({ id: d.id, nome: d.nome, color: deptColor.get(d.id)! }))

  void scoreColor
  return { totals, deptBars, topCreators, topLearners, deptCount: deptBars.length, donuts, legend }
}
