import 'server-only'
import { prisma } from '@/lib/db/prisma'

/* ============================================================
   QUEM O PONTO MEDE, E QUANDO ELE MEDIU.

   ⚠️⚠️ Existe porque a ausência de dado de ponto lia como NOTA MÁXIMA. A
   assiduidade é `100 − atrasos·2 − advertências·5`; quem não tem registro entra
   com 0 e 0 e sai com **100**. Medido em 03/09/2026, no `/ranking` por
   Assiduidade: os **22 primeiros colocados, empatados em 100, eram exatamente
   as 22 pessoas sem registro de ponto nenhum**. O primeiro medido de verdade
   aparecia em 32º lugar.

   É a regra da casa do `null` pela face invertida: aqui o buraco de dado não
   acusa a pessoa — ele a **elogia**, e o elogio vai para quem o sistema nem
   olha. Num painel que decide aumento, isso é pior que o zero.

   ⚠️ São DUAS perguntas diferentes, e as duas precisam ser feitas:

   1. **A PESSOA é medida?** (`roster`) — ela existe no ponto do Nexo. Quem não
      está lá nunca terá assiduidade, em janela nenhuma.
   2. **A JANELA foi medida?** (`janelaTemDado`) — o ponto é import à mão, não
      cron. Em 03/09/2026 o dump terminava em **25/06** e a disciplina em
      **11/06**: em "7 dias", "30 dias" e "Trimestre atual" (jul–set) não havia
      uma linha sequer. Sem esta segunda pergunta, uma pessoa QUE É medida, numa
      janela que ninguém mediu, também sairia com 100 — e aí seriam 87 de 87.

   ⚠️ Não confundir com "tem ocorrência". Quem é medido e não se atrasou merece
   os 100 dela; quem não é medido não merece nota nenhuma. Hoje os dois conjuntos
   coincidem por acidente (as 65 pessoas do roster têm todas ao menos um atraso
   no histórico importado), e é justamente por isso que a heurística "tem linha
   em `assiduidade_daily`" passaria despercebida até o dia em que alguém tivesse
   um mês limpo e o sistema respondesse "sem registro de ponto" sobre ela.

   ⚠️ A régua mora AQUI, num lugar só. Ela é lida por `lib/data/source.ts`
   (o acumulado), `/api/score-metrics` (o fator do score) e
   `/api/assiduidade-metrics` (os KPIs). Três cópias divergiriam em silêncio.
   ============================================================ */

export type CoberturaPonto = {
  /** `personKey` (= `nexusUserId ?? id`) de quem o ponto do Nexo mede. */
  roster: Set<string>
  /** Primeiro e último dia com dado de ponto importado (`null` = base vazia). */
  primeiroDia: string | null
  ultimoDia: string | null
}

/**
 * Quem o ponto mede + até quando ele mediu.
 *
 * O roster sai do casamento do dump com a gente daqui: `ponto_staging` guarda o
 * que o import resolveu sozinho e `ponto_match` os vínculos feitos à mão na tela
 * `/ponto`. Os dois entram — um vínculo manual é a forma mais forte de dizer
 * "esta pessoa é medida".
 */
export async function coberturaDoPonto(): Promise<CoberturaPonto> {
  const [staging, manuais, faixaAtraso, faixaDisc] = await Promise.all([
    prisma.pontoStaging.findMany({
      where: { matchedPersonKey: { not: null } },
      select: { matchedPersonKey: true },
    }),
    prisma.pontoMatch.findMany({ select: { personKey: true } }),
    prisma.assiduidadeDaily.aggregate({ _min: { day: true }, _max: { day: true } }),
    prisma.disciplinaEvento.aggregate({ _min: { data: true }, _max: { data: true } }),
  ])

  const roster = new Set<string>([
    ...staging.map((r) => r.matchedPersonKey).filter((v): v is string => !!v),
    ...manuais.map((r) => r.personKey),
  ])

  // A cobertura é a UNIÃO das duas fontes de ocorrência: uma janela em que só
  // houve advertência (e nenhum atraso) continua sendo uma janela medida.
  const mins = [faixaAtraso._min.day, faixaDisc._min.data].filter((v): v is string => !!v)
  const maxs = [faixaAtraso._max.day, faixaDisc._max.data].filter((v): v is string => !!v)

  return {
    roster,
    primeiroDia: mins.length ? mins.sort()[0] : null,
    ultimoDia: maxs.length ? maxs.sort().slice(-1)[0] : null,
  }
}

/**
 * A janela pedida cai dentro do que o ponto realmente cobriu?
 *
 * ⚠️ Compara INTERVALOS, não "tem linha no período". Um mês em que a casa
 * inteira chegou no horário é um mês medido, e tem de continuar valendo 100 para
 * quem é do roster. O que não vale é um mês que o dump nunca alcançou.
 *
 * ⚠️ Base vazia (nenhum import ainda) → `false`: sem dado nenhum, não há janela
 * medida, e a assiduidade não se aplica a ninguém.
 */
export function janelaTemDado(cob: CoberturaPonto, fromDay: string, toDay: string): boolean {
  if (!cob.primeiroDia || !cob.ultimoDia) return false
  // Sobreposição de intervalos: [from,to] ∩ [primeiro,ultimo] ≠ ∅
  return fromDay <= cob.ultimoDia && toDay >= cob.primeiroDia
}

/** A frase que a tela mostra no lugar do número, quando não há o que medir. */
export function motivoSemPonto(cob: CoberturaPonto, temPessoa: boolean, janelaOk: boolean): string | null {
  if (!temPessoa) return 'sem registro de ponto'
  if (!janelaOk) {
    return cob.ultimoDia
      ? `ponto importado até ${cob.ultimoDia.split('-').reverse().join('/')}`
      : 'ponto ainda não importado'
  }
  return null
}
