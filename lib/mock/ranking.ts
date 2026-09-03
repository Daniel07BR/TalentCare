/* ============================================================
   TalentCare — Ranking & Comparativo. Puro em função de data.

   ⚠️⚠️ ESTA TELA COMPARA PESSOAS. Nome, foto e posição, lado a lado. É a tela em
   que a regra do `null` pesa mais do que em qualquer outra: quem não é medido
   por fonte nenhuma **não é o último colocado — está fora da medição**, e uma
   lista de piores que na verdade é uma lista de não-medidos vira conversa sobre
   a carreira de gente real.
   ============================================================ */
import { FACTORS, scoreColor, fmtTempo, assidNotaFrom, assidPenalidade, type Employee, type TalentData } from './data'
import { deptName, findEmployee } from './employee'

/* ⚠️⚠️ 'tarefas' SAIU (03/09/2026). Ela devolvia `e.tasksDone`, que é
   `24 + rnd(seed * 3) * 120` — um número sorteado pelo id da pessoa. O ranking
   inteiro da empresa podia ser ordenado por ele, com nome, foto e posição. */
export type RankMetric = 'score' | 'assiduidade'

export function metricLabel(m: RankMetric): string {
  return ({ score: 'Score geral', assiduidade: 'Assiduidade' })[m]
}

/**
 * O valor da métrica, ou `null` quando a pessoa NÃO É MEDIDA por ela.
 *
 * ⚠️⚠️ A assiduidade é `100 − atrasos·2 − advertências·5`. Quem o ponto não
 * cobre entra com 0 e 0 e sai com **100** — ausência de dado lida como nota
 * máxima. Medido em 03/09/2026, nesta tela, "Todos os setores": os **22
 * primeiros colocados, empatados em 100, eram exatamente as 22 pessoas sem
 * registro de ponto nenhum**; o primeiro medido de verdade aparecia em 32º.
 *
 * `temPonto` responde isso e vem de `lib/ponto-cobertura.ts` — do roster do
 * ponto, não de "tem ocorrência": quem é medido e nunca se atrasou merece os
 * 100 dela.
 */
export function metricVal(e: Employee, m: RankMetric, ocorr?: Ocorrencias): number | null {
  if (m === 'assiduidade') {
    if (!e.temPonto) return null
    /* ⚠️ Sem `ocorr` = leitura ACUMULADA, e só ela. Quem chama com período tem
       de passar `{atrasos: 0, advertencias: 0}` para a janela limpa — ver o
       comentário no `leaderboard`. */
    const o = ocorr ?? { atrasos: e.atrasos, advertencias: e.advertencias }
    return assidNotaFrom(o.atrasos, o.advertencias)
  }
  return e.hasScore ? e.score : null
}

type Ocorrencias = { atrasos: number; advertencias: number }

/**
 * A assiduidade NO PERÍODO pedido.
 *
 * ⚠️⚠️ Regra (b) da casa: todo número ao lado do filtro tem de OBEDECER ao
 * filtro. Este aqui não obedecia — lia `e.atrasos`, que é o acumulado de toda a
 * história importada, e ficava parado em 7d, 30d, Trimestre e Ano. O teste é
 * trocar a janela e ver o número mexer.
 *
 * ⚠️ `janelaOk = false` (o dump nunca alcançou este período) devolve `null` para
 * TODO MUNDO, e a tela diz por quê. Devolver as contagens vazias daria 100 às 87
 * pessoas — que é como esta tela vinha respondendo "últimos 30 dias".
 */
export type AssidDoPeriodo = {
  janelaOk: boolean
  motivo: string | null
  ocorrenciasDe: (e: Employee) => Ocorrencias | null
}

export type BoardRow = {
  rank: number; id: string; nome: string; cargo: string; dept: string
  initials: string; color: string; hasAvatar: boolean
  val: number; pct: string; medal: string
  /** "3 atrasos · 1 advertência" — o que produziu o número. Só na assiduidade. */
  detalhe: string | null
  /** A nota bateu no piso: o número sozinho não distingue esta pessoa da vizinha. */
  noPiso: boolean
}

export type Board = {
  rows: BoardRow[]
  /** Quantos ficaram FORA por não serem medidos — a tela tem de dizer. */
  foraDaMedicao: number
  /** Por que ficaram de fora, em português. */
  motivoFora: string | null
  /** Quantos empataram no piso (0). Se >1, o fundo da lista não distingue. */
  noPiso: number
}

export function leaderboard(data: TalentData, m: RankMetric, deptId?: string, assid?: AssidDoPeriodo): Board {
  const elegiveis = data.employees.filter((e) =>
    e.status !== 'Desligado' && (!deptId || deptId === 'Todos' || e.dept === deptId))

  // A janela não foi medida → ninguém tem assiduidade nela. Lista vazia com o
  // motivo é honesta; 87 pessoas empatadas em 100 não é.
  const janelaMorta = m === 'assiduidade' && !!assid && !assid.janelaOk

  const medidos: { e: Employee; val: number; oc: Ocorrencias }[] = []
  let foraDaMedicao = 0
  for (const e of elegiveis) {
    /* ⚠️⚠️ AUSÊNCIA DE LINHA NA JANELA MEDIDA É **ZERO OCORRÊNCIA**, e nunca o
       acumulado. `/api/assiduidade-metrics` monta `byPerson` a partir de
       `pontoRows ∪ advRows`: **só entra quem teve ocorrência no período**. Quem é
       do roster e foi impecável simplesmente não vem no map.

       A primeira versão deste conserto caía no acumulado da vida inteira, e
       inverteu o defeito que ele existia para matar: em vez de a ausência
       ELOGIAR quem não é medido, ela passava a ACUSAR quem foi impecável.
       Medido na janela 01–25/06/2026: **19 das 65 pessoas do roster** sairiam
       com o histórico completo no lugar do mês. A Joice Rocha, zero atrasos e
       zero advertências em junho, apareceria com **nota 0** e a legenda "19
       atrasos · 15 advertências" — ocorrências que não aconteceram naquela
       janela — no fundo de uma lista de pessoas.

       O acumulado só vale quando não há contexto de período nenhum (`assid`
       ausente), que é a leitura acumulada de propósito. */
    const oc: Ocorrencias = m === 'assiduidade' && assid
      ? (assid.ocorrenciasDe(e) ?? { atrasos: 0, advertencias: 0 })
      : { atrasos: e.atrasos, advertencias: e.advertencias }
    const v = janelaMorta ? null : metricVal(e, m, oc)
    if (v == null) { foraDaMedicao++; continue }
    medidos.push({ e, val: v, oc })
  }

  /* ⚠️ A ORDEM da assiduidade usa a penalidade SEM piso. A nota satura em 0, e
     em 03/09/2026 **20 pessoas** empatavam ali — a Yasmin (16 atrasos, 16
     advertências) na mesma posição que a Bruna (42 e 29). O fundo de uma lista
     de pessoas é justamente onde o número precisa distinguir. O número exibido
     continua sendo a nota (0–100, que é o que entra no score); quem manda na
     ordem é a penalidade, e a linha mostra as contagens que a produziram. */
  const ordemDe = (x: { e: Employee; val: number; oc: Ocorrencias }) =>
    m === 'assiduidade' ? assidPenalidade(x.oc.atrasos, x.oc.advertencias) : x.val
  medidos.sort((a, b) => ordemDe(b) - ordemDe(a) || a.e.nome.localeCompare(b.e.nome))

  const max = medidos[0] ? Math.max(1, medidos[0].val) : 1
  const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`
  const rows: BoardRow[] = medidos.map((x, i) => ({
    rank: i + 1, id: x.e.id, nome: x.e.nome, cargo: x.e.cargo, dept: deptName(data, x.e.dept),
    initials: x.e.initials, color: x.e.color, hasAvatar: x.e.hasAvatar,
    val: x.val, pct: Math.round((x.val / max) * 100) + '%',
    medal: i === 0 ? 'var(--accent)' : i === 1 ? '#c9ccd1' : i === 2 ? '#c08457' : 'var(--text-mute)',
    detalhe: m === 'assiduidade'
      ? [x.oc.atrasos ? plural(x.oc.atrasos, 'atraso', 'atrasos') : null,
         x.oc.advertencias ? plural(x.oc.advertencias, 'advertência', 'advertências') : null]
          .filter(Boolean).join(' · ') || 'sem ocorrência no período'
      : null,
    noPiso: m === 'assiduidade' && x.val === 0,
  }))

  return {
    rows,
    foraDaMedicao,
    motivoFora: foraDaMedicao === 0 ? null
      : janelaMorta ? (assid?.motivo ?? 'sem dado de ponto neste período')
      : m === 'assiduidade' ? 'sem registro no ponto — não são medidas por esta métrica'
      : 'sem sinal de produtividade nem formação registrada — o score não se aplica',
    noPiso: rows.filter((r) => r.noPiso).length,
  }
}

function cmpCard(data: TalentData, e: Employee) {
  return {
    id: e.id, hasAvatar: e.hasAvatar, nome: e.nome, cargo: e.cargo, dept: deptName(data, e.dept),
    initials: e.initials, color: e.color,
    // ⚠️ Sem `hasScore` não há score — e "0" acusaria quem o sistema não mede.
    score: e.hasScore ? e.score : null,
    scoreColor: e.hasScore ? scoreColor(e.score) : 'var(--text-mute)',
    tempo: fmtTempo(e.tempoMeses),
  }
}

export function comparison(data: TalentData, aId: string, bId: string) {
  const a = findEmployee(data, aId), b = findEmployee(data, bId)
  if (!a || !b) return null
  return {
    aCard: cmpCard(data, a), bCard: cmpCard(data, b),
    rows: FACTORS.map((f) => {
      const na = a.factors.find((x) => x.key === f.key)?.nota ?? null
      const nb = b.factors.find((x) => x.key === f.key)?.nota ?? null
      // Fator sem fonte (null) → exibe "—" e barra zerada, cor neutra.
      return {
        label: f.label,
        na: na ?? '—', nb: nb ?? '—',
        naPct: na == null ? '0%' : na + '%', nbPct: nb == null ? '0%' : nb + '%',
        naColor: na == null ? 'var(--text-mute)' : scoreColor(na),
        nbColor: nb == null ? 'var(--text-mute)' : scoreColor(nb),
      }
    }),
  }
}

export function cmpOptions(data: TalentData) {
  return data.employees
    .filter((e) => e.status !== 'Desligado')
    .map((e) => ({ value: e.id, label: e.nome + ' · ' + deptName(data, e.dept) }))
    .sort((a, b) => a.label.localeCompare(b.label))
}
