/* ============================================================
   TalentCare — view-model do Dashboard (puro em função de data + período).
   ============================================================ */
import { geomSpark, geomLine, scoreColor, rnd, PALETTE, type TalentData, type Employee } from './data'

export type Period = '7d' | '30d' | 'Trimestre' | 'Ano'

export const PERIOD_LABEL: Record<Period, string> = {
  '7d': 'Últimos 7 dias', '30d': 'Últimos 30 dias', Trimestre: 'Trimestre atual', Ano: 'Ano corrente',
}
function periodFactor(p: Period): number {
  return ({ '7d': 0.55, '30d': 1, Trimestre: 2.6, Ano: 9 }[p]) || 1
}

export type Kpi = { label: string; value: string | number; unit: string; delta: string; deltaColor: string; deltaArrow: string; spark: string; sparkColor: string }
export type DeptBar = { id: string; nome: string; score: number; pct: string; color: string }
export type RankRow = { rank: number; id: string; initials: string; color: string; hasAvatar: boolean; nome: string; cargo: string; score: number; scoreColor: string }
export type EscSegment = { label: string; count: number; color: string; dash: string; offset: string }
export type Alert = { text: string; when: string; color: string; glow: string }

export function buildDashboard(data: TalentData, period: Period) {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const isDir = (deptId: string) => norm(data.deptMeta[deptId] || '').includes('diretoria')
  const pf = periodFactor(period)

  // Resumo executivo: só ATIVOS e SEM a Diretoria (donos). O ClassRoom é exceção (card próprio, todos).
  const perf = data.employees.filter((e) => e.status !== 'Desligado' && !isDir(e.dept))
  const nonDir = data.employees.filter((e) => !isDir(e.dept)) // turnover: inclui as saídas
  const n = perf.length || 1

  const compScore = Math.round(perf.reduce((a, e) => a + e.score, 0) / n)
  const totalTasks = Math.round(perf.reduce((a, e) => a + e.tasksDone, 0) * (pf / 2.6 + 0.4))
  const totalDone = perf.reduce((a, e) => a + e.tasksDone, 0) || 1
  const lateRate = +(perf.reduce((a, e) => a + e.tasksLate, 0) / totalDone * 100).toFixed(1)
  // Atrasos do ponto (REAL, acumulado) — substitui o antigo KPI de "Faltas" (a
  // fonte de ponto não reporta falta; ver aba Assiduidade da ficha).
  const atrasosPonto = perf.reduce((a, e) => a + e.atrasos, 0)
  const _tnow = new Date()
  const _cutoff = new Date(_tnow.getFullYear() - 1, _tnow.getMonth(), 1)
  const _exits12 = nonDir.filter((e) => e.leftISO && new Date(e.leftISO) >= _cutoff).length
  const turnoverNow = perf.length ? +((_exits12 / perf.length) * 100).toFixed(1) : 0

  const sp = (seed: number, b: number): number[] => {
    const a: number[] = []
    let v = b
    for (let i = 0; i < 12; i++) { v += rnd(seed + i) * 2 - 1; a.push(v) }
    return a
  }
  const kdef = [
    { label: 'Headcount', value: perf.length, unit: '', delta: '+3', up: true, vals: sp(1, perf.length - 3), color: 'var(--info)' },
    { label: 'Turnover', value: turnoverNow, unit: '%', delta: '-1.2 p.p.', up: true, vals: [11, 10.4, 10.9, 9.8, 9.2, 9.5, 8.9, 9.1, 8.6, 8.8, 8.5, 8.4], color: 'var(--success)' },
    { label: 'Tarefas concluídas', value: totalTasks.toLocaleString('pt-BR'), unit: '', delta: '+12%', up: true, vals: sp(3, totalTasks * 0.8), color: 'var(--chart-2)' },
    { label: '% de atrasos', value: lateRate, unit: '%', delta: '+0.8 p.p.', up: false, vals: sp(4, lateRate - 1), color: 'var(--danger)' },
    { label: 'Atrasos (ponto)', value: atrasosPonto, unit: '', delta: 'total', up: true, vals: sp(5, atrasosPonto / 12 + 3), color: 'var(--chart-5)' },
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
    const score = Math.round(list.reduce((a, e) => a + e.score, 0) / list.length)
    return { id, nome: data.deptMeta[id] ?? id, score, pct: score + '%', color: deptColorById.get(id) ?? 'var(--accent)' }
  }).sort((a, b) => b.score - a.score)

  const tvals = [12.1, 11.4, 10.8, 11.2, 10.1, 9.6, 9.9, 9.0, 8.7, 9.1, 8.5, 8.4]
  const tg = geomLine(tvals, 320, 150, 8)

  const ranked = [...perf].sort((a, b) => b.score - a.score)
  const top3 = ranked.slice(0, 3), bot3 = ranked.slice(-3).reverse()
  const rankList: RankRow[] = [
    ...top3.map((e, i) => ({ pos: i + 1, e })),
    ...bot3.map((e, i) => ({ pos: perf.length - 2 + i, e })),
  ].map(({ pos, e }) => ({ rank: pos, id: e.id, initials: e.initials, color: e.color, hasAvatar: e.hasAvatar, nome: e.nome, cargo: e.cargo, score: e.score, scoreColor: scoreColor(e.score) }))

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
    rankList, headcountTotal: perf.length,
    escSegments, escTopPct: Math.round(escTop.c / escTotal * 100), escTopLabel: escTop.l.replace('Superior ', 'Sup. '),
    alerts,
  }
}
