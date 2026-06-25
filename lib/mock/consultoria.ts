/* ============================================================
   TalentCare — Consultoria Plus (dados REAIS, frente B). Puro em função de data.
   Aceita override por período (Map nexusUserId → {studies,tickets,messages,comments});
   sem ele, usa o acumulado (e.consultoria). Mesmo padrão do radioVM/classroomVM.
   "Atividade" = estudos + chamados + mensagens + comentários.
   ============================================================ */
import type { TalentData, ConsultoriaStat } from './data'
import { deptName } from './employee'

export type ConsultoriaUsage = Map<string, ConsultoriaStat>

export type ConsultoriaTotals = { studies: number; tickets: number; messages: number; comments: number; total: number }
export type ConsultoriaDeptBar = {
  id: string; nome: string; color: string; total: number; studies: number; tickets: number; messages: number; comments: number; pct: string
}
export type ConsultoriaPerson = {
  id: string; nome: string; cargo: string; dept: string; initials: string; color: string; hasAvatar: boolean
  total: number; studies: number; tickets: number; messages: number; comments: number
}
export type ConsultoriaDeptGroup = {
  id: string; nome: string; color: string; total: number; users: ConsultoriaPerson[]
}

const sumStat = (s: ConsultoriaStat) => s.studies + s.tickets + s.messages + s.comments

export function consultoriaVM(data: TalentData, period?: ConsultoriaUsage) {
  const colorOf = new Map(data.departments.map((d) => [d.id, d.color]))

  // Atividade por funcionário: período (override) OU acumulado.
  const stat = (e: TalentData['employees'][number]): ConsultoriaStat => {
    if (period) {
      const p = e.nexusUserId ? period.get(e.nexusUserId) : undefined
      return { studies: p?.studies ?? 0, tickets: p?.tickets ?? 0, messages: p?.messages ?? 0, comments: p?.comments ?? 0 }
    }
    return e.consultoria
  }

  const person = (e: TalentData['employees'][number]): ConsultoriaPerson => {
    const s = stat(e)
    return {
      id: e.id, nome: e.nome, cargo: e.cargo, dept: deptName(data, e.dept),
      initials: e.initials, color: e.color, hasAvatar: e.hasAvatar,
      total: sumStat(s), studies: s.studies, tickets: s.tickets, messages: s.messages, comments: s.comments,
    }
  }

  const byUser: ConsultoriaPerson[] = data.employees
    .map(person)
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total)
  const top5 = byUser.slice(0, 5)
  const ativos = byUser.length

  const totals: ConsultoriaTotals = byUser.reduce(
    (a, p) => ({ studies: a.studies + p.studies, tickets: a.tickets + p.tickets, messages: a.messages + p.messages, comments: a.comments + p.comments, total: a.total + p.total }),
    { studies: 0, tickets: 0, messages: 0, comments: 0, total: 0 },
  )

  // Agrega por departamento (a partir dos employees, p/ ter o deptId).
  const byDeptMap = new Map<string, ConsultoriaDeptGroup & ConsultoriaTotals>()
  for (const e of data.employees) {
    const s = stat(e)
    const t = sumStat(s)
    if (t <= 0) continue
    let g = byDeptMap.get(e.dept)
    if (!g) {
      g = { id: e.dept, nome: deptName(data, e.dept), color: colorOf.get(e.dept) ?? 'var(--chart-3)', total: 0, studies: 0, tickets: 0, messages: 0, comments: 0, users: [] }
      byDeptMap.set(e.dept, g)
    }
    g.total += t; g.studies += s.studies; g.tickets += s.tickets; g.messages += s.messages; g.comments += s.comments
    g.users.push(person(e))
  }
  const groups = [...byDeptMap.values()]
    .map((g) => ({ ...g, users: g.users.sort((a, b) => b.total - a.total) }))
    .sort((a, b) => b.total - a.total)

  const maxT = Math.max(1, ...groups.map((d) => d.total))
  const deptBars: ConsultoriaDeptBar[] = groups.map((d) => ({
    id: d.id, nome: d.nome, color: d.color, total: d.total,
    studies: d.studies, tickets: d.tickets, messages: d.messages, comments: d.comments,
    pct: Math.round((d.total / maxT) * 100) + '%',
  }))

  const byDept: ConsultoriaDeptGroup[] = groups.map((g) => ({ id: g.id, nome: g.nome, color: g.color, total: g.total, users: g.users }))

  return { totals, ativos, deptBars, deptCount: deptBars.length, byUser, top5, byDept }
}
