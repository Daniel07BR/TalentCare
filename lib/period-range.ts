import type { Period } from '@/lib/mock/dashboard'

const isoDay = (d: Date) => d.toISOString().slice(0, 10)
/** AAAA-MM-DD válido? Nada de `new Date('abc')` virando NaN silencioso. */
const diaValido = (s: string | null | undefined): s is string =>
  !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T12:00:00Z`).getTime())

/**
 * Converte o período da tela num intervalo de DIAS (AAAA-MM-DD).
 * 7d/30d = janela móvel; Trimestre = trimestre atual; Ano = ano corrente.
 *
 * `custom` = o intervalo que a pessoa escolheu no calendário.
 * ⚠️ Datas inválidas ou invertidas caem no padrão de 30 dias em vez de virarem
 * um intervalo vazio: janela vazia devolve zero em tudo, e zero se lê como
 * "não houve atividade" — a pior resposta possível para um erro de digitação.
 */
export function periodDays(
  period: Period,
  from?: string | null,
  to?: string | null,
): { fromDay: string; toDay: string } {
  if (period === 'custom') {
    if (diaValido(from) && diaValido(to) && from <= to) return { fromDay: from, toDay: to }
    if (diaValido(from) && !diaValido(to)) return { fromDay: from, toDay: isoDay(new Date()) }
    // Inválido → 30 dias, o padrão do painel.
    period = '30d'
  }
  const to2 = new Date()
  let inicio: Date
  switch (period) {
    case '7d':
      inicio = new Date(to2.getTime() - 7 * 86400_000)
      break
    case 'Trimestre': {
      const q = Math.floor(to2.getMonth() / 3) * 3
      inicio = new Date(to2.getFullYear(), q, 1)
      break
    }
    case 'Ano':
      inicio = new Date(to2.getFullYear(), 0, 1)
      break
    case '30d':
    default:
      inicio = new Date(to2.getTime() - 30 * 86400_000)
  }
  return { fromDay: isoDay(inicio), toDay: isoDay(to2) }
}

/**
 * O intervalo pedido por UMA requisição. Existe para que as ~12 rotas de
 * métrica leiam o período do MESMO jeito.
 *
 * ⚠️ Antes cada rota fazia `periodDays(searchParams.get('period'))` na mão. Ao
 * acrescentar o intervalo por calendário, isso teria de ser reescrito doze
 * vezes — e a rota esquecida passaria a devolver 30 dias enquanto a tela
 * mostrasse "1 a 15 de agosto", sem nada acusar.
 */
export function rangeDaRequisicao(req: { nextUrl: URL }): {
  period: Period; fromDay: string; toDay: string
} {
  const p = req.nextUrl.searchParams
  const period = (p.get('period') as Period) || '30d'
  const { fromDay, toDay } = periodDays(period, p.get('from'), p.get('to'))
  return { period, fromDay, toDay }
}

/** Rótulo humano do intervalo, inclusive para o `custom`. */
export function rotuloDoIntervalo(period: Period, fromDay: string, toDay: string): string {
  if (period !== 'custom') {
    return ({ '7d': 'Últimos 7 dias', '30d': 'Últimos 30 dias', Trimestre: 'Trimestre atual', Ano: 'Ano corrente' } as Record<string, string>)[period] ?? period
  }
  const f = new Date(`${fromDay}T12:00:00Z`)
  const t = new Date(`${toDay}T12:00:00Z`)
  const op: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', timeZone: 'UTC' }
  const mesmoAno = f.getUTCFullYear() === t.getUTCFullYear()
  const ano = mesmoAno ? ` de ${t.getUTCFullYear()}` : ''
  return `${f.toLocaleDateString('pt-BR', op)} a ${t.toLocaleDateString('pt-BR', mesmoAno ? op : { ...op, year: 'numeric' })}${ano}`
}

/** Quantos DIAS o intervalo cobre — o que permite dizer "por dia". */
export function diasNoIntervalo(fromDay: string, toDay: string): number {
  const f = new Date(`${fromDay}T12:00:00Z`).getTime()
  const t = new Date(`${toDay}T12:00:00Z`).getTime()
  return Math.max(1, Math.round((t - f) / 86400_000) + 1)
}
