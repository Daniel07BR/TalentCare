import type { DeptMetrics } from '@/lib/ui/dept-period'

/* Contas puras da prévia — sem React, sem rede. Tudo aqui sai de `DeptMetrics`,
   a mesma resposta do relatório atual: as duas telas não podem dar números
   diferentes para o mesmo setor no mesmo filtro. */

/** Suspensões do período: por atraso (assinada pelo encarregado) + de LGPD. */
export function suspensoes(m: DeptMetrics): number | null {
  const a = m.assiduidade
  if (a.suspensoesAtraso == null && a.lgpdSuspensoes == null) return null
  return (a.suspensoesAtraso ?? 0) + (a.lgpdSuspensoes ?? 0)
}

/** A comparação do mês pela pontuação — quem não pontua fica no fim, não some. */
export function rankingDoMes(m: DeptMetrics) {
  return [...m.pessoas]
    // Quem só levou suspensão também entra — sem ocorrência nenhuma e sem ponto, não.
    .filter((p) => p.pontuacao !== null || p.atrasos > 0 || p.advertencias > 0 || (p.suspensoesAtraso ?? 0) + (p.lgpdSuspensoes ?? 0) > 0)
    .sort((x, y) => (y.pontuacao ?? -1) - (x.pontuacao ?? -1) || x.nome.localeCompare(y.nome))
}

/** Saídas dos últimos 12 meses, da mais recente para a mais antiga. */
export function ultimasSaidas(m: DeptMetrics) {
  return [...m.turnover.em12m].sort((a, b) => (b.quando ?? '').localeCompare(a.quando ?? ''))
}

/** "2026-08-13" → "13 de ago. de 2026". */
export function dataLonga(iso: string | null): string {
  if (!iso) return '—'
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export const num = (n: number) => n.toLocaleString('pt-BR')

/** Segundos → "12min" / "3h 05min" / "1d 6h" (dia de `porDia` horas). */
export function dur(sec: number, porDia = 24): string {
  if (!sec) return '—'
  const h = Math.floor(sec / 3600), min = Math.round((sec % 3600) / 60)
  if (h >= porDia) return `${Math.floor(h / porDia)}d ${h % porDia}h`
  return h > 0 ? `${h}h ${String(min).padStart(2, '0')}min` : `${min}min`
}
