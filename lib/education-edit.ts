// Modelo estruturado de formação acadêmica (editor /escolaridade).
// Um funcionário pode ter VÁRIOS níveis ao mesmo tempo (ex.: Superior + MBA + Pós).
// Cada nível marcado pode ter um curso digitado e a marca "cursando" (não concluído).
// A partir dos itens marcados derivamos:
//   - `level`  = o nível mais alto (alimenta o donut/etiqueta de escolaridade)
//   - `detail` = "Graduação: X · Pós: Y (cursando)" (alimenta a aba Formação da ficha)
// Módulo PURO (sem server-only) — usado pelo editor (client) e pela API (server).

export type EduItem = { tipo: string; curso: string; cursando: boolean }

// Ordem de exibição (do mais básico ao mais alto). `label` = rótulo gravado no
// `detail`. `hasCourse` = se abre campo de curso ao marcar.
export const EDU_TIPOS: { tipo: string; label: string; hasCourse: boolean }[] = [
  { tipo: 'Ensino Fundamental', label: 'Ensino Fundamental', hasCourse: false },
  { tipo: 'Ensino Médio', label: 'Ensino Médio', hasCourse: false },
  { tipo: 'Médio Técnico', label: 'Médio técnico', hasCourse: true },
  { tipo: 'Superior', label: 'Graduação', hasCourse: true },
  { tipo: 'Pós-graduação', label: 'Pós', hasCourse: true },
  { tipo: 'Extensão de Pós', label: 'Extensão', hasCourse: true },
  { tipo: 'MBA', label: 'MBA', hasCourse: true },
  { tipo: 'Mestrado', label: 'Mestrado', hasCourse: true },
  { tipo: 'Doutorado', label: 'Doutorado', hasCourse: true },
]

const LABEL_OF = Object.fromEntries(EDU_TIPOS.map((t) => [t.tipo, t.label]))
const HAS_COURSE = Object.fromEntries(EDU_TIPOS.map((t) => [t.tipo, t.hasCourse]))

// Ranking de escolaridade (espelha ESC_RANK em lib/mock/education; índice menor = mais alto).
const RANK = [
  'Doutorado', 'Mestrado', 'MBA', 'Pós-graduação', 'Superior Completo', 'Superior (cursando)',
  'Superior Incompleto', 'Médio Técnico', 'Técnico', 'Ensino Médio', 'Ensino Fundamental',
]

// tipo marcado → nível canônico (Superior depende de "cursando").
function levelOfItem(it: EduItem): string | null {
  switch (it.tipo) {
    case 'Doutorado': return 'Doutorado'
    case 'Mestrado': return 'Mestrado'
    case 'MBA': return 'MBA'
    case 'Pós-graduação':
    case 'Extensão de Pós': return 'Pós-graduação'
    case 'Superior': return it.cursando ? 'Superior (cursando)' : 'Superior Completo'
    case 'Médio Técnico': return 'Médio Técnico'
    case 'Ensino Médio': return 'Ensino Médio'
    case 'Ensino Fundamental': return 'Ensino Fundamental'
    default: return null
  }
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Itens marcados → { level (mais alto), detail (cursos com nome) }. */
export function deriveLevelAndDetail(items: EduItem[]): { level: string | null; detail: string | null } {
  let level: string | null = null
  let bestRank = 99
  for (const it of items) {
    const lvl = levelOfItem(it)
    if (!lvl) continue
    const r = RANK.indexOf(lvl)
    if (r >= 0 && r < bestRank) { bestRank = r; level = lvl }
  }
  const detail = items
    .filter((it) => HAS_COURSE[it.tipo] && it.curso.trim())
    .map((it) => `${LABEL_OF[it.tipo]}: ${it.curso.trim()}${it.cursando ? ' (cursando)' : ''}`)
    .join(' · ')
  return { level, detail: detail || null }
}

// Rótulo do detail (ou nível) → tipo do editor.
function tipoFromLabel(label: string): string | null {
  const s = norm(label)
  if (s.includes('doutorado')) return 'Doutorado'
  if (s.includes('mestrado')) return 'Mestrado'
  if (/\bmba\b/.test(s)) return 'MBA'
  if (s.includes('extensao')) return 'Extensão de Pós'
  if (s.includes('pos') || s.includes('pós')) return 'Pós-graduação'
  if (s.includes('graduacao') || s.includes('superior')) return 'Superior'
  if (s.includes('tecnico')) return 'Médio Técnico'
  if (s.includes('medio')) return 'Ensino Médio'
  if (s.includes('fundamental')) return 'Ensino Fundamental'
  return null
}

/** detail legado ("Graduação: X (2 anos p/ concluir) · Pós: Y") → itens estruturados. */
export function parseDetailToItems(detail: string | null | undefined): EduItem[] {
  if (!detail) return []
  const out: EduItem[] = []
  for (const seg of detail.split(' · ')) {
    const i = seg.indexOf(': ')
    const label = i >= 0 ? seg.slice(0, i) : seg
    let curso = (i >= 0 ? seg.slice(i + 2) : '').trim()
    const tipo = tipoFromLabel(label)
    if (!tipo) continue
    const cursando = /(p\/\s*concluir|cursando)/i.test(curso)
    curso = curso.replace(/\s*\([^)]*(p\/\s*concluir|cursando)\)\s*/i, '').trim()
    if (!out.some((o) => o.tipo === tipo)) out.push({ tipo, curso, cursando })
  }
  return out
}

// nível canônico salvo → tipo base (p/ re-marcar o checkbox no editor).
function tipoFromLevel(level: string | null | undefined): { tipo: string; cursando: boolean } | null {
  if (!level) return null
  const s = norm(level)
  if (s.includes('doutorado')) return { tipo: 'Doutorado', cursando: false }
  if (s.includes('mestrado')) return { tipo: 'Mestrado', cursando: false }
  if (/\bmba\b/.test(s)) return { tipo: 'MBA', cursando: false }
  if (s.includes('pos') || s.includes('pós')) return { tipo: 'Pós-graduação', cursando: false }
  if (s.includes('superior')) return { tipo: 'Superior', cursando: s.includes('cursando') || s.includes('incompleto') }
  if (s.includes('tecnico') || s.includes('técnico')) return { tipo: 'Médio Técnico', cursando: false }
  if (s.includes('medio') || s.includes('médio')) return { tipo: 'Ensino Médio', cursando: false }
  if (s.includes('fundamental')) return { tipo: 'Ensino Fundamental', cursando: false }
  return null
}

/** Carrega os itens existentes p/ o editor: raw.items (novo) OU level+detail (legado). */
export function loadItems(src: { level?: string | null; detail?: string | null; raw?: unknown }): EduItem[] {
  const raw = src.raw as { items?: EduItem[] } | null | undefined
  if (raw && Array.isArray(raw.items) && raw.items.length) {
    return raw.items.map((it) => ({ tipo: it.tipo, curso: it.curso ?? '', cursando: !!it.cursando }))
  }
  const items = parseDetailToItems(src.detail)
  const base = tipoFromLevel(src.level)
  if (base && !items.some((o) => o.tipo === base.tipo)) {
    items.push({ tipo: base.tipo, curso: '', cursando: base.cursando })
  }
  return items
}
