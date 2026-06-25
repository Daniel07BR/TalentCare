/* ============================================================
   TalentCare — view-model da Ficha 360° (puro em função de data + empId)
   ============================================================ */
import {
  FACTORS, SYSTEMS, rnd, seedOf, scoreColor, admissao, statusMeta, fmtTempo, sysColor,
  type Employee, type TalentData,
} from './data'

function geomGauge(score: number) {
  const cx = 100, cy = 100, r = 82
  const pol = (deg: number): [number, number] => [cx + r * Math.cos(deg * Math.PI / 180), cy - r * Math.sin(deg * Math.PI / 180)]
  const arc = (a0: number, a1: number) => {
    const p0 = pol(a0), p1 = pol(a1)
    const large = Math.abs(a1 - a0) > 180 ? 1 : 0
    return 'M ' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1)
  }
  const frac = Math.max(0, Math.min(1, score / 100))
  return { track: arc(180, 0), value: arc(180, 180 - 180 * frac), color: scoreColor(score) }
}

export function compFactorAvg(data: TalentData): Record<string, number> {
  const ats = data.employees.filter((e) => e.status !== 'Desligado' && e.hasScore)
  const avg: Record<string, number> = {}
  FACTORS.forEach((f) => {
    // Média só dos que TÊM nota (fator sem fonte = null não entra).
    const notas = ats.map((e) => e.factors.find((x) => x.key === f.key)?.nota).filter((n): n is number => n != null)
    avg[f.key] = notas.length ? Math.round(notas.reduce((a, n) => a + n, 0) / notas.length) : 0
  })
  return avg
}

export function deptName(data: TalentData, id: string): string {
  return data.deptMeta[id] ?? '—'
}
export function findEmployee(data: TalentData, id: string): Employee | undefined {
  return data.employees.find((e) => e.id === id)
}

function timelineFor(emp: Employee) {
  const seed = seedOf(emp.id)
  const tpl = [
    { sys: 'HelpDesk', act: 'Resolveu chamado #' + (4200 + (seed % 900)), det: 'SLA cumprido · 2h12 de atendimento' },
    { sys: 'ClassRoom', act: 'Concluiu "Compliance Tributário 2026"', det: 'Nota 9.4 · certificado emitido' },
    { sys: 'CIDE', act: 'Processou abertura de empresa', det: 'Alteração de quadro societário · 3 sócios' },
    { sys: 'Painel de Atendimento', act: 'Atendeu ' + (18 + seed % 14) + ' conversas no WhatsApp', det: 'Tempo médio de resposta 3m48' },
    { sys: 'Consultoria Plus', act: 'Publicou estudo "Reforma e Simples Nacional"', det: '12 visualizações da diretoria' },
    { sys: 'HelpDesk', act: 'Chamado #' + (4180 + (seed % 700)) + ' fora do SLA', det: 'Resolvido com 4h de atraso' },
    { sys: 'ClassRoom', act: 'Publicou Step by Step "Fechamento mensal"', det: 'Aprovado pela coordenação' },
    { sys: 'CIDE', act: 'Alteração contratual concluída', det: 'Empresa Itamarathy Holdings' },
    { sys: 'Painel de Atendimento', act: 'Pico de atendimento no período', det: (40 + seed % 30) + ' conversas em um dia' },
  ]
  const whens = ['há 2 horas', 'há 5 horas', 'ontem', 'há 2 dias', 'há 3 dias', 'há 4 dias', 'há 6 dias', 'há 1 semana', 'há 9 dias']
  const evs: { system: string; color: string; action: string; detail: string; when: string }[] = []
  tpl.forEach((t, i) => {
    if (rnd(seed + i * 3) > 0.18) evs.push({ system: t.sys, color: sysColor(t.sys), action: t.act, detail: t.det, when: whens[i] })
  })
  return evs.slice(0, 8)
}

// Mapa de OCORRÊNCIAS (atrasos) das últimas 18 semanas. Sem dado de presença na
// fonte, o heatmap não é mais "presença": cada célula é um dia, colorida pela
// intensidade do atraso (minutos). Dia sem ocorrência = vazio (limpo). Linhas =
// dia da semana (seg→dom), colunas = semanas (mais antiga → atual).
export type HeatCell = { level: number; bg: string; iso: string; atrasos: number; minutos: number; future: boolean }
export function heatmapFor(days: { day: string; atrasos: number; minutos: number }[]): HeatCell[] {
  const byDay = new Map(days.map((d) => [d.day, d]))
  const bgs = ['var(--surface-2)', 'rgba(245,166,35,.30)', 'rgba(245,166,35,.55)', 'rgba(245,166,35,.78)', 'var(--accent)']
  const weeks = 18
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dow = (today.getDay() + 6) % 7 // 0 = segunda
  const startMonday = new Date(today)
  startMonday.setDate(today.getDate() - dow - (weeks - 1) * 7)
  const cells: HeatCell[] = []
  for (let d = 0; d < 7; d++) {
    for (let w = 0; w < weeks; w++) {
      const date = new Date(startMonday)
      date.setDate(startMonday.getDate() + w * 7 + d)
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const future = date.getTime() > today.getTime()
      const rec = byDay.get(iso)
      let level = 0
      if (!future && rec) {
        const m = rec.minutos, n = rec.atrasos
        level = m > 30 ? 4 : m > 15 ? 3 : m > 5 ? 2 : (n > 0 ? 1 : 0)
        if (level === 0 && n > 0) level = 1
      }
      cells.push({ level, bg: future ? 'transparent' : bgs[level], iso, atrasos: rec?.atrasos ?? 0, minutos: rec?.minutos ?? 0, future })
    }
  }
  return cells
}

function trajetoriaFor(emp: Employee) {
  const items: { tipo: string; titulo: string; detalhe: string; quando: string; dot: string }[] = []
  const seed = seedOf(emp.id)
  items.push({ tipo: 'Admissão', titulo: 'Entrada na empresa', detalhe: 'Cargo inicial · ' + emp.cargo.replace(/Coordenador.*|Tech Lead|Gestor.*|Sênior/, 'Júnior'), quando: emp.admissao, dot: 'var(--text-mute)' })
  if (emp.tempoMeses > 24) items.push({ tipo: 'Promoção', titulo: 'Efetivação / mudança de cargo', detalhe: 'Reconhecimento por desempenho', quando: admissao(Math.round(emp.tempoMeses * 0.55)), dot: 'var(--chart-3)' })
  if (emp.tempoMeses > 14) items.push({ tipo: 'Ajuste salarial', titulo: 'Reajuste por mérito ' + (8 + Math.round(rnd(seed) * 9)) + '%', detalhe: 'Acima do dissídio da categoria', quando: admissao(Math.round(emp.tempoMeses * 0.3)), dot: 'var(--chart-2)' })
  if (emp.score >= 85) items.push({ tipo: 'Promoção', titulo: 'Promoção a ' + emp.cargo, detalhe: 'Score consistente acima de 85', quando: admissao(Math.round(emp.tempoMeses * 0.12)), dot: 'var(--accent)' })
  return items
}

function reconhecimentoFor(emp: Employee) {
  const seed = seedOf(emp.id)
  const all = [
    { titulo: 'Destaque do trimestre', quando: 'Q1 2026', kind: 'var(--accent)' },
    { titulo: 'Certificação ClassRoom', quando: 'Mar 2026', kind: 'var(--chart-2)' },
    { titulo: '100% de assiduidade', quando: '2025', kind: 'var(--chart-4)' },
    { titulo: 'Menção da Diretoria', quando: 'Dez 2025', kind: 'var(--chart-3)' },
    { titulo: 'Mentor de novatos', quando: '2025', kind: 'var(--chart-5)' },
  ]
  return all.filter((_, i) => rnd(seed + i * 2) > (0.62 - emp.score / 260))
}

function formacaoFor(emp: Employee) {
  // Formação acadêmica REAL (cadastro RH): graduação/pós/médio técnico etc.
  // Substitui os cursos fictícios. Quem não tem dado → lista vazia (sem inventar).
  const cursos = emp.eduCursos.map((c) => ({
    nome: c.nome,
    quando: c.status === 'Cursando' ? `${c.tipo} · cursando` : c.tipo,
  }))
  return { grau: emp.escolaridade, cursos, certs: [] as { nome: string; quando: string }[] }
}

function decisionFor(data: TalentData, emp: Employee) {
  const cfa = compFactorAvg(data)
  const strengths: { label: string; diff: string }[] = []
  const attention: { label: string; diff: string }[] = []
  emp.factors.forEach((f) => {
    if (f.nota == null) return // fator sem fonte não entra em forças/atenção
    const diff = f.nota - (cfa[f.key] ?? 0)
    if (diff >= 4) strengths.push({ label: f.label, diff: '+' + diff })
    else if (diff <= -5) attention.push({ label: f.label, diff: '' + diff })
  })
  const trend = emp.hist[11] - emp.hist[5]
  const deptEmps = data.employees.filter((e) => e.dept === emp.dept && e.hasScore)
  const deptAvg = deptEmps.length ? Math.round(deptEmps.reduce((a, e) => a + e.score, 0) / deptEmps.length) : emp.score
  let rec: string
  if (!emp.hasScore) rec = 'Sem dados suficientes para um score — esta pessoa não tem atividade nos sistemas, formação cadastrada nem registro de ponto. Score real depende de pelo menos uma dessas fontes.'
  else if (emp.status === 'Desligado') rec = 'Colaborador desligado — histórico mantido para consulta. Score final ' + emp.score + '.'
  else if (emp.score >= 85 && trend >= 0) rec = 'Score consistente acima de 85 e assiduidade exemplar — forte candidato a promoção ou bônus.'
  else if (emp.score >= 75) rec = 'Desempenho sólido e estável. Recomenda-se reajuste por mérito e plano de desenvolvimento.'
  else if (trend >= 5) rec = 'Em evolução clara nos últimos 6 meses — manter acompanhamento e mentoria.'
  else if (emp.score < 60) rec = 'Pontos de atenção relevantes — recomenda-se plano de ação e revisão de metas.'
  else rec = 'Desempenho dentro da média do setor — acompanhar próximos ciclos antes de decisão.'
  return { strengths, attention, trend, deptAvg, scoreVsDept: emp.score - deptAvg, recommendation: rec }
}

export type EmployeeVM = NonNullable<ReturnType<typeof buildEmployeeVM>>

export function buildEmployeeVM(data: TalentData, empId: string) {
  const emp = findEmployee(data, empId)
  if (!emp) return null
  const g = geomGauge(emp.hasScore ? emp.score : 0)
  const sm = statusMeta(emp.status)
  const seed = seedOf(emp.id)

  const totalP = emp.tasksDone + emp.tasksLate + emp.tasksPend
  const prodBar = [
    { w: (emp.tasksDone / totalP * 100).toFixed(1) + '%', color: 'var(--success)' },
    { w: (emp.tasksLate / totalP * 100).toFixed(1) + '%', color: 'var(--danger)' },
    { w: (emp.tasksPend / totalP * 100).toFixed(1) + '%', color: 'var(--surface-3)' },
  ]
  const bySystem = SYSTEMS.map((s, i) => ({ sys: s, color: sysColor(s), value: Math.round(rnd(seed * 3 + i) * 40 + 8), pct: '0%' }))
  const maxSys = Math.max(...bySystem.map((x) => x.value))
  bySystem.forEach((b) => (b.pct = Math.round(b.value / maxSys * 100) + '%'))

  const fm = formacaoFor(emp)

  // Disciplina REAL (eventos do ponto): advertências com data e motivo. Suspensão
  // não vem na fonte (e o dono optou por não derivar) → não há eventos de suspensão.
  const fmtDiaEvt = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
  const disc = emp.discEventos.map((e) => {
    const susp = e.tipo === 'suspensao'
    return {
      tipo: susp ? 'Suspensão' : 'Advertência',
      cor: susp ? 'var(--danger)' : 'var(--warning)',
      bg: susp ? 'rgba(229,72,77,.13)' : 'rgba(245,166,35,.13)',
      motivo: e.motivo || (susp ? 'Suspensão' : 'Advertência'),
      quando: fmtDiaEvt(e.data),
    }
  })

  // Rádio Itamarathy (dados REAIS via .68): horas acumuladas, sessões e última escuta.
  const radioUltima = emp.radioUltima
    ? new Date(emp.radioUltima).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })
    : null

  // WhatsApp (atendimentos reais da pessoa, acumulado). tempo médio = handle/finalizados.
  const wppAvgSec = emp.whatsapp.finalizados ? Math.round(emp.whatsapp.handleSum / emp.whatsapp.finalizados) : 0
  const whatsapp = {
    has: emp.whatsapp.abertos > 0 || emp.whatsapp.finalizados > 0,
    abertos: emp.whatsapp.abertos,
    finalizados: emp.whatsapp.finalizados,
    tempoMedio: wppAvgSec ? (wppAvgSec >= 3600 ? `${Math.floor(wppAvgSec / 3600)}h ${String(Math.round((wppAvgSec % 3600) / 60)).padStart(2, '0')}min` : `${Math.round(wppAvgSec / 60)}min`) : '—',
  }

  const dec = decisionFor(data, emp)

  return {
    id: emp.id, hasAvatar: emp.hasAvatar,
    name: emp.nome, username: emp.username, cargo: emp.cargo, dept: deptName(data, emp.dept), initials: emp.initials, color: emp.color,
    status: emp.status, statusColor: sm.color, statusBg: sm.bg,
    tempo: fmtTempo(emp.tempoMeses), admissao: emp.admissao, esc: emp.escolaridade,
    dataSaida: emp.leftISO ? new Date(emp.leftISO).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : null,
    nascimento: emp.birthDate ? new Date(emp.birthDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : null,
    idade: emp.birthDate ? (() => { const b = new Date(emp.birthDate); const t = new Date(); return t.getFullYear() - b.getFullYear() - (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate()) ? 1 : 0) })() : null,
    score: emp.score, scoreColor: scoreColor(emp.score),
    hasScore: emp.hasScore, scoreLabel: emp.hasScore ? String(emp.score) : '—',
    delta: (emp.delta >= 0 ? '▲ +' : '▼ ') + Math.abs(emp.delta), deltaColor: emp.delta >= 0 ? 'var(--success)' : 'var(--danger)',
    gaugeTrack: g.track, gaugeValue: g.value, gaugeColor: g.color,
    factors: emp.factors.map((f) => ({
      label: f.label, peso: f.peso, nota: f.nota,
      notaLabel: f.nota == null ? 'sem fonte' : String(f.nota),
      pct: f.nota == null ? '0%' : f.nota + '%',
      color: f.nota == null ? 'var(--text-mute)' : scoreColor(f.nota),
      semFonte: f.nota == null,
    })),
    timeline: timelineFor(emp),
    tasksDone: emp.tasksDone, tasksLate: emp.tasksLate, tasksPend: emp.tasksPend, prodBar, bySystem,
    // Assiduidade REAL: 100 − atrasos·2 − advertências·5 (atraso abonado já fora).
    // faltas/suspensões = null = "sem fonte" (a ficha mostra "—", não 0).
    assid: Math.max(0, 100 - emp.atrasos * 2 - emp.advertencias * 5),
    atrasos: emp.atrasos, atrasosAbon: emp.atrasosAbon, minutosAtraso: emp.minutosAtraso,
    faltas: null as number | null, advert: emp.advertencias, susp: null as number | null,
    disc, discEmpty: disc.length === 0,
    heat: heatmapFor(emp.assidDays),
    radioHoras: emp.radioHoras, radioSessoes: emp.radioSessoes, radioUltima, whatsapp,
    grau: fm.grau, cursos: fm.cursos, certs: fm.certs,
    nexusUserId: emp.nexusUserId, eduDetail: emp.eduDetail,
    treinoCursos: emp.treinoCursos, treinoCerts: emp.treinoCerts,
    birthISO: emp.birthDate ? emp.birthDate.slice(0, 10) : '', hireISO: emp.hireISO ? emp.hireISO.slice(0, 10) : '',
    classroom: {
      criados: emp.classroom.coursesCreated,
      assistidos: emp.classroom.coursesCompleted,
      videos: emp.classroom.videosCompleted,
      total: emp.classroom.coursesCreated + emp.classroom.coursesCompleted,
    },
    traj: trajetoriaFor(emp),
    recon: reconhecimentoFor(emp), reconEmpty: reconhecimentoFor(emp).length === 0,
    decRec: dec.recommendation,
    decTrend: (dec.trend >= 0 ? '+' : '') + dec.trend, decTrendColor: dec.trend >= 0 ? 'var(--success)' : 'var(--danger)',
    decVsDept: (dec.scoreVsDept >= 0 ? '+' : '') + dec.scoreVsDept, decVsDeptColor: dec.scoreVsDept >= 0 ? 'var(--success)' : 'var(--danger)',
    decStrengths: dec.strengths, decHasStr: dec.strengths.length > 0,
    decAttention: dec.attention, decHasAtt: dec.attention.length > 0,
  }
}
