/* ============================================================
   TalentCare — CIDE (dados REAIS, frente B). Puro em função de data.
   Aceita override por período (Map nexusUserId → {atividades}); sem ele, usa o
   acumulado (e.cide). Atividade = alterações registradas no CIDE pela pessoa.
   ============================================================ */
import type { TalentData, CideStat } from './data'
import { deptName } from './employee'

export type CideUsage = Map<string, CideStat>

export type CideDeptBar = { id: string; nome: string; color: string; atividades: number; pct: string }
export type CidePerson = {
  id: string; nome: string; cargo: string; dept: string; initials: string; color: string; hasAvatar: boolean
  atividades: number
}
export type CideDeptGroup = { id: string; nome: string; color: string; atividades: number; users: CidePerson[] }

export function cideVM(data: TalentData, period?: CideUsage) {
  const colorOf = new Map(data.departments.map((d) => [d.id, d.color]))

  const stat = (e: TalentData['employees'][number]): number => {
    if (period) return (e.nexusUserId ? period.get(e.nexusUserId)?.atividades : 0) ?? 0
    return e.cide.atividades
  }

  const person = (e: TalentData['employees'][number]): CidePerson => ({
    id: e.id, nome: e.nome, cargo: e.cargo, dept: deptName(data, e.dept),
    initials: e.initials, color: e.color, hasAvatar: e.hasAvatar, atividades: stat(e),
  })

  const byUser: CidePerson[] = data.employees
    .map(person)
    .filter((p) => p.atividades > 0)
    .sort((a, b) => b.atividades - a.atividades)
  const top5 = byUser.slice(0, 5)
  const ativos = byUser.length
  const totalAtividades = byUser.reduce((a, p) => a + p.atividades, 0)

  const byDeptMap = new Map<string, CideDeptGroup>()
  for (const e of data.employees) {
    const v = stat(e)
    if (v <= 0) continue
    let g = byDeptMap.get(e.dept)
    if (!g) {
      g = { id: e.dept, nome: deptName(data, e.dept), color: colorOf.get(e.dept) ?? 'var(--chart-5)', atividades: 0, users: [] }
      byDeptMap.set(e.dept, g)
    }
    g.atividades += v
    g.users.push(person(e))
  }
  const groups = [...byDeptMap.values()]
    .map((g) => ({ ...g, users: g.users.sort((a, b) => b.atividades - a.atividades) }))
    .sort((a, b) => b.atividades - a.atividades)

  const maxA = Math.max(1, ...groups.map((d) => d.atividades))
  const deptBars: CideDeptBar[] = groups.map((d) => ({
    id: d.id, nome: d.nome, color: d.color, atividades: d.atividades, pct: Math.round((d.atividades / maxA) * 100) + '%',
  }))

  return { totalAtividades, ativos, deptBars, deptCount: deptBars.length, byUser, top5, byDept: groups }
}
