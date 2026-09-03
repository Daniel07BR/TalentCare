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
export type Factor = {
  key: string; label: string; peso: number; nota: number | null
  // Contra QUEM a nota foi comparada. 'global' = o setor é pequeno demais p/
  // servir de referência (ver MIN_PARES); a ficha avisa, senão o número parece
  // dizer algo sobre o setor que ele não diz.
  base?: 'dept' | 'global'
}

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
  /** A pessoa É medida pelo ponto do Nexo? ⚠️ NÃO é "tem ocorrência": quem é
   *  medido e nunca se atrasou merece os 100 dela; quem não é medido não tem
   *  nota nenhuma. Ver `lib/ponto-cobertura.ts`. */
  temPonto: boolean
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
  gerencia: GerenciaStat
  chat: ChatStat
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

/** Métricas REAIS da GERÊNCIA (mensageria). Duas faces na mesma pessoa:
 *  EXECUÇÃO (servicos/km/viagens/jornadaMin) — quem faz saída externa, que não
 *  são só os dois mensageiros; e ESCRITÓRIO (protAbertos/protAprovados/
 *  servCriados/reagendados/cancelados) — qualquer funcionário que demanda.
 *  ⚠️ Janelas de histórico MUITO diferentes: serviço vem desde 2022, km e
 *  jornada só desde 17/07/2026, e autoria de protocolo desde março/2026. */
export type GerenciaStat = {
  servicos: number; km: number; saidas: number; viagens: number; jornadaMin: number
  protAbertos: number; protAprovados: number; servCriados: number
  reagendados: number; cancelados: number; datasAlteradas: number
}

/** Métricas REAIS do CHAT INTERNO (8ª fonte). Duas famílias na mesma pessoa:
 *  CONVERSA (msgCanais/msgDiretas/msgChamados) e CHAMADO (abertos/assumidos/
 *  concluídos + o tempo dos concluídos).
 *  ⚠️⚠️ `segundosResolucao` é SEGUNDO DE EXPEDIENTE (08h–18h, seg a sex),
 *  contado no .69 — nunca recalcular a partir de datas aqui.
 *  ⚠️⚠️ Mensagem NÃO entra em `activityOf()` nem no score: ela é vitrine. O
 *  score decide aumento e promoção, e contar mensagem premiaria quem mais
 *  escreve, não quem mais entrega. Só chamado (aberto + concluído) conta. */
export type ChatStat = {
  msgCanais: number; msgDiretas: number; msgChamados: number
  chamadosAbertos: number; chamadosAssumidos: number; chamadosConcluidos: number
  segundosResolucao: number
}

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
  /** Turnover REAL: saídas em 12 meses ÷ quem passou pelo setor. Ver assembleData. */
  turnover: number
  /** Saídas nos últimos 12 meses — o numerador, para a tela poder mostrá-lo. */
  saidas12m: number
  color: string
  lider: string
  classroom: ClassroomStat
  radioHoras: number    // soma de horas de rádio do depto (REAL)
  radioSessoes: number  // soma de sessões de rádio do depto (REAL)
  consultoria: ConsultoriaStat // soma da atividade do Consultoria Plus do depto (REAL)
  helpdesk: HelpdeskStat // soma da atividade do HelpDesk do depto (REAL)
  cide: CideStat // soma da atividade do CIDE do depto (REAL)
  gerencia: GerenciaStat // soma da atividade da Gerência do depto (REAL)
  chat: ChatStat // soma da atividade do Chat Interno do depto (REAL)
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
  gerencia: GerenciaStat
  chat: ChatStat
  assid: AssidStat
  /** Ver `Employee.temPonto`. */
  temPonto: boolean
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
// Sistemas que aparecem na barra "Atividade por sistema" da ficha e na tela de
// Configurações. ⚠️ Entrar aqui exige três coisas juntas: cor em `sysColor`,
// descrição em `SYS_INFO` (lib/mock/config.ts) e um valor REAL em `realBySystem`
// na ficha — faltando qualquer uma, o sistema aparece com barra inventada.
// ⚠️ A GERÊNCIA faltava: `realBySystem` na ficha a calculava e jogava fora,
// porque o map é sobre `SYSTEMS`. O mensageiro que entregou 266 serviços no
// período aparecia com seis barras rasas no gráfico que responde "onde essa
// pessoa trabalha". É o 6º consumidor da checklist do `docs/FONTES.md`.
export const SYSTEMS = ['HelpDesk', 'ClassRoom', 'Consultoria Plus', 'Painel de Atendimento', 'CIDE', 'Chat Interno', 'Gerência']

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

/* ⚠️ `admissao(meses)` REMOVIDA (03/09/2026). Ela reconstruía o mês de admissão
   a PARTIR do tempo de casa — a função inversa da que já estava errada — e
   ninguém a chamava: a ficha usa `emp.admissao`, que vem da `entry_date` real.
   Era a última consumidora da `BASE_DATE`. */

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
  if (!m) return '—' // sem data de admissão (ver monthsSince)
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
    'Chat Interno': 'var(--chart-3)', 'Gerência': 'var(--chart-2)',
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

/**
 * TEMPO DE CASA, em meses.
 *
 * ⚠️ Sem data de admissão devolve 0 = "não informado". Antes SORTEAVA um valor
 * entre 6 meses e 6 anos a partir do id da pessoa, e a ficha exibia isso como
 * tempo de casa e mês de admissão — número inventado numa tela que embasa
 * aumento e promoção. Quem não tem data agora mostra "—".
 *
 * ⚠️⚠️ E contava até uma `BASE_DATE` FIXA em 01/06/2026 — herança da época em
 * que tudo aqui tinha de ser determinístico. O tempo de casa da casa inteira
 * ficou congelado em junho e **atrasava mais um mês a cada mês**: em 03/09/2026
 * a ficha do Yuri Santana (admitido em 17/07/2025) dizia **11 meses** ao lado da
 * própria data de admissão, que é real — 13 meses. Data certa, conta errada, e a
 * tela mostrando as duas lado a lado.
 *
 * ⚠️ Conta até a SAÍDA de quem saiu. Senão o desligado continua fazendo
 * aniversário de casa: a lista de `/turnover` diz quanto tempo cada um FICOU, e
 * medir isso até hoje daria a um demitido em 2025 mais tempo do que ele teve.
 *
 * ⚠️ E conta o DIA, não só o mês: quem entrou em 17/07 não completa o mês no dia
 * 3. É o que uma pessoa quer dizer com "tempo de casa".
 */
function monthsSince(entry: Date | null, left?: Date | null): number {
  if (!entry || isNaN(entry.getTime())) return 0
  const fim = left && !isNaN(left.getTime()) ? left : new Date()
  let m = (fim.getFullYear() - entry.getFullYear()) * 12 + (fim.getMonth() - entry.getMonth())
  if (fim.getDate() < entry.getDate()) m -= 1 // o mês ainda não fechou
  return Math.max(1, Math.min(420, m))
}

/** Simula as MÉTRICAS de um funcionário a partir da identidade real. */
function simulateEmployee(id8: Identity, idx: number): Employee {
  const seed = seedOf(id8.id)
  const score = 48 + Math.round(rnd(seed * 1.7) * 48) // 48..96
  // Escolaridade é dado REAL (planilha). Sem vínculo → "Não informado" (nada simulado).
  const escolaridade = id8.escolaridade ?? 'Não informado'
  const tempoMeses = monthsSince(id8.entryDate, id8.leftDate)
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
    advertencias: id8.assid.advertencias, suspensoes: 0, temPonto: id8.temPonto,
    assidDays: id8.assidDays, discEventos: id8.discEventos,
    radioHoras: Math.round(id8.radio.totalSeconds / 3600),
    radioSessoes: id8.radio.sessions,
    radioUltima: id8.radio.lastListenedAt,
    admissao: id8.entryDate && !isNaN(id8.entryDate.getTime())
      ? id8.entryDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' })
      : 'Não informado',
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
    gerencia: id8.gerencia,
    chat: id8.chat,
  }
}

const zeroClassroom = (): ClassroomStat => ({ videosCompleted: 0, coursesCompleted: 0, coursesCreated: 0 })
const zeroConsultoria = (): ConsultoriaStat => ({ studies: 0, tickets: 0, messages: 0, comments: 0 })
const zeroHelpdesk = (): HelpdeskStat => ({ opened: 0, resolved: 0, formalized: 0, resolvedSeconds: 0 })
const zeroCide = (): CideStat => ({ atividades: 0 })
export const zeroGerencia = (): GerenciaStat => ({
  servicos: 0, km: 0, saidas: 0, viagens: 0, jornadaMin: 0,
  protAbertos: 0, protAprovados: 0, servCriados: 0, reagendados: 0, cancelados: 0, datasAlteradas: 0,
})
export const zeroChat = (): ChatStat => ({
  msgCanais: 0, msgDiretas: 0, msgChamados: 0,
  chamadosAbertos: 0, chamadosAssumidos: 0, chamadosConcluidos: 0, segundosResolucao: 0,
})

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
  const c = e.classroom, h = e.helpdesk, k = e.cide, p = e.consultoria, w = e.whatsapp, g = e.gerencia
  const t = e.chat
  return c.videosCompleted + c.coursesCompleted + c.coursesCreated
    + h.opened + h.resolved + k.atividades
    + p.studies + p.tickets + p.messages + p.comments
    + w.finalizados
    // GERÊNCIA conta como produtividade: sem ela, quem entrega serviço na rua o
    // dia inteiro (Elton, 266 serviços em 30d) caía em "Sem dados suficientes".
    // km/viagens/jornada NÃO entram — são a MAGNITUDE dos mesmos serviços e, em
    // ordem de grandeza (951 km × 266 serviços), abafariam todo o resto.
    + g.servicos + g.protAbertos + g.protAprovados + g.servCriados + g.datasAlteradas
    // CHAT INTERNO: só CHAMADO conta — pedido feito e pedido entregue, exatamente
    // como o HelpDesk (opened + resolved).
    //
    // ⚠️⚠️ MENSAGEM FICA DE FORA, de propósito (decisão do dono, 02/09/2026).
    // Ela é a métrica mais fácil de subir do sistema inteiro e a que menos diz
    // sobre entrega: em ordem de grandeza (milhares de mensagens × dezenas de
    // chamados) abafaria todas as outras sete fontes somadas, e o ranking
    // passaria a medir quem mais escreve. Mensagem aparece na ficha e na tela
    // do Chat; no score, não. Mesmo raciocínio de km/jornada na Gerência.
    + t.chamadosAbertos + t.chamadosConcluidos
}

// Sinais por pessoa NO PERÍODO (do /api/score-metrics) p/ o score period-aware.
//
// ⚠️⚠️ `janelaComPonto` é do PERÍODO, não da pessoa, e por isso não cabe no Map.
// O ponto é import à mão: em 03/09/2026 o dump terminava em 25/06, e em "7 dias",
// "30 dias" e "Trimestre atual" não havia uma linha. Sem esta bandeira, as 87
// pessoas sairiam com `atrasos: 0` → assiduidade **100** — e 20 dos 65 pontos do
// score de todo mundo seriam a ausência de dado lida como nota cheia. Medido: o
// "Score médio" do painel marcava **68**; sem essa inflação, **52**.
export type ScoreSignals = {
  porPessoa: Map<string, { activity: number; atrasos: number; advertencias: number }>
  /** A janela pedida cai dentro do que o ponto realmente cobriu? */
  janelaComPonto: boolean
  /** O que dizer na tela quando não cai (ex.: "ponto importado até 25/06/2026"). */
  motivoSemPonto: string | null
}

// Pesos-base dos fatores COM fonte. Prazos(25)/Colaboração(10) ficam fora; a
// normalização (÷ soma dos pesos aplicáveis) redistribui o peso deles.
const SCORE_W = { prod: 30, assid: 20, form: 15 }

export function assidNotaFrom(atrasos: number, advert: number): number {
  return Math.max(0, Math.min(100, 100 - atrasos * 2 - advert * 5))
}

/**
 * A PENALIDADE de assiduidade, SEM o piso em 0.
 *
 * ⚠️ A nota satura: medido em 03/09/2026, **20 pessoas** empatavam em 0 no fundo
 * do `/ranking`. A Yasmin (16 atrasos, 16 advertências) e a Bruna (42 e 29) liam
 * o mesmo número — e o fundo de uma lista de pessoas é justamente onde o número
 * precisa distinguir, porque é ele que vira conversa. O piso continua valendo
 * para o SCORE (é um peso, e nota negativa não é nota); a ORDEM do ranking usa
 * isto, e a linha mostra os atrasos e as advertências que produziram o número.
 */
export function assidPenalidade(atrasos: number, advert: number): number {
  return 100 - atrasos * 2 - advert * 5
}

/** Calcula score + factors REAIS por funcionário. signals = override por período.
 *  hasScore=false quando a pessoa não tem NENHUM sinal real (sem produtividade
 *  aplicável, sem formação e sem registro de ponto) — assiduidade=100 por ausência
 *  de dado NÃO é avaliação. Esses ficam fora de ranking/médias (ficha: "sem dados"). */
export function computeScores(employees: Employee[], signals?: ScoreSignals | null): Map<string, { score: number; factors: Factor[]; hasScore: boolean }> {
  const act = new Map<string, number>(), atr = new Map<string, number>(), adv = new Map<string, number>()
  for (const e of employees) {
    const s = signals?.porPessoa.get(e.id)
    act.set(e.id, s ? s.activity : activityOf(e))
    atr.set(e.id, s ? s.atrasos : e.atrasos)
    adv.set(e.id, s ? s.advertencias : e.advertencias)
  }
  /* ⚠️⚠️ A janela mediu ponto? Sem `signals` estamos no ACUMULADO (toda a
     história importada), e aí a janela é a cobertura inteira — sempre válida. */
  const janelaComPonto = signals ? signals.janelaComPonto : true
  /* Produtividade = percentil dentro do DEPARTAMENTO. Se o setor inteiro não tem
     atividade de sistema (ex.: Limpeza/Cozinha) → produtividade "não se aplica" (null).

     ⚠️⚠️ O COORTE É SÓ DE QUEM ESTÁ ATIVO. Ele vinha sendo montado sobre
     `employees` inteiro — com os **33 desligados** dentro (o Contábil tem 18
     ativos e 13 desligados; o Fiscal, 21 e 10). Quem saiu não produz nada na
     janela, entra com 0 e vira o piso da distribuição: **70 das 87 pessoas
     ativas** tinham o percentil inflado por gente que não trabalha mais aqui. A
     Andrea Bratfisch (Recepção) subia de 50 para **100** de produtividade, +34
     no score; a Ághata Silva, com 3 atividades no mês, ganhava +33 de percentil.
     O efeito é comprimir a lista para cima e esconder quem produz pouco.

     ⚠️ O desligado continua RECEBENDO nota (a ficha dele existe) — ele só deixa
     de servir de régua para os vivos. */
  const cohort = employees.filter((e) => e.status !== 'Desligado')
  const byDept = new Map<string, Employee[]>()
  for (const e of employees) { const l = byDept.get(e.dept) ?? []; l.push(e); byDept.set(e.dept, l) }
  const cohortByDept = new Map<string, Employee[]>()
  for (const e of cohort) { const l = cohortByDept.get(e.dept) ?? []; l.push(e); cohortByDept.set(e.dept, l) }
  // ⚠️ TRAVA DE SETOR PEQUENO. Percentil precisa de PARES; num setor de 1 ou 2
  // pessoas ele não mede nada — o primeiro leva 100 e o segundo 0, qualquer que
  // seja o volume real. Foi o que deu 100 ao Marco Aurelio sozinho em
  // "Programação" com 1 atividade, e 0 ao Gilberto (25 atividades) só por estar
  // ao lado do Elton. Abaixo de MIN_PARES o percentil passa a ser GLOBAL.
  //
  // O cohort global também é o piso absoluto: quem tem atividade quase nula fica
  // no fundo da distribuição da empresa (Marco Aurelio 100 → 17), sem precisar de
  // um limiar arbitrário separado.
  const MIN_PARES = 3
  const percentil = (v: number, vals: number[]): number => {
    if (vals.length <= 1) return 100
    const less = vals.filter((x) => x < v).length
    const eq = vals.filter((x) => x === v).length
    return Math.max(0, Math.min(100, Math.round(((less + (eq - 1) / 2) / (vals.length - 1)) * 100)))
  }
  const valsGlobal = cohort.map((e) => act.get(e.id) ?? 0)
  const prodNota = new Map<string, number | null>()
  const prodBase = new Map<string, 'dept' | 'global'>()
  for (const [deptId, list] of byDept) {
    // A RÉGUA é o coorte de ativos do setor; a LISTA a ser medida inclui os
    // desligados daquele setor (a ficha deles mostra o percentil que tiveram).
    const regua = cohortByDept.get(deptId) ?? []
    const total = regua.reduce((a, e) => a + (act.get(e.id) ?? 0), 0)
    // Setor inteiro sem atividade de sistema (Cozinha/Limpeza/Pousada/Marketing)
    // segue "não se aplica". ⚠️ NÃO cair no global aqui: daria nota ~7 a quem não
    // tem fonte nenhuma e os traria de volta ao ranking — o artefato que a regra
    // de hasScore existe justamente para evitar.
    if (total <= 0) { for (const e of list) prodNota.set(e.id, null); continue }
    const usaGlobal = regua.length < MIN_PARES
    const vals = usaGlobal ? valsGlobal : regua.map((e) => act.get(e.id) ?? 0)
    for (const e of list) {
      prodNota.set(e.id, percentil(act.get(e.id) ?? 0, vals))
      prodBase.set(e.id, usaGlobal ? 'global' : 'dept')
    }
  }
  const out = new Map<string, { score: number; factors: Factor[]; hasScore: boolean }>()
  for (const e of employees) {
    const pN = prodNota.get(e.id) ?? null
    const nAtr = atr.get(e.id) ?? 0, nAdv = adv.get(e.id) ?? 0
    /* ⚠️⚠️ ASSIDUIDADE SÓ EXISTE QUANDO ALGUÉM MEDIU. `100 − atrasos·2 −
       advert·5` com 0 e 0 dá **100**, e 0 e 0 é exatamente o que se lê de quem o
       ponto não cobre e de uma janela que o dump nunca alcançou. É a regra do
       `null` pela face invertida: a ausência não acusa a pessoa, ela a elogia —
       e num painel que decide aumento isso é pior que o zero.

       Medido em 03/09/2026: os 22 primeiros do `/ranking` por Assiduidade eram
       as 22 pessoas sem ponto nenhum, e o "Score médio" do painel marcava 68
       contra 52 reais, porque a assiduidade valia 100 para as 87.

       `null` aqui não é castigo: o peso se redistribui sozinho entre os fatores
       que existem (a divisão por `sumW`), o mesmo mecanismo da Produtividade num
       setor sem sistema. Ver `lib/ponto-cobertura.ts`. */
    const aN = e.temPonto && janelaComPonto ? assidNotaFrom(nAtr, nAdv) : null
    const fN = formacaoNota(e.escolaridade)
    // Score COMPARÁVEL só com fator de PERFORMANCE real: produtividade (atividade
    // em sistema) OU formação. Assiduidade sozinha (higiene/presença) NÃO basta —
    // senão uma faxineira com presença exemplar e nada mais lideraria o ranking.
    // Quem cai aqui (staff de Limpeza/Cozinha/Entregas sem formação) = "avaliação
    // parcial": fora de ranking/médias; a ficha mostra a assiduidade, sem score.
    const hasScore = pN != null || fN != null
    const parts: { w: number; nota: number }[] = []
    if (pN != null) parts.push({ w: SCORE_W.prod, nota: pN })
    if (aN != null) parts.push({ w: SCORE_W.assid, nota: aN })
    if (fN != null) parts.push({ w: SCORE_W.form, nota: fN })
    const sumW = parts.reduce((a, p) => a + p.w, 0) || 1
    const score = Math.round(parts.reduce((a, p) => a + p.w * p.nota, 0) / sumW)
    const factors: Factor[] = [
      { key: 'prod', label: 'Produtividade', peso: 30, nota: pN, base: pN == null ? undefined : prodBase.get(e.id) },
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
      /* ⚠️⚠️ TURNOVER REAL. Ele era `3.5 + rnd(seed × 5.3) × 13` — um número
         sorteado pelo id do setor, impresso em VERMELHO no card de
         `/departamentos`. Medido em 03/09/2026, o que a tela mostrava contra o
         que era verdade: Fiscal **4% × 30,0%** (9 saídas de 30 que passaram),
         Contábil 14,8% × 40,0%, Recepção 13,1% × 40,0%, TI 4,8% × 0%.

         ⚠️ O conserto de 03/09 chegou ao relatório do setor (`/departamentos/[id]`,
         via `/api/dept-metrics`) e NÃO ao card da lista — e o `docs/FONTES.md`
         deu a dívida por quitada. O 4% do Fiscal é literalmente o mesmo número
         que o `docs/AGENTE-CRITICO.md` cita como exemplo de achado do crítico:
         ele nunca tinha saído da tela, só da página de detalhe.

         A conta é a MESMA do relatório do setor (`Hero.tsx`): saídas em 12 meses
         sobre quem passou pelo setor (ativos hoje + quem saiu). */
      const doze = new Date(); doze.setFullYear(doze.getFullYear() - 1)
      const saidas12m = all.filter((e) => e.leftISO && new Date(e.leftISO) >= doze).length
      const passaram = hc + saidas12m
      const turnover = passaram ? +((saidas12m / passaram) * 100).toFixed(1) : 0
      /* ⚠️ A SPARKLINE do card saiu: era `rnd(dseed × 17 + m)` — um passeio
         aleatório de 12 pontos com o score real cravado só no último, embaixo do
         número verdadeiro. Não há série mensal de score para pôr no lugar (o
         score é um percentil recalculado por janela), e gráfico inventado
         embaixo de número certo é o pior dos dois mundos. */
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
      // GERÊNCIA (execução + escritório) SOMA todos, inclusive desligados.
      const gerencia = all.reduce((a, e) => {
        const g = e.gerencia
        return {
          servicos: a.servicos + g.servicos, km: a.km + g.km,
          saidas: a.saidas + g.saidas, viagens: a.viagens + g.viagens,
          jornadaMin: a.jornadaMin + g.jornadaMin, protAbertos: a.protAbertos + g.protAbertos,
          protAprovados: a.protAprovados + g.protAprovados, servCriados: a.servCriados + g.servCriados,
          reagendados: a.reagendados + g.reagendados, cancelados: a.cancelados + g.cancelados,
          datasAlteradas: a.datasAlteradas + g.datasAlteradas,
        }
      }, zeroGerencia())
      // CHAT INTERNO (conversa + chamados) SOMA todos, inclusive desligados.
      //
      // ⚠️ Esta é a soma das PESSOAS do setor, e não o painel por setor do chat:
      // aqui um chamado é creditado a quem o abriu ou concluiu, esteja essa
      // pessoa em que setor estiver hoje. O painel por setor (`chat_dept_daily`)
      // conta pela FUNÇÃO gravada no chamado, que não muda quando alguém troca
      // de área — os dois números respondem perguntas diferentes e podem
      // divergir de propósito.
      const chat = all.reduce((a, e) => {
        const t = e.chat
        return {
          msgCanais: a.msgCanais + t.msgCanais, msgDiretas: a.msgDiretas + t.msgDiretas,
          msgChamados: a.msgChamados + t.msgChamados,
          chamadosAbertos: a.chamadosAbertos + t.chamadosAbertos,
          chamadosAssumidos: a.chamadosAssumidos + t.chamadosAssumidos,
          chamadosConcluidos: a.chamadosConcluidos + t.chamadosConcluidos,
          segundosResolucao: a.segundosResolucao + t.segundosResolucao,
        }
      }, zeroChat())
      return {
        id, nome: deptMeta[id], headcount: hc, score, turnover, saidas12m, color: PALETTE[dseed % 6],
        radioHoras, radioSessoes, consultoria, helpdesk, cide, gerencia, chat,
        lider: (base.find((e) => /Coorden|Gerente|Gestor|Tech|Tesour|Diretor|Coordenadora|Contador/.test(e.cargo)) || base.slice().sort((a, b) => b.score - a.score)[0]).nome,
        classroom,
      }
    })
    .filter((d): d is Department => d !== null)

  return { employees, departments, deptMeta }
}
