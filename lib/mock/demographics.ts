/* ============================================================
   TalentCare — demografia: gerações/idade e gênero (dados REAIS).
   Considera o quadro ATUAL: ativos e SEM a Diretoria.
   ============================================================ */
import type { Employee, TalentData } from './data'
import { deptName } from './employee'

const NOW_YEAR = new Date().getFullYear()
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function workforce(data: TalentData): Employee[] {
  return data.employees.filter((e) => e.status !== 'Desligado' && !norm(data.deptMeta[e.dept] || '').includes('diretoria'))
}

export function ageOf(birthISO: string | null): number | null {
  if (!birthISO) return null
  const b = new Date(birthISO), t = new Date()
  return t.getFullYear() - b.getFullYear() - (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate()) ? 1 : 0)
}

export type Gen = { key: string; label: string; from: number; to: number; color: string }
export const GENERATIONS: Gen[] = [
  { key: 'z', label: 'Geração Z', from: 1997, to: 2012, color: '#56c5e8' },
  { key: 'y', label: 'Geração Y (Millennials)', from: 1981, to: 1996, color: '#36b9a6' },
  { key: 'x', label: 'Geração X', from: 1965, to: 1980, color: '#a78bfa' },
  { key: 'bb', label: 'Baby Boomers', from: 1946, to: 1964, color: '#f5a623' },
  { key: 's', label: 'Geração Silenciosa', from: 1928, to: 1945, color: '#e0857a' },
]
const NI = { key: 'ni', label: 'Não informado', from: 0, to: 0, color: '#9aa1ac' }

export function genOf(birthISO: string | null): Gen | typeof NI {
  if (!birthISO) return NI
  const y = new Date(birthISO).getFullYear()
  return GENERATIONS.find((g) => y >= g.from && y <= g.to) ?? NI
}
/** "1965–1980 · 46–61 anos" */
export function genRange(g: Gen): string {
  return `${g.from}–${g.to} · ${NOW_YEAR - g.to}–${NOW_YEAR - g.from} anos`
}

export type GenSeg = { key: string; label: string; count: number; pct: number; color: string; desc: string }

function genDist(emps: Employee[]): { segs: GenSeg[]; total: number; withDob: number; avg: number | null } {
  const order = [...GENERATIONS, NI]
  const total = emps.length || 1
  const segs: GenSeg[] = order.map((g) => {
    const count = emps.filter((e) => genOf(e.birthDate).key === g.key).length
    return { key: g.key, label: g.label, count, pct: Math.round((count / total) * 100), color: g.color, desc: g.key === 'ni' ? 'Sem data de nascimento' : genRange(g as Gen) }
  }).filter((s) => s.count > 0)
  const ages = emps.map((e) => ageOf(e.birthDate)).filter((a): a is number => a != null)
  const avg = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null
  return { segs, total: emps.length, withDob: ages.length, avg }
}

export type GenPerson = { id: string; nome: string; username: string | null; dept: string; initials: string; color: string; hasAvatar: boolean; gen: string; genColor: string; age: number | null; nasc: string | null }
function genPeople(data: TalentData, emps: Employee[]): GenPerson[] {
  return [...emps]
    .sort((a, b) => (ageOf(b.birthDate) ?? -1) - (ageOf(a.birthDate) ?? -1) || a.nome.localeCompare(b.nome))
    .map((e) => {
      const g = genOf(e.birthDate)
      return { id: e.id, nome: e.nome, username: e.username, dept: deptName(data, e.dept), initials: e.initials, color: e.color, hasAvatar: e.hasAvatar, gen: g.label, genColor: g.color, age: ageOf(e.birthDate), nasc: e.birthDate ? new Date(e.birthDate).toLocaleDateString('pt-BR') : null }
    })
}

export function generationsVM(data: TalentData) {
  const emps = workforce(data)
  const overall = genDist(emps)
  const byDept = [...data.departments]
    .map((d) => ({ id: d.id, nome: d.nome, emps: emps.filter((e) => e.dept === d.id) }))
    .filter((d) => d.emps.length > 0)
    .sort((a, b) => b.emps.length - a.emps.length)
    .map((d) => { const dist = genDist(d.emps); return { id: d.id, nome: d.nome, total: dist.total, avg: dist.avg, withDob: dist.withDob, segs: dist.segs, people: genPeople(data, d.emps) } })
  return { overall, byDept }
}

/* -------- gênero (M × F) -------- */
const gNorm = (g: string | null) => { const n = norm(g || ''); return n.startsWith('masc') ? 'M' : n.startsWith('fem') ? 'F' : '?' }

function genderStats(emps: Employee[]) {
  const m = emps.filter((e) => gNorm(e.gender) === 'M')
  const f = emps.filter((e) => gNorm(e.gender) === 'F')
  const ni = emps.filter((e) => gNorm(e.gender) === '?')
  const avg = (list: Employee[]) => { const a = list.map((e) => ageOf(e.birthDate)).filter((x): x is number => x != null); return a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : null }
  const score = (list: Employee[]) => { const sc = list.filter((e) => e.hasScore); return sc.length ? Math.round(sc.reduce((s, e) => s + e.score, 0) / sc.length) : 0 }
  const total = m.length + f.length || 1
  return {
    m: m.length, f: f.length, ni: ni.length,
    mPct: Math.round((m.length / total) * 100), fPct: Math.round((f.length / total) * 100),
    avgM: avg(m), avgF: avg(f), scoreM: score(m), scoreF: score(f),
  }
}

export function genderVM(data: TalentData) {
  const emps = workforce(data)
  const overall = genderStats(emps)
  const byDept = [...data.departments]
    .map((d) => ({ id: d.id, nome: d.nome, emps: emps.filter((e) => e.dept === d.id) }))
    .filter((d) => d.emps.length > 0)
    .sort((a, b) => b.emps.length - a.emps.length)
    .map((d) => ({ id: d.id, nome: d.nome, ...genderStats(d.emps), total: d.emps.length }))
  return { overall, byDept }
}
