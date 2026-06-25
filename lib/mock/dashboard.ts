/* ============================================================
   TalentCare — view-model do Dashboard (puro em função de data + período).
   ============================================================ */
import { geomSpark, geomLine, scoreColor, rnd, PALETTE, type TalentData, type Employee } from './data'
import type { PeriodAssid } from './assiduidade'

export type Period = '7d' | '30d' | 'Trimestre' | 'Ano'

export const PERIOD_LABEL: Record<Period, string> = {
  '7d': 'Últimos 7 dias', '30d': 'Últimos 30 dias', Trimestre: 'Trimestre atual', Ano: 'Ano corrente',
}
function periodFactor(p: Period): number {
  return ({ '7d': 0.55, '30d': 1, Trimestre: 2.6, Ano: 9 }[p]) || 1
}

// Série REAL de turnover (saídas por bucket) no período selecionado. Buckets:
// 7d = diário, 30d = a cada 5 dias, Trimestre = mensal (3), Ano = mensal (12).
// Taxa = saídas no período ÷ headcount atual. Substitui a curva fixa/fake antiga.
function turnoverSeries(emps: Employee[], period: Period) {
  const now = new Date()
  const headcount = emps.filter((e) => e.status !== 'Desligado').length
  const monthLabel = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  const buckets: { start: Date; end: Date; label: string }[] = []
  if (period === 'Ano' || period === 'Trimestre') {
    const n = period === 'Ano' ? 12 : 3
    for (let i = n - 1; i >= 0; i--) {
      const s = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      buckets.push({ start: s, end: e, label: monthLabel(s) })
    }
  } else {
    const groupDays = period === '7d' ? 1 : 5
    const n = period === '7d' ? 7 : 6
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    for (let i = n - 1; i >= 0; i--) {
      const s = new Date(today); s.setDate(today.getDate() - (i + 1) * groupDays + 1)
      const e = new Date(today); e.setDate(today.getDate() - i * groupDays + 1)
      buckets.push({ start: s, end: e, label: `${s.getDate()}/${s.getMonth() + 1}` })
    }
  }
  const vals = buckets.map((b) => emps.filter((e) => {
    if (!e.leftISO) return false
    const d = new Date(e.leftISO)
    return d >= b.start && d < b.end
  }).length)
  const winStart = buckets[0].start
  const exitsWin = emps.filter((e) => e.leftISO && new Date(e.leftISO) >= winStart).length
  const rate = headcount ? +((exitsWin / headcount) * 100).toFixed(1) : 0
  const labels = buckets.length <= 6
    ? buckets.map((b) => b.label)
    : [0, 0.25, 0.5, 0.75, 1].map((f) => buckets[Math.round(f * (buckets.length - 1))].label)
  return { vals, rate, labels, sub: PERIOD_LABEL[period] }
}

export type Kpi = { label: string; value: string | number; unit: string; delta: string; deltaColor: string; deltaArrow: string; spark: string; sparkColor: string }
export type DeptBar = { id: string; nome: string; score: number; pct: string; color: string }
export type RankRow = { rank: number; id: string; initials: string; color: string; hasAvatar: boolean; nome: string; cargo: string; score: number; scoreColor: string }
export type EscSegment = { label: string; count: number; color: string; dash: string; offset: string }
export type Alert = { text: string; when: string; color: string; glow: string }
export type DeptHighlight = { deptId: string; deptNome: string; color: string; id: string; nome: string; cargo: string; initials: string; hasAvatar: boolean; score: number; scoreColor: string }

export function buildDashboard(data: TalentData, period: Period, assidMap?: PeriodAssid) {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const isDir = (deptId: string) => norm(data.deptMeta[deptId] || '').includes('diretoria')
  const pf = periodFactor(period)

  // Resumo executivo: só ATIVOS e SEM a Diretoria (donos). O ClassRoom é exceção (card próprio, todos).
  const perf = data.employees.filter((e) => e.status !== 'Desligado' && !isDir(e.dept))
  const nonDir = data.employees.filter((e) => !isDir(e.dept)) // turnover: inclui as saídas
  const n = perf.length || 1

  // Score médio/ranking só com quem é avaliável (hasScore) — exclui sem-dado.
  const scored = perf.filter((e) => e.hasScore)
  const compScore = scored.length ? Math.round(scored.reduce((a, e) => a + e.score, 0) / scored.length) : 0
  const totalTasks = Math.round(perf.reduce((a, e) => a + e.tasksDone, 0) * (pf / 2.6 + 0.4))
  // Ponto (REAL) — atrasos e advertências do quadro ativo. Period-aware quando o
  // assidMap (do /api/assiduidade-metrics) é passado; sem ele, cai no acumulado.
  const pk = (e: Employee) => e.nexusUserId ?? e.id
  const atrasosPonto = assidMap
    ? perf.reduce((a, e) => a + (assidMap.get(pk(e))?.atrasos ?? 0), 0)
    : perf.reduce((a, e) => a + e.atrasos, 0)
  // Advertências = registro cumulativo → SEMPRE acumulado (não por período).
  const advertPonto = perf.reduce((a, e) => a + e.advertencias, 0)
  const _tnow = new Date()
  const _cutoff = new Date(_tnow.getFullYear() - 1, _tnow.getMonth(), 1)
  const _exits12 = nonDir.filter((e) => e.leftISO && new Date(e.leftISO) >= _cutoff).length
  const turnoverNow = perf.length ? +((_exits12 / perf.length) * 100).toFixed(1) : 0
  // Turnover REAL period-aware (saídas no período ÷ headcount). nonDir = sem Diretoria.
  const tser = turnoverSeries(nonDir, period)

  const sp = (seed: number, b: number): number[] => {
    const a: number[] = []
    let v = b
    for (let i = 0; i < 12; i++) { v += rnd(seed + i) * 2 - 1; a.push(v) }
    return a
  }
  const kdef = [
    { label: 'Headcount', value: perf.length, unit: '', delta: '+3', up: true, vals: sp(1, perf.length - 3), color: 'var(--info)' },
    { label: 'Turnover', value: tser.rate, unit: '%', delta: '', up: false, vals: tser.vals.length > 1 ? tser.vals : [0, 0], color: 'var(--success)' },
    { label: 'Tarefas concluídas', value: totalTasks.toLocaleString('pt-BR'), unit: '', delta: '+12%', up: true, vals: sp(3, totalTasks * 0.8), color: 'var(--chart-2)' },
    { label: 'Advertências', value: advertPonto, unit: '', delta: '', up: false, vals: sp(4, advertPonto / 12 + 2), color: 'var(--danger)' },
    { label: 'Atrasos', value: atrasosPonto, unit: '', delta: '', up: false, vals: sp(5, atrasosPonto / 12 + 3), color: 'var(--chart-5)' },
    { label: 'Score médio', value: compScore, unit: '/100', delta: '+2', up: true, vals: [74, 75, 74, 76, 77, 76, 78, 77, 79, 78, 79, compScore], color: 'var(--accent)' },
  ]
  const kpis: Kpi[] = kdef.map((k) => ({
    label: k.label, value: k.value, unit: k.unit, delta: k.delta,
    deltaColor: k.up ? 'var(--success)' : 'var(--danger)', deltaArrow: k.up ? '▲' : '▼',
    spark: geomSpark(k.vals, 64, 24), sparkColor: k.color,
  }))

  const deptColorById = new Map(data.departments.map((d) => [d.id, d.color]))
  const byDeptMap = new Map<string, Employee[]>()
  perf.forEach((e) => { const l = byDeptMap.get(e.dept) ?? []; l.push(e); byDeptMap.set(e.dept, l) })
  const deptBars: DeptBar[] = [...byDeptMap.entries()].map(([id, list]) => {
    const sc = list.filter((e) => e.hasScore)
    const score = sc.length ? Math.round(sc.reduce((a, e) => a + e.score, 0) / sc.length) : 0
    return { id, nome: data.deptMeta[id] ?? id, score, pct: score + '%', color: deptColorById.get(id) ?? 'var(--accent)' }
  }).sort((a, b) => b.score - a.score)

  const tg = geomLine(tser.vals.length > 1 ? tser.vals : [0, 0], 320, 150, 8)

  const ranked = [...scored].sort((a, b) => b.score - a.score)
  const top3 = ranked.slice(0, 3), bot3 = ranked.slice(-3).reverse()
  const rankList: RankRow[] = [
    ...top3.map((e, i) => ({ pos: i + 1, e })),
    ...bot3.map((e, i) => ({ pos: ranked.length - 2 + i, e })),
  ].map(({ pos, e }) => ({ rank: pos, id: e.id, initials: e.initials, color: e.color, hasAvatar: e.hasAvatar, nome: e.nome, cargo: e.cargo, score: e.score, scoreColor: scoreColor(e.score) }))

  // Destaque por departamento: o MELHOR de cada setor (cada um comparado só com o
  // próprio depto). Score é relativo ao depto (produtividade percentil) → não faz
  // sentido um ranking de pessoas misturando setores na home.
  const byDeptScored = new Map<string, Employee[]>()
  for (const e of scored) { const l = byDeptScored.get(e.dept) ?? []; l.push(e); byDeptScored.set(e.dept, l) }
  const deptHighlights: DeptHighlight[] = [...byDeptScored.entries()].map(([id, list]) => {
    const top = list.slice().sort((a, b) => b.score - a.score)[0]
    return {
      deptId: id, deptNome: data.deptMeta[id] ?? id, color: deptColorById.get(id) ?? 'var(--accent)',
      id: top.id, nome: top.nome, cargo: top.cargo, initials: top.initials, hasAvatar: top.hasAvatar,
      score: top.score, scoreColor: scoreColor(top.score),
    }
  }).sort((a, b) => b.score - a.score)

  const ESC_RANK = ['Doutorado', 'Mestrado', 'MBA', 'Pós-graduação', 'Superior Completo', 'Superior (cursando)', 'Superior Incompleto', 'Médio Técnico', 'Técnico', 'Ensino Médio', 'Ensino Fundamental', 'Não informado']
  const escCounts: Record<string, number> = {}
  perf.forEach((e) => { const k = e.escolaridade || 'Não informado'; escCounts[k] = (escCounts[k] ?? 0) + 1 })
  const escUsed = Object.keys(escCounts).sort((a, b) => {
    const ia = ESC_RANK.indexOf(a), ib = ESC_RANK.indexOf(b)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })
  const escTotal = perf.length || 1
  const C = 2 * Math.PI * 46
  let acc = 0
  const escSegments: EscSegment[] = escUsed.map((label, i) => {
    const count = escCounts[label]
    const frac = count / escTotal
    const seg = { label, count, color: PALETTE[i % 6], dash: (frac * C).toFixed(2) + ' ' + (C - frac * C).toFixed(2), offset: (-acc * C).toFixed(2) }
    acc += frac
    return seg
  })
  const escTop = escUsed.map((l) => ({ l, c: escCounts[l] })).sort((a, b) => b.c - a.c)[0] ?? { l: '—', c: 0 }

  const alertColor: Record<string, string> = { success: 'var(--success)', danger: 'var(--danger)', info: 'var(--info)', warning: 'var(--warning)' }
  const alertGlow: Record<string, string> = { success: 'rgba(63,178,85,.15)', danger: 'rgba(229,72,77,.15)', info: 'rgba(91,157,240,.15)', warning: 'rgba(245,166,35,.15)' }
  const topPerson = ranked[0]
  const bestDept = deptBars[0]
  const alertsRaw = [
    topPerson ? { text: `${topPerson.nome} lidera o ranking com score ${topPerson.score}.`, when: 'há 2 dias', kind: 'success' } : null,
    _exits12 > 0 ? { text: `${_exits12} ${_exits12 === 1 ? 'saída registrada' : 'saídas registradas'} nos últimos 12 meses.`, when: 'há 4 dias', kind: 'danger' } : null,
    { text: 'Novas certificações concluídas no ClassRoom neste período.', when: 'há 5 dias', kind: 'info' },
    bestDept ? { text: `Departamento ${bestDept.nome} lidera o ranking de performance.`, when: 'há 1 semana', kind: 'success' } : null,
  ].filter(Boolean) as { text: string; when: string; kind: string }[]
  const alerts: Alert[] = alertsRaw.map((a) => ({ text: a.text, when: a.when, color: alertColor[a.kind], glow: alertGlow[a.kind] }))

  return {
    periodLabel: PERIOD_LABEL[period],
    kpis, deptBars, deptCount: deptBars.length,
    turnoverLine: tg.line, turnoverArea: tg.area, turnoverNow,
    turnoverWinRate: tser.rate, turnoverLabels: tser.labels, turnoverSub: tser.sub,
    rankList, deptHighlights, headcountTotal: perf.length,
    escSegments, escTopPct: Math.round(escTop.c / escTotal * 100), escTopLabel: escTop.l.replace('Superior ', 'Sup. '),
    alerts,
  }
}
