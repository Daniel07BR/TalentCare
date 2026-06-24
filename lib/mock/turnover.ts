/* ============================================================
   TalentCare — Turnover & Headcount (REAL): entradas por admissão (hireISO),
   saídas por data de saída (leftISO). Puro em função de data.
   ============================================================ */
import { fmtTempo, type TalentData } from './data'

export function turnoverVM(data: TalentData) {
  const emps = data.employees
  const now = new Date()
  const inMonth = (iso: string | null, y: number, m: number) => {
    if (!iso) return false
    const d = new Date(iso)
    return d.getFullYear() === y && d.getMonth() === m
  }

  const months: { y: number; m: number; label: string }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') })
  }
  const raw = months.map((mo) => ({
    mo: mo.label,
    ent: emps.filter((e) => inMonth(e.hireISO, mo.y, mo.m)).length,
    sai: emps.filter((e) => inMonth(e.leftISO, mo.y, mo.m)).length,
  }))
  const maxB = Math.max(1, ...raw.map((b) => Math.max(b.ent, b.sai)))
  const bars = raw.map((b) => ({ ...b, entH: (b.ent / maxB * 100) + '%', saiH: (b.sai / maxB * 100) + '%' }))

  const totalEnt = raw.reduce((a, b) => a + b.ent, 0)
  const totalSai = raw.reduce((a, b) => a + b.sai, 0)
  const headcount = emps.filter((e) => e.status !== 'Desligado').length
  const cutoff = new Date(now.getFullYear() - 1, now.getMonth(), 1)
  const exits12 = emps.filter((e) => e.leftISO && new Date(e.leftISO) >= cutoff).length
  const rate = headcount ? +((exits12 / headcount) * 100).toFixed(1) : 0

  const byDeptRaw = data.departments.map((d) => {
    const dem = emps.filter((e) => e.dept === d.id)
    const exits = dem.filter((e) => e.leftISO && new Date(e.leftISO) >= cutoff).length
    return { nome: d.nome, exits }
  }).filter((x) => x.exits > 0).sort((a, b) => b.exits - a.exits)
  const maxEx = Math.max(1, ...byDeptRaw.map((x) => x.exits))
  const byDept = byDeptRaw.map((x) => ({ nome: x.nome, exits: x.exits, pct: (x.exits / maxEx * 100) + '%', color: 'var(--danger)' }))

  // ── Relatório por departamento (entradas/saídas 12m, headcount, taxa) ──
  const fmtD = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—'
  const inLast12 = (iso: string | null) => !!iso && new Date(iso) >= cutoff
  const deptReport = data.departments.map((d) => {
    const dem = emps.filter((e) => e.dept === d.id)
    const ent = dem.filter((e) => inLast12(e.hireISO)).length
    const sai = dem.filter((e) => inLast12(e.leftISO)).length
    const hc = dem.filter((e) => e.status !== 'Desligado').length
    const rate = hc ? +((sai / hc) * 100).toFixed(1) : (sai > 0 ? 100 : 0)
    return { id: d.id, nome: d.nome, headcount: hc, ent, sai, rate, net: ent - sai }
  }).sort((a, b) => b.sai - a.sai || b.rate - a.rate || a.nome.localeCompare(b.nome))

  // ── Lista de desligados (todos os que temos, com datas) ──
  const leavers = emps
    .filter((e) => e.status === 'Desligado' && e.leftISO)
    .map((e) => ({
      id: e.id, nome: e.nome, dept: data.deptMeta[e.dept] ?? e.dept,
      admissao: fmtD(e.hireISO), saida: fmtD(e.leftISO), leftISO: e.leftISO as string,
      tempo: fmtTempo(e.tempoMeses),
    }))
    .sort((a, b) => (a.leftISO < b.leftISO ? 1 : -1))

  return {
    deptReport, leavers, totalDesligados: leavers.length,
    bars, totalEnt, totalSai,
    net: (totalEnt - totalSai >= 0 ? '+' : '') + (totalEnt - totalSai),
    netColor: totalEnt - totalSai >= 0 ? 'var(--success)' : 'var(--danger)',
    byDept, rate, headcount, exits12,
  }
}
