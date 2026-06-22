/* ============================================================
   TalentCare — view-model do Dashboard (Visão da Diretoria)
   Porte da seção dashboard do renderVals() do protótipo.
   ============================================================ */
import { buildData, geomSpark, geomLine, scoreColor, rnd, ESC_ORDER, PALETTE } from './data'

export type Period = '7d' | '30d' | 'Trimestre' | 'Ano'

export const PERIOD_LABEL: Record<Period, string> = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  Trimestre: 'Trimestre atual',
  Ano: 'Ano corrente',
}

function periodFactor(p: Period): number {
  return ({ '7d': 0.55, '30d': 1, Trimestre: 2.6, Ano: 9 }[p]) || 1
}

export type Kpi = {
  label: string; value: string | number; unit: string; delta: string
  deltaColor: string; deltaArrow: string; spark: string; sparkColor: string
}
export type DeptBar = { id: string; nome: string; score: number; pct: string; color: string }
export type RankRow = { rank: number; id: string; initials: string; color: string; nome: string; cargo: string; score: number; scoreColor: string }
export type EscSegment = { label: string; count: number; color: string; dash: string; offset: string }
export type Alert = { text: string; when: string; color: string; glow: string }

export type DashboardVM = {
  periodLabel: string
  kpis: Kpi[]
  deptBars: DeptBar[]
  deptCount: number
  turnoverLine: string
  turnoverArea: string
  turnoverNow: number
  rankList: RankRow[]
  headcountTotal: number
  escSegments: EscSegment[]
  escTopPct: number
  escTopLabel: string
  alerts: Alert[]
}

export function buildDashboard(period: Period): DashboardVM {
  const D = buildData()
  const emps = D.employees
  const ativos = emps.filter((e) => e.status !== 'Desligado')
  const pf = periodFactor(period)

  const compScore = Math.round(ativos.reduce((a, e) => a + e.score, 0) / ativos.length)
  const totalTasks = Math.round(emps.reduce((a, e) => a + e.tasksDone, 0) * (pf / 2.6 + 0.4))
  const lateRate = +(emps.reduce((a, e) => a + e.tasksLate, 0) / emps.reduce((a, e) => a + e.tasksDone, 0) * 100).toFixed(1)
  const faltas = Math.round(emps.reduce((a, e) => a + e.faltas, 0) * (pf / 3 + 0.5))
  const turnoverNow = 8.4

  const sp = (seed: number, b: number): number[] => {
    const a: number[] = []
    let v = b
    for (let i = 0; i < 12; i++) { v += rnd(seed + i) * 2 - 1; a.push(v) }
    return a
  }

  const kdef = [
    { label: 'Headcount', value: ativos.length, unit: '', delta: '+3', up: true, vals: sp(1, ativos.length - 3), color: 'var(--info)' },
    { label: 'Turnover', value: turnoverNow, unit: '%', delta: '-1.2 p.p.', up: true, vals: [11, 10.4, 10.9, 9.8, 9.2, 9.5, 8.9, 9.1, 8.6, 8.8, 8.5, 8.4], color: 'var(--success)' },
    { label: 'Tarefas concluídas', value: totalTasks.toLocaleString('pt-BR'), unit: '', delta: '+12%', up: true, vals: sp(3, totalTasks * 0.8), color: 'var(--chart-2)' },
    { label: '% de atrasos', value: lateRate, unit: '%', delta: '+0.8 p.p.', up: false, vals: sp(4, lateRate - 1), color: 'var(--danger)' },
    { label: 'Faltas', value: faltas, unit: '', delta: '-4', up: true, vals: sp(5, faltas + 3), color: 'var(--chart-5)' },
    { label: 'Score médio', value: compScore, unit: '/100', delta: '+2', up: true, vals: [74, 75, 74, 76, 77, 76, 78, 77, 79, 78, 79, compScore], color: 'var(--accent)' },
  ]
  const kpis: Kpi[] = kdef.map((k) => ({
    label: k.label, value: k.value, unit: k.unit, delta: k.delta,
    deltaColor: k.up ? 'var(--success)' : 'var(--danger)', deltaArrow: k.up ? '▲' : '▼',
    spark: geomSpark(k.vals, 64, 24), sparkColor: k.color,
  }))

  const sortedDepts = [...D.departments].sort((a, b) => b.score - a.score)
  const deptBars: DeptBar[] = sortedDepts.map((d) => ({ id: d.id, nome: d.nome, score: d.score, pct: d.score + '%', color: d.color }))

  const tvals = [12.1, 11.4, 10.8, 11.2, 10.1, 9.6, 9.9, 9.0, 8.7, 9.1, 8.5, 8.4]
  const tg = geomLine(tvals, 320, 150, 8)

  const ranked = [...emps].sort((a, b) => b.score - a.score)
  const top3 = ranked.slice(0, 3), bot3 = ranked.slice(-3).reverse()
  const rankList: RankRow[] = [
    ...top3.map((e, i) => ({ pos: i + 1, e })),
    ...bot3.map((e, i) => ({ pos: emps.length - 2 + i, e })),
  ].map(({ pos, e }) => ({
    rank: pos, id: e.id, initials: e.initials, color: e.color, nome: e.nome, cargo: e.cargo, score: e.score,
    scoreColor: scoreColor(e.score),
  }))

  const escCounts: Record<string, number> = {}
  ESC_ORDER.forEach((x) => (escCounts[x] = 0))
  emps.forEach((e) => escCounts[e.escolaridade]++)
  const escUsed = ESC_ORDER.filter((x) => escCounts[x] > 0)
  const escTotal = emps.length
  const C = 2 * Math.PI * 46
  let acc = 0
  const escSegments: EscSegment[] = escUsed.map((label, i) => {
    const count = escCounts[label]
    const frac = count / escTotal
    const seg = { label, count, color: PALETTE[i % 6], dash: (frac * C).toFixed(2) + ' ' + (C - frac * C).toFixed(2), offset: (-acc * C).toFixed(2) }
    acc += frac
    return seg
  })
  const escTop = escUsed.map((l) => ({ l, c: escCounts[l] })).sort((a, b) => b.c - a.c)[0]

  const alertColor: Record<string, string> = { success: 'var(--success)', danger: 'var(--danger)', info: 'var(--info)', warning: 'var(--warning)' }
  const alertGlow: Record<string, string> = { success: 'rgba(63,178,85,.15)', danger: 'rgba(229,72,77,.15)', info: 'rgba(91,157,240,.15)', warning: 'rgba(245,166,35,.15)' }
  const alertsRaw = [
    { text: 'Natália Gomes atingiu score 92 — 3º trimestre consecutivo acima de 85.', when: 'há 2 dias', kind: 'success' },
    { text: 'Turnover de Imóveis subiu para 14% no período.', when: 'há 4 dias', kind: 'danger' },
    { text: 'Juliana Prado concluiu certificação no ClassRoom.', when: 'há 5 dias', kind: 'info' },
    { text: 'Carolina Freitas (Pessoal) foi desligada.', when: 'há 1 semana', kind: 'warning' },
    { text: 'Departamento Contábil lidera o ranking de performance.', when: 'há 1 semana', kind: 'success' },
  ]
  const alerts: Alert[] = alertsRaw.map((a) => ({ text: a.text, when: a.when, color: alertColor[a.kind], glow: alertGlow[a.kind] }))

  return {
    periodLabel: PERIOD_LABEL[period],
    kpis, deptBars, deptCount: D.departments.length,
    turnoverLine: tg.line, turnoverArea: tg.area, turnoverNow,
    rankList, headcountTotal: emps.length,
    escSegments, escTopPct: Math.round(escTop.c / escTotal * 100), escTopLabel: escTop.l.replace('Superior ', 'Sup. '),
    alerts,
  }
}
