/* ============================================================
   TalentCare — modelagem de dados.
   IDENTIDADE (nome, cargo, setor, foto, admissão, status) é REAL,
   vinda do Nexus (ver lib/data/source.ts).
   MÉTRICAS de performance (score, fatores, tarefas, faltas, escolaridade…)
   são SIMULADAS de forma determinística por seed do id, até a frente B
   (ingestão de métricas reais). Mesmas assinaturas de VM serão mantidas.
   ============================================================ */

// nota = null → fator SEM FONTE real (ex.: Prazos/Colaboração hoje) → não entra no
// cálculo do score (peso redistribuído) e aparece como "sem fonte" na ficha.
export type Factor = { key: string; label: string; peso: number; nota: number | null }

export type Employee = {
  id: string
  nome: string
  username: string | null
  dept: string          // = departmentId real
  cargo: string
  status: string        // Ativo | Férias | Afastado | Desligado
  escolaridade: string
  tempoMeses: number
  score: number
  hasScore: boolean     // false = sem sinal real p/ avaliar (fora de ranking/médias)
  factors: Factor[]
  hist: number[]
  initials: string
  color: string
  delta: number
  hasAvatar: boolean
  tasksDone: number
  tasksLate: number
  tasksPend: number
  faltas: number          // SEM FONTE (dump não traz falta) → 0; ficha mostra "—"
  atrasos: number         // REAL (ponto): nº de atrasos não abonados (acumulado)
  atrasosAbon: number     // REAL: atrasos abonados (justificados, não punem)
  minutosAtraso: number   // REAL: soma de minutos de atraso (não abonados)
  advertencias: number    // REAL (ponto): nº de advertências (acumulado)
  suspensoes: number      // SEM FONTE (dump não traz suspensão) → 0; ficha mostra "—"
  assidDays: AssidDay[]   // dias com ocorrência (últimas ~18 semanas) p/ heatmap
  discEventos: DiscEvento[] // eventos de disciplina reais (advertências), desc
  radioHoras: number          // horas de rádio ouvidas (REAL, acumulado)
  radioSessoes: number        // nº de sessões de rádio (REAL)
  radioUltima: string | null  // ISO da última escuta (REAL)
  admissao: string
  birthDate: string | null
  gender: string | null
  hireISO: string | null
  leftISO: string | null
  nexusUserId: string | null
  eduDetail: string | null
  eduCursos: EduCurso[]
  treinoCursos: TrainingItem[]
  treinoCerts: TrainingItem[]
  classroom: ClassroomStat
  whatsapp: WhatsappStat
  consultoria: ConsultoriaStat
  helpdesk: HelpdeskStat
  cide: CideStat
}

/** Métricas REAIS do ClassRoom (frente B). */
export type ClassroomStat = { videosCompleted: number; coursesCompleted: number; coursesCreated: number }

/** Métricas REAIS da Rádio Itamarathy (frente B). */
export type RadioStat = { totalSeconds: number; sessions: number; lastListenedAt: string | null }

/** Métricas REAIS do WhatsApp/OneCode por atendente (frente B). */
export type WhatsappStat = { abertos: number; finalizados: number; handleSum: number }

/** Métricas REAIS do Consultoria Plus (frente B): atividade por pessoa. */
export type ConsultoriaStat = { studies: number; tickets: number; messages: number; comments: number }

/** Métricas REAIS do HelpDesk (frente B): chamados por pessoa.
 *  resolved = resolvidos no fluxo normal; formalized = serviços formalizados
 *  (também contam como resolvidos, mas fora do tempo médio). */
export type HelpdeskStat = { opened: number; resolved: number; formalized: number; resolvedSeconds: number }

/** Métricas REAIS do CIDE (frente B): alterações/atividades registradas por pessoa. */
export type CideStat = { atividades: number }

/** Assiduidade REAL (ponto, dump do Nexo). Só atrasos+advertências têm fonte;
 *  faltas/suspensões NÃO vêm na origem → tratadas como "sem fonte" na ficha. */
export type AssidStat = { atrasos: number; atrasosAbon: number; minutos: number; advertencias: number }
/** Um dia com ocorrência de atraso (p/ o heatmap de ocorrências). */
export type AssidDay = { day: string; atrasos: number; minutos: number }
/** Evento de disciplina real (advertência; suspensão não vem na fonte). */
export type DiscEvento = { data: string; tipo: string; motivo: string | null; dias: number | null }

export type Department = {
  id: string
  nome: string
  headcount: number
  score: number
  turnover: number
  spark: number[]
  color: string
  lider: string
  classroom: ClassroomStat
  radioHoras: number    // soma de horas de rádio do depto (REAL)
  radioSessoes: number  // soma de sessões de rádio do depto (REAL)
  consultoria: ConsultoriaStat // soma da atividade do Consultoria Plus do depto (REAL)
  helpdesk: HelpdeskStat // soma da atividade do HelpDesk do depto (REAL)
  cide: CideStat // soma da atividade do CIDE do depto (REAL)
}

export type TalentData = {
  employees: Employee[]
  departments: Department[]
  deptMeta: Record<string, string>
}

/** Identidade real de um funcionário (vinda do Nexus via Prisma). */
export type Identity = {
  id: string
  nexusUserId: string | null
  nome: string
  username: string | null
  cargo: string | null
  deptId: string | null
  deptName: string | null
  active: boolean
  hasAvatar: boolean
  entryDate: Date | null
  leftDate: Date | null
  birthDate: string | null
  gender: string | null
  classroom: ClassroomStat
  radio: RadioStat
  whatsapp: WhatsappStat
  consultoria: ConsultoriaStat
  helpdesk: HelpdeskStat
  cide: CideStat
  assid: AssidStat
  assidDays: AssidDay[]
  discEventos: DiscEvento[]
  escolaridade: string | null
  // Cursos reais (cadastro RH): "Graduação: X · Médio técnico: Y · Pós: Z" ou null.
  eduDetail: string | null
  // Cursos/treinamentos e certificações (listas livres editadas na ficha).
  treinoCursos: TrainingItem[]
  treinoCerts: TrainingItem[]
}

/** Curso de formação acadêmica (dado real do RH). */
export type EduCurso = { tipo: string; nome: string; status: 'Concluído' | 'Cursando' }

/** Item de curso/treinamento ou certificação (lista livre editável). */
export type TrainingItem = { nome: string; ano: string }

/** Quebra o detail "Tipo: Nome (N anos p/ concluir) · ..." em cursos estruturados. */
export function parseEduDetail(detail: string | null | undefined): EduCurso[] {
  if (!detail) return []
  return detail.split(' · ').map((seg) => {
    const i = seg.indexOf(': ')
    const tipo = i >= 0 ? seg.slice(0, i).trim() : 'Formação'
    let rest = (i >= 0 ? seg.slice(i + 2) : seg).trim()
    const cursando = /(p\/\s*concluir|cursando)/i.test(rest)
    rest = rest.replace(/\s*\([^)]*(p\/\s*concluir|cursando)\)\s*/i, '').trim()
    return { tipo, nome: rest, status: cursando ? 'Cursando' : 'Concluído' } as EduCurso
  }).filter((c) => c.nome)
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
  // Escolaridade é dado REAL (planilha). Sem vínculo → "Não informado" (nada simulado).
  const escolaridade = id8.escolaridade ?? 'Não informado'
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
    id: id8.id, nome: id8.nome, username: id8.username, dept: id8.deptId ?? 'sem', cargo: id8.cargo || 'Colaborador',
    status, escolaridade, tempoMeses, score, hasScore: true, factors, hist,
    initials: ini(id8.nome), color: PALETTE[seed % 6], delta: score - hist[10], hasAvatar: id8.hasAvatar,
    tasksDone, tasksLate: Math.round(tasksDone * (0.03 + rnd(seed * 5) * 0.13)), tasksPend: Math.round(rnd(seed * 4) * 16),
    // ASSIDUIDADE REAL (ponto). faltas/suspensoes = 0 (sem fonte; a ficha mostra "—").
    faltas: 0, atrasos: id8.assid.atrasos,
    atrasosAbon: id8.assid.atrasosAbon, minutosAtraso: id8.assid.minutos,
    advertencias: id8.assid.advertencias, suspensoes: 0,
    assidDays: id8.assidDays, discEventos: id8.discEventos,
    radioHoras: Math.round(id8.radio.totalSeconds / 3600),
    radioSessoes: id8.radio.sessions,
    radioUltima: id8.radio.lastListenedAt,
    admissao: id8.entryDate && !isNaN(id8.entryDate.getTime())
      ? id8.entryDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' })
      : admissao(tempoMeses),
    birthDate: id8.birthDate,
    gender: id8.gender,
    hireISO: id8.entryDate ? id8.entryDate.toISOString() : null,
    leftISO: id8.leftDate ? id8.leftDate.toISOString() : null,
    nexusUserId: id8.nexusUserId,
    eduDetail: id8.eduDetail,
    eduCursos: parseEduDetail(id8.eduDetail),
    treinoCursos: id8.treinoCursos,
    treinoCerts: id8.treinoCerts,
    classroom: id8.classroom,
    whatsapp: id8.whatsapp,
    consultoria: id8.consultoria,
    helpdesk: id8.helpdesk,
    cide: id8.cide,
  }
}

const zeroClassroom = (): ClassroomStat => ({ videosCompleted: 0, coursesCompleted: 0, coursesCreated: 0 })
const zeroConsultoria = (): ConsultoriaStat => ({ studies: 0, tickets: 0, messages: 0, comments: 0 })
const zeroHelpdesk = (): HelpdeskStat => ({ opened: 0, resolved: 0, formalized: 0, resolvedSeconds: 0 })
const zeroCide = (): CideStat => ({ atividades: 0 })

/* ============================================================
   SCORE REAL (substitui o seed). Fatores com fonte: Produtividade (atividade nos
   sistemas, RELATIVA por departamento), Assiduidade (ponto) e Formação
   (escolaridade). Prazos e Colaboração ainda NÃO têm fonte → ficam de fora
   (peso redistribuído por normalização). Period-aware via signals (overrides).
   ============================================================ */

// Escolaridade → nota 0..100. "Não informado"/desconhecido → null (não se aplica).
const FORM_NOTA: Record<string, number> = {
  'Doutorado': 100, 'Mestrado': 95, 'MBA': 90, 'Pós-graduação': 85,
  'Superior Completo': 75, 'Superior (cursando)': 62, 'Superior Incompleto': 55,
  'Médio Técnico': 50, 'Técnico': 48, 'Ensino Médio': 40, 'Ensino Fundamental': 25,
}
export function formacaoNota(esc: string | null | undefined): number | null {
  if (!esc) return null
  return FORM_NOTA[esc] ?? null
}

// Volume de ATIVIDADE de uma pessoa (acumulado) nos sistemas que medem trabalho.
// Rádio (escuta) NÃO entra. Usado quando não há override por período.
export function activityOf(e: Employee): number {
  const c = e.classroom, h = e.helpdesk, k = e.cide, p = e.consultoria, w = e.whatsapp
  return c.videosCompleted + c.coursesCompleted + c.coursesCreated
    + h.opened + h.resolved + k.atividades
    + p.studies + p.tickets + p.messages + p.comments
    + w.finalizados
}

// Sinais por pessoa NO PERÍODO (do /api/score-metrics) p/ o score period-aware.
export type ScoreSignals = Map<string, { activity: number; atrasos: number; advertencias: number }>

// Pesos-base dos fatores COM fonte. Prazos(25)/Colaboração(10) ficam fora; a
// normalização (÷ soma dos pesos aplicáveis) redistribui o peso deles.
const SCORE_W = { prod: 30, assid: 20, form: 15 }

export function assidNotaFrom(atrasos: number, advert: number): number {
  return Math.max(0, Math.min(100, 100 - atrasos * 2 - advert * 5))
}

/** Calcula score + factors REAIS por funcionário. signals = override por período.
 *  hasScore=false quando a pessoa não tem NENHUM sinal real (sem produtividade
 *  aplicável, sem formação e sem registro de ponto) — assiduidade=100 por ausência
 *  de dado NÃO é avaliação. Esses ficam fora de ranking/médias (ficha: "sem dados"). */
export function computeScores(employees: Employee[], signals?: ScoreSignals | null): Map<string, { score: number; factors: Factor[]; hasScore: boolean }> {
  const act = new Map<string, number>(), atr = new Map<string, number>(), adv = new Map<string, number>()
  for (const e of employees) {
    const s = signals?.get(e.id)
    act.set(e.id, s ? s.activity : activityOf(e))
    atr.set(e.id, s ? s.atrasos : e.atrasos)
    adv.set(e.id, s ? s.advertencias : e.advertencias)
  }
  // Produtividade = percentil dentro do DEPARTAMENTO. Se o setor inteiro não tem
  // atividade de sistema (ex.: Limpeza/Cozinha) → produtividade "não se aplica" (null).
  const byDept = new Map<string, Employee[]>()
  for (const e of employees) { const l = byDept.get(e.dept) ?? []; l.push(e); byDept.set(e.dept, l) }
  const prodNota = new Map<string, number | null>()
  for (const [, list] of byDept) {
    const total = list.reduce((a, e) => a + (act.get(e.id) ?? 0), 0)
    if (total <= 0) { for (const e of list) prodNota.set(e.id, null); continue }
    const vals = list.map((e) => act.get(e.id) ?? 0)
    for (const e of list) {
      const v = act.get(e.id) ?? 0
      const less = vals.filter((x) => x < v).length
      const eq = vals.filter((x) => x === v).length
      const pct = list.length <= 1 ? 100 : ((less + (eq - 1) / 2) / (list.length - 1)) * 100
      prodNota.set(e.id, Math.max(0, Math.min(100, Math.round(pct))))
    }
  }
  const out = new Map<string, { score: number; factors: Factor[]; hasScore: boolean }>()
  for (const e of employees) {
    const pN = prodNota.get(e.id) ?? null
    const nAtr = atr.get(e.id) ?? 0, nAdv = adv.get(e.id) ?? 0
    const aN = assidNotaFrom(nAtr, nAdv)
    const fN = formacaoNota(e.escolaridade)
    // Avaliável só se há ALGUM sinal real (produtividade, formação ou registro de ponto).
    const hasScore = pN != null || fN != null || nAtr > 0 || nAdv > 0
    const parts: { w: number; nota: number }[] = []
    if (pN != null) parts.push({ w: SCORE_W.prod, nota: pN })
    parts.push({ w: SCORE_W.assid, nota: aN })
    if (fN != null) parts.push({ w: SCORE_W.form, nota: fN })
    const sumW = parts.reduce((a, p) => a + p.w, 0) || 1
    const score = Math.round(parts.reduce((a, p) => a + p.w * p.nota, 0) / sumW)
    const factors: Factor[] = [
      { key: 'prod', label: 'Produtividade', peso: 30, nota: pN },
      { key: 'prazo', label: 'Prazos', peso: 25, nota: null },
      { key: 'assid', label: 'Assiduidade', peso: 20, nota: aN },
      { key: 'form', label: 'Formação', peso: 15, nota: fN },
      { key: 'colab', label: 'Colaboração', peso: 10, nota: null },
    ]
    out.set(e.id, { score, factors, hasScore })
  }
  return out
}

/** Monta o TalentData (employees + departments) a partir das identidades reais. */
export function assembleData(identities: Identity[]): TalentData {
  const employees0 = identities.map((id8, i) => simulateEmployee(id8, i))
  // Score REAL (acumulado) embutido na base — todas as telas já mostram real;
  // a versão period-aware é aplicada por withRealScores nas páginas.
  const sm = computeScores(employees0, null)
  const employees = employees0.map((e) => {
    const rs = sm.get(e.id)
    return rs ? { ...e, score: rs.score, hasScore: rs.hasScore, factors: rs.factors, hist: Array(12).fill(rs.score), delta: 0 } : e
  })

  const deptMeta: Record<string, string> = {}
  for (const id8 of identities) {
    if (id8.deptId) deptMeta[id8.deptId] = id8.deptName || id8.deptId
  }
  deptMeta['sem'] = deptMeta['sem'] || 'Sem setor'

  const departments: Department[] = Object.keys(deptMeta)
    .map((id) => {
      const all = employees.filter((e) => e.dept === id)
      if (!all.length) return null
      // Headcount e score do setor consideram só ATIVOS (desligados não contam).
      const ativos = all.filter((e) => e.status !== 'Desligado')
      const base = ativos.length ? ativos : all
      const hc = ativos.length
      // Média do setor só com quem é avaliável (hasScore) — não infla com staff sem dado.
      const scored = base.filter((e) => e.hasScore)
      const score = scored.length ? Math.round(scored.reduce((a, e) => a + e.score, 0) / scored.length) : 0
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
      // ClassRoom (vídeos/cursos) SOMA todos, inclusive desligados.
      const classroom = all.reduce(
        (a, e) => ({
          videosCompleted: a.videosCompleted + e.classroom.videosCompleted,
          coursesCompleted: a.coursesCompleted + e.classroom.coursesCompleted,
          coursesCreated: a.coursesCreated + e.classroom.coursesCreated,
        }),
        zeroClassroom(),
      )
      // Rádio (horas/sessões) SOMA todos, inclusive desligados.
      const radioHoras = all.reduce((a, e) => a + e.radioHoras, 0)
      const radioSessoes = all.reduce((a, e) => a + e.radioSessoes, 0)
      // Consultoria Plus (atividade) SOMA todos, inclusive desligados.
      const consultoria = all.reduce(
        (a, e) => ({
          studies: a.studies + e.consultoria.studies,
          tickets: a.tickets + e.consultoria.tickets,
          messages: a.messages + e.consultoria.messages,
          comments: a.comments + e.consultoria.comments,
        }),
        zeroConsultoria(),
      )
      // HelpDesk (chamados) SOMA todos, inclusive desligados.
      const helpdesk = all.reduce(
        (a, e) => ({
          opened: a.opened + e.helpdesk.opened,
          resolved: a.resolved + e.helpdesk.resolved,
          formalized: a.formalized + e.helpdesk.formalized,
          resolvedSeconds: a.resolvedSeconds + e.helpdesk.resolvedSeconds,
        }),
        zeroHelpdesk(),
      )
      // CIDE (atividades) SOMA todos, inclusive desligados.
      const cide = all.reduce((a, e) => ({ atividades: a.atividades + e.cide.atividades }), zeroCide())
      return {
        id, nome: deptMeta[id], headcount: hc, score, turnover, spark, color: PALETTE[dseed % 6],
        radioHoras, radioSessoes, consultoria, helpdesk, cide,
        lider: (base.find((e) => /Coorden|Gerente|Gestor|Tech|Tesour|Diretor|Coordenadora|Contador/.test(e.cargo)) || base.slice().sort((a, b) => b.score - a.score)[0]).nome,
        classroom,
      }
    })
    .filter((d): d is Department => d !== null)

  return { employees, departments, deptMeta }
}
