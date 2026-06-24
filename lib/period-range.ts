import type { Period } from '@/lib/mock/dashboard'

const isoDay = (d: Date) => d.toISOString().slice(0, 10)

// Converte o período do dashboard (7d/30d/Trimestre/Ano) num intervalo de DIAS
// (YYYY-MM-DD). 7d/30d = janela móvel; Trimestre = trimestre atual; Ano = ano corrente.
export function periodDays(period: Period): { fromDay: string; toDay: string } {
  const to = new Date()
  let from: Date
  switch (period) {
    case '7d':
      from = new Date(to.getTime() - 7 * 86400_000)
      break
    case 'Trimestre': {
      const q = Math.floor(to.getMonth() / 3) * 3
      from = new Date(to.getFullYear(), q, 1)
      break
    }
    case 'Ano':
      from = new Date(to.getFullYear(), 0, 1)
      break
    case '30d':
    default:
      from = new Date(to.getTime() - 30 * 86400_000)
  }
  return { fromDay: isoDay(from), toDay: isoDay(to) }
}
