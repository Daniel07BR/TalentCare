/* ============================================================
   TalentCare — Rádio Itamarathy (dados REAIS, frente B). Puro em função de data.
   Aceita um override por período (Map nexusUserId → {seconds, sessions}); sem ele,
   usa o acumulado (e.radioHoras/e.radioSessoes). Assim os mesmos cálculos servem
   o card/página com filtro de dias (período) e a visão acumulada.
   ============================================================ */
import type { TalentData } from './data'
import { deptName } from './employee'

export type PeriodUsage = Map<string, { seconds: number; sessions: number }>

export type RadioDeptBar = {
  id: string; nome: string; color: string; horas: number; sessoes: number; pct: string
}
export type RadioPerson = {
  id: string; nome: string; cargo: string; dept: string; initials: string; color: string; hasAvatar: boolean
  horas: number; sessoes: number; ultima: string | null
}
export type RadioDeptGroup = {
  id: string; nome: string; color: string; horas: number; sessoes: number; users: RadioPerson[]
}

export function radioVM(data: TalentData, period?: PeriodUsage) {
  const colorOf = new Map(data.departments.map((d) => [d.id, d.color]))

  // Horas/sessões por funcionário: período (override) OU acumulado.
  const stat = (e: TalentData['employees'][number]) => {
    if (period) {
      const p = e.nexusUserId ? period.get(e.nexusUserId) : undefined
      return { horas: Math.round((p?.seconds ?? 0) / 3600), sessoes: p?.sessions ?? 0 }
    }
    return { horas: e.radioHoras, sessoes: e.radioSessoes }
  }
  const fmtUltima = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' }) : null

  const person = (e: TalentData['employees'][number]): RadioPerson => {
    const s = stat(e)
    return {
      id: e.id, nome: e.nome, cargo: e.cargo, dept: deptName(data, e.dept),
      initials: e.initials, color: e.color, hasAvatar: e.hasAvatar,
      horas: s.horas, sessoes: s.sessoes,
      // "última escuta" só faz sentido na visão acumulada (sem dia no override).
      ultima: period ? null : fmtUltima(e.radioUltima),
    }
  }

  const byUser: RadioPerson[] = data.employees
    .map(person)
    .filter((p) => p.horas > 0 || p.sessoes > 0)
    .sort((a, b) => b.horas - a.horas || b.sessoes - a.sessoes)
  const top5 = byUser.slice(0, 5)
  const ouvintes = byUser.length
  const totalHoras = byUser.reduce((a, p) => a + p.horas, 0)
  const totalSessoes = byUser.reduce((a, p) => a + p.sessoes, 0)

  // Agrega por departamento (a partir dos employees, p/ ter o deptId).
  const byDeptMap = new Map<string, RadioDeptGroup>()
  for (const e of data.employees) {
    const s = stat(e)
    if (s.horas <= 0 && s.sessoes <= 0) continue
    let g = byDeptMap.get(e.dept)
    if (!g) {
      g = { id: e.dept, nome: deptName(data, e.dept), color: colorOf.get(e.dept) ?? 'var(--chart-2)', horas: 0, sessoes: 0, users: [] }
      byDeptMap.set(e.dept, g)
    }
    g.horas += s.horas
    g.sessoes += s.sessoes
    g.users.push(person(e))
  }
  const byDept: RadioDeptGroup[] = [...byDeptMap.values()]
    .map((g) => ({ ...g, users: g.users.sort((a, b) => b.horas - a.horas || b.sessoes - a.sessoes) }))
    .sort((a, b) => b.horas - a.horas)

  const maxH = Math.max(1, ...byDept.map((d) => d.horas))
  const deptBars: RadioDeptBar[] = byDept.map((d) => ({
    id: d.id, nome: d.nome, color: d.color, horas: d.horas, sessoes: d.sessoes,
    pct: Math.round((d.horas / maxH) * 100) + '%',
  }))

  return { totalHoras, totalSessoes, ouvintes, deptBars, deptCount: deptBars.length, byUser, top5, byDept }
}
