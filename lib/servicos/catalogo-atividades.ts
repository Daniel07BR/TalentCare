import 'server-only'
import { prisma } from '@/lib/db/prisma'
import { TIPOS_ATIVIDADE } from './atividades'
import { agregarAtividades } from './atividade-agg'
import { regraDaCompetencia, competenciaAtual } from './pontuacao'

/* ============================================================
   O CATÁLOGO DE ATIVIDADES DE UM SETOR — média, fator e pontos.

   Espelha o catálogo de serviços: os pontos de cada tipo saem de
   `média em minutos × fator` (decisão do dono, 08/09/2026 — a mesma moeda dos
   serviços). É a fonte ÚNICA usada pela tela da régua E pelo cálculo do mês;
   duplicá-la faria o número que o gestor pondera divergir do que entra na nota.

   ⚠️⚠️ QUATRO ATIVIDADES TÊM TEMPO MEDIDO pelo sistema; as outras não.
   (A Gerência mede jornada/serviço, incluindo o deslocamento.) Onde há,
   a média nasce da MEDIANA real — não da média, que o tempo decorrido infla
   (WhatsApp: mediana 48 min, média 913, por atendimentos deixados abertos por
   dias). É a mesma lição do catálogo de serviços. Onde não há, a média fica
   em branco até o gestor informar, e o tipo vale o piso de 1 ponto enquanto
   isso — o que ele já valia na contagem crua.
   ============================================================ */

/** As atividades cujo tempo o sistema mede, e como. Median sobre a duração
 *  média por dia-pessoa (a granularidade que temos), house-wide — duração é
 *  característica da atividade, não do setor. */
const MEDIDAS_SQL = `
  select 'wpp_finalizado' chave,
    percentile_cont(0.5) within group (order by handle_sum::numeric/finalizados/60) med
    from whatsapp_attendant_daily where finalizados>0 and handle_sum>0
  union all
  select 'hd_resolvido',
    percentile_cont(0.5) within group (order by resolved_seconds::numeric/resolved/60)
    from helpdesk_daily where resolved>0 and resolved_seconds>0
  union all
  select 'chat_cham_concluido',
    percentile_cont(0.5) within group (order by segundos_resolucao::numeric/chamados_concluidos/60)
    from chat_daily where chamados_concluidos>0 and segundos_resolucao>0
  union all
  select 'ger_servico',
    percentile_cont(0.5) within group (order by jornada_min::numeric/servicos)
    from gerencia_daily where servicos>0 and jornada_min>0
`

export async function medianasMedidas(): Promise<Map<string, number>> {
  const rows = await prisma.$queryRawUnsafe<{ chave: string; med: number | null }[]>(MEDIDAS_SQL)
  return new Map(rows.filter((r) => r.med != null).map((r) => [r.chave, Math.round(Number(r.med))]))
}

export type AtividadeCat = {
  chave: string; label: string; sistema: string; descricao: string
  volume: number; pessoas: number
  /** A mediana medida pelo sistema, em minutos (`null` = sistema não mede). */
  mediaMedida: number | null
  /** A média em uso: a lançada pela liderança, ou a medida. */
  mediaEmUso: number | null
  mediaAjustada: number | null
  /** Pontos por ocorrência: override, ou `max(1, round(média × fator))`. */
  pontos: number
  pontosAuto: number
  pontosAjustados: boolean
  ajustado: boolean
  ajustadoPor: string | null
  ajustadoEm: string | null
  revisado: boolean
}

/**
 * Devolve o catálogo do setor + um `valorDe(chave)` que o cálculo do mês usa.
 * Uma chamada, uma verdade.
 */
/** `opts.competencia`: o mês cuja régua dá o ponto por minuto (padrão: o corrente) — ver `calcularCatalogo`. */
export async function catalogoAtividades(departmentId: string, opts?: { comVolume?: boolean; competencia?: string }) {
  const [pessoas, ajustes, versoes, medidas] = await Promise.all([
    prisma.user.findMany({
      where: { departmentId, origin: { in: ['nexus', 'staff'] }, active: true },
      select: { id: true, nexusUserId: true, name: true },
    }),
    prisma.pontuacaoAtividade.findMany({ where: { departmentId } }),
    prisma.pontuacaoRegra.findMany({ where: { departmentId }, select: { fatorPorMinuto: true, vigenteDesde: true } }),
    medianasMedidas(),
  ])
  const regra = regraDaCompetencia(versoes, opts?.competencia ?? competenciaAtual())
  const fator = regra?.fatorPorMinuto ?? 0.5

  // Volume por tipo (vida inteira) — só quando pedido (a tela precisa; o cálculo não).
  const volume = new Map<string, number>()
  const pessoasPorTipo = new Map<string, number>()
  if (opts?.comVolume) {
    const agg = await agregarAtividades(
      pessoas.map((p) => ({ personKey: p.nexusUserId ?? p.id, nexusUserId: p.nexusUserId, nome: p.name })),
      '2000-01-01', '2999-12-31',
    )
    for (const m of agg.values()) for (const [c, v] of m) {
      if (!v) continue
      volume.set(c, (volume.get(c) ?? 0) + v)
      pessoasPorTipo.set(c, (pessoasPorTipo.get(c) ?? 0) + 1)
    }
  }

  const ajustePorChave = new Map(ajustes.map((a) => [a.atividade, a]))
  const autores = await prisma.user.findMany({
    where: { id: { in: [...new Set(ajustes.map((a) => a.ajustadoPor).filter((x): x is string => !!x))] } },
    select: { id: true, name: true },
  })
  const nomePorId = new Map(autores.map((a) => [a.id, a.name]))

  const fazer = (chave: string): AtividadeCat => {
    const t = TIPOS_ATIVIDADE.find((x) => x.chave === chave)!
    const aj = ajustePorChave.get(chave)
    const mediaMedida = medidas.get(chave) ?? null
    const mediaEmUso = aj?.mediaMinutos ?? mediaMedida
    /* ⚠️ Sem média (nem medida nem lançada), o tipo vale o PISO de 1 ponto — o
       que já valia na contagem crua. É o mesmo `max(1, …)` do catálogo de
       serviços: um tipo sem tempo não zera, mas também não domina. */
    const pontosAuto = Math.max(1, Math.round((mediaEmUso ?? 0) * fator))
    return {
      chave, label: t.label, sistema: t.sistema, descricao: t.descricao,
      volume: volume.get(chave) ?? 0, pessoas: pessoasPorTipo.get(chave) ?? 0,
      mediaMedida, mediaEmUso, mediaAjustada: aj?.mediaMinutos ?? null,
      /* ⚠️⚠️ SEMPRE O CALCULADO (11/09/2026, pedido do dono): "em pontos por
         atividade, não deixe aberto para ninguém configurar os pontos — eles devem
         ser calculados automaticamente sempre em cima do tempo médio informado".
         O override manual (`pontuacao_atividade.pontos`) deixou de valer; conferido
         antes: nenhuma atividade tinha ponto digitado, então nenhum número mudou. */
      pontos: pontosAuto,
      pontosAuto, pontosAjustados: false,
      ajustado: !!aj && aj.mediaMinutos != null,
      ajustadoPor: aj?.ajustadoPor ? (nomePorId.get(aj.ajustadoPor) ?? '—') : null,
      ajustadoEm: aj?.ajustadoEm ? aj.ajustadoEm.toISOString() : null,
      revisado: !!aj?.revisadoEm,
    }
  }

  const chaves = opts?.comVolume
    ? TIPOS_ATIVIDADE.filter((t) => (volume.get(t.chave) ?? 0) > 0).map((t) => t.chave)
    : TIPOS_ATIVIDADE.map((t) => t.chave)
  const lista = chaves.map(fazer).sort((a, b) => b.volume - a.volume)
  const valorDe = new Map(TIPOS_ATIVIDADE.map((t) => [t.chave, fazer(t.chave).pontos]))
  return { fator, atividades: lista, valorDe }
}
