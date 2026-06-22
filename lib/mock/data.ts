/* ============================================================
   TalentCare — dados mockados (determinísticos)
   Porte fiel do build()/helpers do protótipo Claude Designer.
   Determinístico (rnd por seed) → idêntico em SSR e cliente.
   Substituível pela fonte real (Nexus + ingestão de métricas).
   ============================================================ */

export type Factor = { key: string; label: string; peso: number; nota: number }

export type Employee = {
  id: string
  nome: string
  dept: string
  cargo: string
  status: string
  escolaridade: string
  tempoMeses: number
  score: number
  factors: Factor[]
  hist: number[]
  initials: string
  color: string
  delta: number
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

/** PRNG determinístico por seed (sin-based, igual ao protótipo). */
export function rnd(s: number): number {
  const x = Math.sin(s * 99.13 + 17.7) * 43758.5453
  return x - Math.floor(x)
}

export function ini(nome: string): string {
  const p = nome.split(' ')
  return (p[0][0] + (p[p.length - 1][0] || '')).toUpperCase()
}

export function scoreColor(s: number): string {
  return s < 50 ? 'var(--danger)' : s < 75 ? 'var(--accent)' : 'var(--success)'
}

/** Mês/ano de admissão a partir do tempo de casa em meses (base fixa: jun/2026). */
export function admissao(meses: number): string {
  const d = new Date(2026, 5, 1)
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
  return { color: m[s][0], bg: m[s][1] }
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
    HelpDesk: 'var(--chart-4)',
    ClassRoom: 'var(--chart-2)',
    'Consultoria Plus': 'var(--chart-3)',
    'Painel de Atendimento': 'var(--chart-1)',
    CIDE: 'var(--chart-5)',
  } as Record<string, string>)[s]
}

/* ---------- geometria de gráfico (SVG) ---------- */

export function geomSpark(vals: number[], w: number, h: number): string {
  const mx = Math.max(...vals), mn = Math.min(...vals), r = (mx - mn) || 1, n = vals.length
  return vals
    .map((v, i) => ((i / (n - 1)) * w).toFixed(1) + ',' + (h - ((v - mn) / r) * h).toFixed(1))
    .join(' ')
}

export function geomLine(vals: number[], w: number, h: number, pad = 6): { line: string; area: string; pts: [number, number][] } {
  const mx = Math.max(...vals), mn = Math.min(...vals) * 0.85, r = (mx - mn) || 1, n = vals.length
  const pts: [number, number][] = vals.map((v, i) => [pad + (i / (n - 1)) * (w - 2 * pad), h - pad - ((v - mn) / r) * (h - 2 * pad)])
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  const area = line + ' L ' + pts[n - 1][0].toFixed(1) + ' ' + (h - pad) + ' L ' + pts[0][0].toFixed(1) + ' ' + (h - pad) + ' Z'
  return { line, area, pts }
}

/* ---------- construção do dataset ---------- */

let _cache: TalentData | null = null

export function buildData(): TalentData {
  if (_cache) return _cache

  const deptMeta: Record<string, string> = {
    pessoal: 'Pessoal', legal: 'Legal', ti: 'T.I', fiscal: 'Fiscal', fin: 'Financeiro',
    contabil: 'Contábil', prog: 'Programação', mkt: 'Marketing', imoveis: 'Imóveis', recepcao: 'Recepção',
  }

  const base: [string, string, string, string, string, number, number][] = [
    ['Ana Beatriz Carvalho', 'pessoal', 'Coordenadora de RH', 'Ativo', 'MBA', 84, 88],
    ['Rafael Moreira', 'ti', 'Coordenador de TI', 'Ativo', 'Superior Completo', 61, 82],
    ['Juliana Prado', 'fiscal', 'Coordenadora Fiscal', 'Ativo', 'Pós-graduação', 96, 91],
    ['Lucas Ferreira', 'prog', 'Tech Lead', 'Ativo', 'Superior Completo', 53, 86],
    ['Mariana Souza', 'contabil', 'Contadora', 'Ativo', 'Pós-graduação', 72, 79],
    ['Bruno Almeida', 'prog', 'Desenvolvedor Pleno', 'Ativo', 'Superior Completo', 34, 74],
    ['Camila Nogueira', 'mkt', 'Analista de Marketing', 'Ativo', 'Superior Completo', 28, 71],
    ['Thiago Barbosa', 'fin', 'Analista Financeiro', 'Ativo', 'Superior Completo', 45, 68],
    ['Fernanda Lima', 'legal', 'Advogada', 'Ativo', 'Pós-graduação', 67, 84],
    ['Gustavo Ribeiro', 'ti', 'Analista de Suporte', 'Ativo', 'Técnico', 22, 63],
    ['Patrícia Mendes', 'pessoal', 'Analista de DP', 'Ativo', 'Superior Completo', 40, 77],
    ['Diego Santana', 'imoveis', 'Corretor', 'Ativo', 'Superior Incompleto', 19, 58],
    ['Larissa Pereira', 'contabil', 'Assistente Contábil', 'Férias', 'Superior Incompleto', 14, 66],
    ['Rodrigo Tavares', 'prog', 'Desenvolvedor Sênior', 'Ativo', 'Superior Completo', 58, 89],
    ['Beatriz Cardoso', 'recepcao', 'Recepcionista', 'Ativo', 'Ensino Médio', 31, 72],
    ['Felipe Azevedo', 'fiscal', 'Analista Fiscal', 'Ativo', 'Superior Completo', 26, 70],
    ['Vanessa Rocha', 'legal', 'Assistente Jurídico', 'Ativo', 'Superior Incompleto', 17, 61],
    ['Marcelo Pinto', 'fin', 'Tesoureiro', 'Afastado', 'Superior Completo', 88, 75],
    ['Aline Castro', 'mkt', 'Designer', 'Ativo', 'Superior Completo', 23, 80],
    ['Henrique Dias', 'ti', 'Analista de Infra', 'Ativo', 'Técnico', 49, 78],
    ['Carolina Freitas', 'pessoal', 'Assistente de Pessoal', 'Desligado', 'Superior Incompleto', 11, 47],
    ['Eduardo Ramos', 'prog', 'Dev Júnior', 'Ativo', 'Superior Incompleto', 9, 64],
    ['Natália Gomes', 'contabil', 'Coordenadora Contábil', 'Ativo', 'MBA', 79, 92],
    ['Vinícius Lopes', 'imoveis', 'Gestor de Imóveis', 'Ativo', 'Pós-graduação', 63, 81],
  ]

  const employees: Employee[] = base.map((b, i) => {
    const [nome, dept, cargo, status, esc, tempo, score] = b
    const factors: Factor[] = FACTORS.map((f, fi) => {
      const off = Math.round(rnd(i * 7 + fi * 3.1) * 26 - 13)
      return { key: f.key, label: f.label, peso: f.peso, nota: Math.max(25, Math.min(99, score + off)) }
    })
    const hist: number[] = []
    let s = Math.max(30, score - Math.round(rnd(i + 2) * 12))
    for (let m = 0; m < 12; m++) {
      s += Math.round(rnd(i * 13 + m) * 9 - 4)
      s = Math.max(35, Math.min(98, s))
      if (m === 11) s = score
      hist.push(s)
    }
    const tasksDone = 24 + Math.round(rnd(i * 3) * 120)
    return {
      id: 'e' + (i + 1), nome, dept, cargo, status, escolaridade: esc, tempoMeses: tempo, score,
      factors, hist, initials: ini(nome), color: PALETTE[i % 6], delta: score - hist[10],
      tasksDone, tasksLate: Math.round(tasksDone * (0.03 + rnd(i * 5) * 0.13)), tasksPend: Math.round(rnd(i * 4) * 16),
      faltas: Math.round(rnd(i * 9) * 4), atrasos: Math.round(rnd(i * 11) * 9),
      advertencias: Math.round(rnd(i * 6.3) * 3), suspensoes: rnd(i * 8.1) > 0.82 ? 1 : 0,
      radioHoras: +(28 + rnd(i * 4.7) * 92).toFixed(0),
      radioSemana: Array.from({ length: 8 }, (_, w) => +((2 + rnd(i * 3 + w * 1.7) * 7)).toFixed(1)),
      admissao: admissao(tempo),
    }
  })

  const departments: Department[] = Object.keys(deptMeta).map((id, i) => {
    const emps = employees.filter((e) => e.dept === id)
    const hc = emps.length || 1
    const score = Math.round(emps.reduce((a, e) => a + e.score, 0) / hc)
    const turnover = +(3.5 + rnd(i * 5.3) * 13).toFixed(1)
    const spark: number[] = []
    let v = score - 6
    for (let m = 0; m < 12; m++) {
      v += Math.round(rnd(i * 17 + m) * 7 - 3)
      v = Math.max(40, Math.min(97, v))
      if (m === 11) v = score
      spark.push(v)
    }
    return {
      id, nome: deptMeta[id], headcount: emps.length, score, turnover, spark, color: PALETTE[i % 6],
      lider: (emps.find((e) => /Coorden|Tech|Gestor|Tesour|Contadora/.test(e.cargo)) || emps[0] || ({} as Employee)).nome || '—',
    }
  })

  _cache = { employees, departments, deptMeta }
  return _cache
}
