/* ============================================================
   TalentCare — demografia: gerações/idade e gênero (dados REAIS).
   Considera o quadro ATUAL: ativos e SEM a Diretoria.
   ============================================================ */
import type { Employee, TalentData } from './data'
import { noQuadroEm } from '@/lib/quadro'
import { deptName } from './employee'

const NOW_YEAR = new Date().getFullYear()
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function workforce(data: TalentData): Employee[] {
  return data.employees.filter((e) => e.status !== 'Desligado' && !norm(data.deptMeta[e.dept] || '').includes('diretoria'))
}

/**
 * ⚠️⚠️ O QUADRO NUM DIA (decisão do dono, 11/09/2026): quem estava na casa (sem a
 * Diretoria) ao fim de `dia` — entrou até ele e não tinha saído. É o retrato que
 * Gerações e Gênero do painel mostram para o último dia do período. `workforce()`
 * continua sendo "ativo hoje", que é o que as contas de assiduidade precisam.
 * A régua do "estar no quadro" mora em `lib/quadro.ts`.
 */
export function quadroEm(data: TalentData, dia: string): Employee[] {
  return data.employees.filter((e) => !norm(data.deptMeta[e.dept] || '').includes('diretoria')
    && noQuadroEm({ entrada: e.hireISO ?? null, saida: e.leftISO ?? null }, dia))
}

/** Idade completa — hoje, ou em `dia` (AAAA-MM-DD). */
export function ageOf(birthISO: string | null, dia?: string): number | null {
  if (!birthISO) return null
  const b = new Date(birthISO), t = dia ? new Date(`${dia}T12:00:00`) : new Date()
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

export type GenSeg = { key: string; label: string; count: number; pct: number; color: string; desc: string; ages: string }

function genDist(emps: Employee[], dia?: string): { segs: GenSeg[]; total: number; withDob: number; avg: number | null } {
  const order = [...GENERATIONS, NI]
  const total = emps.length || 1
  const segs: GenSeg[] = order.map((g) => {
    const count = emps.filter((e) => genOf(e.birthDate).key === g.key).length
    return { key: g.key, label: g.label, count, pct: Math.round((count / total) * 100), color: g.color, desc: g.key === 'ni' ? 'Sem data de nascimento' : genRange(g as Gen), ages: g.key === 'ni' ? '' : `${NOW_YEAR - (g as Gen).to}–${NOW_YEAR - (g as Gen).from}` }
  }).filter((s) => s.count > 0)
  const ages = emps.map((e) => ageOf(e.birthDate, dia)).filter((a): a is number => a != null)
  const avg = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null
  return { segs, total: emps.length, withDob: ages.length, avg }
}

export type GenPerson = { id: string; nome: string; username: string | null; dept: string; initials: string; color: string; hasAvatar: boolean; gen: string; genColor: string; age: number | null; nasc: string | null }
function genPeople(data: TalentData, emps: Employee[], dia?: string): GenPerson[] {
  return [...emps]
    .sort((a, b) => (ageOf(b.birthDate, dia) ?? -1) - (ageOf(a.birthDate, dia) ?? -1) || a.nome.localeCompare(b.nome))
    .map((e) => {
      const g = genOf(e.birthDate)
      return { id: e.id, nome: e.nome, username: e.username, dept: deptName(data, e.dept), initials: e.initials, color: e.color, hasAvatar: e.hasAvatar, gen: g.label, genColor: g.color, age: ageOf(e.birthDate, dia), nasc: e.birthDate ? new Date(e.birthDate).toLocaleDateString('pt-BR') : null }
    })
}

/** `dia`: o retrato do fim do período (sem ele, hoje — as páginas /geracoes e /genero). */
export function generationsVM(data: TalentData, dia?: string) {
  const emps = dia ? quadroEm(data, dia) : workforce(data)
  const overall = genDist(emps, dia)
  const byDept = [...data.departments]
    .map((d) => ({ id: d.id, nome: d.nome, emps: emps.filter((e) => e.dept === d.id) }))
    .filter((d) => d.emps.length > 0)
    .sort((a, b) => b.emps.length - a.emps.length)
    .map((d) => { const dist = genDist(d.emps, dia); return { id: d.id, nome: d.nome, total: dist.total, avg: dist.avg, withDob: dist.withDob, segs: dist.segs, people: genPeople(data, d.emps, dia) } })
  return { overall, byDept }
}

/* -------- gênero (M × F) -------- */
export const gNorm = (g: string | null) => { const n = norm(g || ''); return n.startsWith('masc') ? 'M' : n.startsWith('fem') ? 'F' : '?' }

function genderStats(emps: Employee[], dia?: string) {
  const m = emps.filter((e) => gNorm(e.gender) === 'M')
  const f = emps.filter((e) => gNorm(e.gender) === 'F')
  const ni = emps.filter((e) => gNorm(e.gender) === '?')
  const avg = (list: Employee[]) => { const a = list.map((e) => ageOf(e.birthDate, dia)).filter((x): x is number => x != null); return a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : null }
  /* ⚠️⚠️ `null`, NUNCA 0, quando ninguém do grupo tem score aplicável. Zero num
     cartão chamado "Score médio" se lê como "esse grupo é péssimo", e o que
     houve foi ninguém ser medido — é a regra do `null` da casa, e este era o
     último lugar do painel onde ela ainda não valia. Hoje os dois grupos têm
     gente pontuável (25 homens, 67 mulheres), então o defeito estava esperando
     um recorte pequeno para aparecer. */
  const score = (list: Employee[]) => { const sc = list.filter((e) => e.hasScore); return sc.length ? Math.round(sc.reduce((s, e) => s + e.score, 0) / sc.length) : null }
  const total = m.length + f.length || 1
  return {
    m: m.length, f: f.length, ni: ni.length,
    mPct: Math.round((m.length / total) * 100), fPct: Math.round((f.length / total) * 100),
    avgM: avg(m), avgF: avg(f), scoreM: score(m), scoreF: score(f),
  }
}

export function genderVM(data: TalentData, dia?: string) {
  const emps = dia ? quadroEm(data, dia) : workforce(data)
  const overall = genderStats(emps, dia)
  const byDept = [...data.departments]
    .map((d) => ({ id: d.id, nome: d.nome, emps: emps.filter((e) => e.dept === d.id) }))
    .filter((d) => d.emps.length > 0)
    .sort((a, b) => b.emps.length - a.emps.length)
    .map((d) => ({ id: d.id, nome: d.nome, ...genderStats(d.emps, dia), total: d.emps.length }))
  return { overall, byDept }
}
