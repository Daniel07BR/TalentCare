/* ============================================================
   TalentCare — modelagem de dados.
   IDENTIDADE (nome, cargo, setor, foto, admissão, status) é REAL,
   vinda do Nexus (ver lib/data/source.ts).
   MÉTRICAS de performance (score, fatores, tarefas, faltas, escolaridade…)
   são SIMULADAS de forma determinística por seed do id, até a frente B
   (ingestão de métricas reais). Mesmas assinaturas de VM serão mantidas.
   ============================================================ */

export type Factor = { key: string; label: string; peso: number; nota: number }

export type Employee = {
  id: string
  nome: string
  dept: string          // = departmentId real
  cargo: string
  status: string        // Ativo | Férias | Afastado | Desligado
  escolaridade: string
  tempoMeses: number
  score: number
  factors: Factor[]
  hist: number[]
  initials: string
  color: string
  delta: number
  hasAvatar: boolean
  tasksDone: number
  tasksLate: number
  tasksPend: number
  faltas: number
  atrasos: number
  advertencias: number
  suspensoes: number
  radioHoras: number
  radioSemana: number[]
  admissao: string
}

export type Department = {
  id: string
  nome: string
  headcount: number
  score: number
  turnover: number
  spark: number[]
  color: string
  lider: string
}

export type TalentData = {
  employees: Employee[]
  departments: Department[]
  deptMeta: Record<string, string>
}

/** Identidade real de um funcionário (vinda do Nexus via Prisma). */
export type Identity = {
  id: string
  nome: string
  cargo: string | null
  deptId: string | null
  deptName: string | null
  active: boolean
  hasAvatar: boolean
  entryDate: Date | null
}

export const FACTORS = [
  { key: 'prod', label: 'Produtividade', peso: 30 },
  { key: 'prazo', label: 'Prazos', peso: 25 },
  { key: 'assid', label: 'Assiduidade', peso: 20 },
  { key: 'form', label: 'Formação', peso: 15 },
  { key: 'colab', label: 'Colaboração', peso: 10 },
] as const

export const ESC_ORDER = [
  'Ensino Médio', 'Técnico', 'Superior Incompleto', 'Superior Completo', 'Pós-graduação', 'MBA',
]
export const PALETTE = [
  'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)',
]
export const SYSTEMS = ['HelpDesk', 'ClassRoom', 'Consultoria Plus', 'Painel de Atendimento', 'CIDE']

const BASE_DATE = new Date(2026, 5, 1) // jun/2026 — referência fixa (determinístico)

/** PRNG determinístico por seed (sin-based). */
export function rnd(s: number): number {
  const x = Math.sin(s * 99.13 + 17.7) * 43758.5453
  return x - Math.floor(x)
}

/** Seed numérico estável a partir do id (cuid/uuid). */
export function seedOf(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return (h % 100000) + 1
}

export function ini(nome: string): string {
  const p = nome.trim().split(/\s+/).filter(Boolean)
  if (!p.length) return '?'
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}

export function scoreColor(s: number): string {
  return s < 50 ? 'var(--danger)' : s < 75 ? 'var(--accent)' : 'var(--success)'
}

export function admissao(meses: number): string {
  const d = new Date(BASE_DATE)
  d.setMonth(d.getMonth() - meses)
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

export function statusMeta(s: string): { color: string; bg: string } {
  const m: Record<string, [string, string]> = {
    Ativo: ['var(--success)', 'rgba(63,178,85,.13)'],
    'Férias': ['var(--info)', 'rgba(91,157,240,.13)'],
    Afastado: ['var(--warning)', 'rgba(245,166,35,.13)'],
    Desligado: ['var(--text-mute)', 'rgba(107,114,126,.13)'],
  }
  return { color: (m[s] ?? m.Ativo)[0], bg: (m[s] ?? m.Ativo)[1] }
}

export function fmtTempo(m: number): string {
  const y = Math.floor(m / 12), mo = m % 12
  const a: string[] = []
  if (y) a.push(y + (y > 1 ? ' anos' : ' ano'))
  if (mo) a.push(mo + (mo > 1 ? ' meses' : ' mês'))
  return a.join(' e ') || 'recente'
}

export function sysColor(s: string): string {
  return ({
    HelpDesk: 'var(--chart-4)', ClassRoom: 'var(--chart-2)', 'Consultoria Plus': 'var(--chart-3)',
    'Painel de Atendimento': 'var(--chart-1)', CIDE: 'var(--chart-5)',
  } as Record<string, string>)[s]
}

/* ---------- geometria de gráfico ---------- */
export function geomSpark(vals: number[], w: number, h: number): string {
  const mx = Math.max(...vals), mn = Math.min(...vals), r = (mx - mn) || 1, n = vals.length
  return vals.map((v, i) => ((i / (n - 1)) * w).toFixed(1) + ',' + (h - ((v - mn) / r) * h).toFixed(1)).join(' ')
}
export function geomLine(vals: number[], w: number, h: number, pad = 6): { line: string; area: string; pts: [number, number][] } {
  const mx = Math.max(...vals), mn = Math.min(...vals) * 0.85, r = (mx - mn) || 1, n = vals.length
  const pts: [number, number][] = vals.map((v, i) => [pad + (i / (n - 1)) * (w - 2 * pad), h - pad - ((v - mn) / r) * (h - 2 * pad)])
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  const area = line + ' L ' + pts[n - 1][0].toFixed(1) + ' ' + (h - pad) + ' L ' + pts[0][0].toFixed(1) + ' ' + (h - pad) + ' Z'
  return { line, area, pts }
}

function monthsSince(d: Date | null, seed: number): number {
  if (d && !isNaN(d.getTime())) {
    const m = (BASE_DATE.getFullYear() - d.getFullYear()) * 12 + (BASE_DATE.getMonth() - d.getMonth())
    return Math.max(1, Math.min(420, m))
  }
  return 6 + Math.floor(rnd(seed * 1.31) * 72) // sem admissão → 6m..6anos
}

/** Simula as MÉTRICAS de um funcionário a partir da identidade real. */
function simulateEmployee(id8: Identity, idx: number): Employee {
  const seed = seedOf(id8.id)
  const score = 48 + Math.round(rnd(seed * 1.7) * 48) // 48..96
  const escolaridade = ESC_ORDER[Math.floor(rnd(seed * 2.3) * ESC_ORDER.length)] ?? 'Superior Completo'
  const tempoMeses = monthsSince(id8.entryDate, seed)
  const status = id8.active ? 'Ativo' : 'Desligado'

  const factors: Factor[] = FACTORS.map((f, fi) => {
    const off = Math.round(rnd(seed * 7 + fi * 3.1) * 26 - 13)
    return { key: f.key, label: f.label, peso: f.peso, nota: Math.max(25, Math.min(99, score + off)) }
  })
  const hist: number[] = []
  let s = Math.max(30, score - Math.round(rnd(seed + 2) * 12))
  for (let m = 0; m < 12; m++) {
    s += Math.round(rnd(seed * 13 + m) * 9 - 4)
    s = Math.max(35, Math.min(98, s))
    if (m === 11) s = score
    hist.push(s)
  }
  const tasksDone = 24 + Math.round(rnd(seed * 3) * 120)
  return {
    id: id8.id, nome: id8.nome, dept: id8.deptId ?? 'sem', cargo: id8.cargo || 'Colaborador',
    status, escolaridade, tempoMeses, score, factors, hist,
    initials: ini(id8.nome), color: PALETTE[seed % 6], delta: score - hist[10], hasAvatar: id8.hasAvatar,
    tasksDone, tasksLate: Math.round(tasksDone * (0.03 + rnd(seed * 5) * 0.13)), tasksPend: Math.round(rnd(seed * 4) * 16),
    faltas: Math.round(rnd(seed * 9) * 4), atrasos: Math.round(rnd(seed * 11) * 9),
    advertencias: Math.round(rnd(seed * 6.3) * 3), suspensoes: rnd(seed * 8.1) > 0.82 ? 1 : 0,
    radioHoras: +(28 + rnd(seed * 4.7) * 92).toFixed(0),
    radioSemana: Array.from({ length: 8 }, (_, w) => +((2 + rnd(seed * 3 + w * 1.7) * 7)).toFixed(1)),
    admissao: id8.entryDate && !isNaN(id8.entryDate.getTime())
      ? id8.entryDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
      : admissao(tempoMeses),
  }
}

/** Monta o TalentData (employees + departments) a partir das identidades reais. */
export function assembleData(identities: Identity[]): TalentData {
  const employees = identities.map((id8, i) => simulateEmployee(id8, i))

  const deptMeta: Record<string, string> = {}
  for (const id8 of identities) {
    if (id8.deptId) deptMeta[id8.deptId] = id8.deptName || id8.deptId
  }
  deptMeta['sem'] = deptMeta['sem'] || 'Sem setor'

  const departments: Department[] = Object.keys(deptMeta)
    .map((id) => {
      const emps = employees.filter((e) => e.dept === id)
      if (!emps.length) return null
      const hc = emps.length
      const score = Math.round(emps.reduce((a, e) => a + e.score, 0) / hc)
      const dseed = seedOf(id)
      const turnover = +(3.5 + rnd(dseed * 5.3) * 13).toFixed(1)
      const spark: number[] = []
      let v = score - 6
      for (let m = 0; m < 12; m++) {
        v += Math.round(rnd(dseed * 17 + m) * 7 - 3)
        v = Math.max(40, Math.min(97, v))
        if (m === 11) v = score
        spark.push(v)
      }
      return {
        id, nome: deptMeta[id], headcount: hc, score, turnover, spark, color: PALETTE[dseed % 6],
        lider: (emps.find((e) => /Coorden|Gerente|Gestor|Tech|Tesour|Diretor|Coordenadora|Contador/.test(e.cargo)) || emps.slice().sort((a, b) => b.score - a.score)[0]).nome,
      }
    })
    .filter((d): d is Department => d !== null)

  return { employees, departments, deptMeta }
}
