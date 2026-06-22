/* ============================================================
   TalentCare — Turnover & Headcount. Puro em função de data.
   ============================================================ */
import { geomLine, type TalentData } from './data'

export function turnoverVM(data: TalentData) {
  const months = ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun']
  const ent = [3, 2, 4, 3, 5, 2, 4, 3, 2, 4, 3, 5]
  const sai = [2, 3, 2, 4, 2, 3, 3, 5, 2, 3, 4, 3]
  const maxB = Math.max(...ent, ...sai)
  const bars = months.map((mo, i) => ({ mo, entH: (ent[i] / maxB * 100) + '%', saiH: (sai[i] / maxB * 100) + '%', ent: ent[i], sai: sai[i] }))
  const totalEnt = ent.reduce((a, b) => a + b, 0)
  const totalSai = sai.reduce((a, b) => a + b, 0)
  const motivos = [
    { label: 'Pedido de demissão', pct: 38, color: 'var(--chart-1)' },
    { label: 'Fim de contrato', pct: 24, color: 'var(--chart-2)' },
    { label: 'Performance', pct: 18, color: 'var(--chart-5)' },
    { label: 'Mudança de cidade', pct: 12, color: 'var(--chart-4)' },
    { label: 'Outros', pct: 8, color: 'var(--chart-3)' },
  ]
  const byDept = [...data.departments].sort((a, b) => b.turnover - a.turnover).map((d) => ({
    nome: d.nome, turnover: d.turnover, pct: (d.turnover / 18 * 100) + '%',
    color: d.turnover > 11 ? 'var(--danger)' : d.turnover > 7 ? 'var(--accent)' : 'var(--success)',
  }))
  const tl = geomLine([12.1, 11.4, 10.8, 11.2, 10.1, 9.6, 9.9, 9.0, 8.7, 9.1, 8.5, 8.4], 300, 84, 8)
  return {
    bars, totalEnt, net: (totalEnt - totalSai >= 0 ? '+' : '') + (totalEnt - totalSai), netColor: totalEnt - totalSai >= 0 ? 'var(--success)' : 'var(--danger)',
    motivos, byDept, line: tl.line, area: tl.area, rate: 8.4, headcount: data.employees.filter((e) => e.status !== 'Desligado').length,
  }
}
