/* ============================================================
   TalentCare — distribuição de escolaridade (dados REAIS). Puro em função de data.
   ============================================================ */
import type { Employee, TalentData } from './data'

export const ESC_RANK = [
  'Doutorado', 'Mestrado', 'MBA', 'Pós-graduação', 'Superior Completo', 'Superior (cursando)',
  'Superior Incompleto', 'Médio Técnico', 'Técnico', 'Ensino Médio', 'Ensino Fundamental', 'Não informado',
]
export const ESC_COLOR: Record<string, string> = {
  Doutorado: '#7c5cf0', Mestrado: '#a78bfa', MBA: '#f5a623', 'Pós-graduação': '#e0941a',
  'Superior Completo': '#159b87', 'Superior (cursando)': '#2196c4', 'Superior Incompleto': '#56c5e8',
  'Médio Técnico': '#b6d957', 'Técnico': '#8aab2e', 'Ensino Médio': '#e0857a', 'Ensino Fundamental': '#f1788a',
  'Não informado': '#9aa1ac',
}
const lvl = (e: Employee) => e.escolaridade || 'Não informado'
const rank = (k: string) => { const i = ESC_RANK.indexOf(k); return i < 0 ? 99 : i }

export type EscSeg = { label: string; count: number; pct: number; color: string }
export type EscPerson = { id: string; nome: string; username: string | null; initials: string; color: string; hasAvatar: boolean; level: string; levelColor: string }

export function distribution(emps: Employee[]): { total: number; segs: EscSeg[]; informed: number } {
  const c: Record<string, number> = {}
  emps.forEach((e) => { const k = lvl(e); c[k] = (c[k] ?? 0) + 1 })
  const total = emps.length || 1
  const segs = Object.keys(c).sort((a, b) => rank(a) - rank(b)).map((k) => ({
    label: k, count: c[k], pct: Math.round((c[k] / total) * 100), color: ESC_COLOR[k] ?? '#9aa1ac',
  }))
  const informed = emps.filter((e) => e.escolaridade).length
  return { total: emps.length, segs, informed }
}

function people(emps: Employee[]): EscPerson[] {
  return [...emps]
    .sort((a, b) => rank(lvl(a)) - rank(lvl(b)) || a.nome.localeCompare(b.nome))
    .map((e) => ({
      id: e.id, nome: e.nome, username: e.username, initials: e.initials, color: e.color, hasAvatar: e.hasAvatar,
      level: lvl(e), levelColor: ESC_COLOR[lvl(e)] ?? '#9aa1ac',
    }))
}

export function educationByDept(data: TalentData) {
  const overall = distribution(data.employees)
  const byDept = [...data.departments]
    .sort((a, b) => b.headcount - a.headcount)
    .map((d) => {
      const emps = data.employees.filter((e) => e.dept === d.id)
      const dist = distribution(emps)
      return { id: d.id, nome: d.nome, total: dist.total, informed: dist.informed, segs: dist.segs, people: people(emps) }
    })
  return { overall, byDept }
}
