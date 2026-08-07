/* ============================================================
   TalentCare — distribuição de escolaridade (dados REAIS). Puro em função de data.
   ============================================================ */
import type { Employee, TalentData } from './data'
import { deptName } from './employee'
import { ESC_RANK, ESC_COLOR, personLevels } from '../education-edit'

export { ESC_RANK, ESC_COLOR }

const lvl = (e: Employee) => e.escolaridade || 'Não informado'
const rank = (k: string) => { const i = ESC_RANK.indexOf(k); return i < 0 ? 99 : i }
const colorOf = (k: string) => ESC_COLOR[k] ?? '#9aa1ac'
// Níveis exibidos de uma pessoa (badges + contagem). Quem tem pós-graduações
// conta em TODAS elas (ver personLevels).
const levelsOf = (e: Employee) => personLevels(e.eduCursos, e.escolaridade)

export type EscSeg = { label: string; count: number; pct: number; color: string }
export type EscLevel = { label: string; color: string }
export type EscPerson = { id: string; nome: string; username: string | null; dept: string; initials: string; color: string; hasAvatar: boolean; level: string; levelColor: string; levels: EscLevel[] }

export function distribution(emps: Employee[]): { total: number; segs: EscSeg[]; informed: number } {
  // Multi-contagem: uma pessoa entra em CADA formação que possui (MBA + Pós +
  // Extensão contam separado). pct é a fatia entre as formações (donut/barra
  // fecham 100%); `count` é o nº de pessoas com aquela formação.
  const c: Record<string, number> = {}
  emps.forEach((e) => levelsOf(e).forEach((k) => { c[k] = (c[k] ?? 0) + 1 }))
  const sum = Object.values(c).reduce((a, b) => a + b, 0) || 1
  const segs = Object.keys(c).sort((a, b) => rank(a) - rank(b)).map((k) => ({
    label: k, count: c[k], pct: Math.round((c[k] / sum) * 100), color: colorOf(k),
  }))
  const informed = emps.filter((e) => e.escolaridade && e.escolaridade !== 'Não informado').length
  return { total: emps.length, segs, informed }
}

function people(data: TalentData, emps: Employee[]): EscPerson[] {
  return [...emps]
    .sort((a, b) => rank(lvl(a)) - rank(lvl(b)) || a.nome.localeCompare(b.nome))
    .map((e) => {
      const lvls = levelsOf(e)
      return {
        id: e.id, nome: e.nome, username: e.username, dept: deptName(data, e.dept), initials: e.initials, color: e.color, hasAvatar: e.hasAvatar,
        level: lvls[0], levelColor: colorOf(lvls[0]),
        levels: lvls.map((l) => ({ label: l, color: colorOf(l) })),
      }
    })
}

export function educationByDept(data: TalentData) {
  // Escolaridade considera apenas ATIVOS (desligados não entram na distribuição).
  const ativos = data.employees.filter((e) => e.status !== 'Desligado')
  const overall = distribution(ativos)
  const byDept = [...data.departments]
    .sort((a, b) => b.headcount - a.headcount)
    .map((d) => {
      const emps = ativos.filter((e) => e.dept === d.id)
      const dist = distribution(emps)
      return { id: d.id, nome: d.nome, total: dist.total, informed: dist.informed, segs: dist.segs, people: people(data, emps) }
    })
    .filter((d) => d.total > 0)
  const semInfo = people(data, ativos.filter((e) => !e.escolaridade)).sort((a, b) => a.dept.localeCompare(b.dept) || a.nome.localeCompare(b.nome))
  return { overall, byDept, semInfo }
}
