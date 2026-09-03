/* ============================================================
   TalentCare — view-model do Dashboard (puro em função de data + período).
   ============================================================ */
import { geomSpark, geomLine, scoreColor, type TalentData, type Employee } from './data'
import { periodDays, diasNoIntervalo } from '../period-range'
import { ESC_RANK, ESC_COLOR, personLevels } from '../education-edit'
import type { PeriodAssid } from './assiduidade'

// ⚠️ `custom` = intervalo escolhido no calendário. O rótulo dele NÃO cabe num
// Record fixo (depende das datas) — use `rotuloDoIntervalo` de
// `lib/period-range.ts` em vez de `PERIOD_LABEL` em tela nova.
export type Period = '7d' | '30d' | 'Trimestre' | 'Ano' | 'custom'

export const PERIOD_LABEL: Record<Period, string> = {
  '7d': 'Últimos 7 dias', '30d': 'Últimos 30 dias', Trimestre: 'Trimestre atual', Ano: 'Ano corrente',
  custom: 'Intervalo escolhido',
}
/**
 * Série REAL de turnover (saídas por bucket) NO INTERVALO PEDIDO.
 *
 * ⚠️⚠️ Ela desobedecia o calendário. Tratava `Ano` e `Trimestre` e mandava todo o
 * resto para o `else` — **`custom` incluído** —, onde os buckets eram fixos em
 * `5 dias × 6` = os últimos 30 dias. Escolher 1/jan a 30/jun no calendário
 * devolvia a taxa e a curva de agosto, com o cartão rotulando aquilo de
 * "Intervalo escolhido". É o defeito exato do `PERIODO-E-DEPLOY.md`: número
 * certo, janela errada, e nada acusando — só que aqui a tela chegava a *nomear*
 * a janela que não estava usando.
 *
 * ⚠️ Agora o intervalo sai de `periodDays`, o MESMO que as ~12 rotas usam. Um
 * lugar decide o que é "Trimestre", e o calendário entra por ele como qualquer
 * outro período em vez de ser um caso à parte que alguém esquece.
 */
function turnoverSeries(emps: Employee[], period: Period, from?: string | null, to?: string | null) {
  const headcount = emps.filter((e) => e.status !== 'Desligado').length
  const { fromDay, toDay } = periodDays(period, from, to)
  const inicio = new Date(`${fromDay}T00:00:00`)
  const fim = new Date(`${toDay}T00:00:00`); fim.setDate(fim.getDate() + 1) // fim exclusivo
  const dias = diasNoIntervalo(fromDay, toDay)
  const monthLabel = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')

  const buckets: { start: Date; end: Date; label: string }[] = []
  if (dias > 100) {
    // Janela longa → buckets MENSAIS, do mês do início ao mês do fim.
    const cur = new Date(inicio.getFullYear(), inicio.getMonth(), 1)
    while (cur < fim) {
      const s = new Date(cur)
      const e = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
      buckets.push({ start: s, end: e, label: monthLabel(s) })
      cur.setMonth(cur.getMonth() + 1)
    }
  } else {
    // Janela curta → buckets de 1 ou 5 dias, cobrindo exatamente [from, to].
    const groupDays = dias <= 10 ? 1 : 5
    const cur = new Date(inicio)
    while (cur < fim) {
      const s = new Date(cur)
      const e = new Date(cur); e.setDate(e.getDate() + groupDays)
      buckets.push({ start: s, end: e > fim ? fim : e, label: `${s.getDate()}/${s.getMonth() + 1}` })
      cur.setDate(cur.getDate() + groupDays)
    }
  }

  const vals = buckets.map((b) => emps.filter((e) => {
    if (!e.leftISO) return false
    const d = new Date(e.leftISO)
    return d >= b.start && d < b.end
  }).length)
  const exitsWin = emps.filter((e) => {
    if (!e.leftISO) return false
    const d = new Date(e.leftISO)
    return d >= inicio && d < fim
  }).length
  const rate = headcount ? +((exitsWin / headcount) * 100).toFixed(1) : 0
  const labels = buckets.length <= 6
    ? buckets.map((b) => b.label)
    : [0, 0.25, 0.5, 0.75, 1].map((f) => buckets[Math.round(f * (buckets.length - 1))].label)
  // O último dia de cada bucket — o headcount é medido nesses pontos, para as
  // duas curvas do painel falarem exatamente do mesmo intervalo.
  const bucketFins = buckets.map((b) => { const d = new Date(b.end); d.setDate(d.getDate() - 1); return d })
  return { vals, rate, labels, saidas: exitsWin, dias, bucketFins }
}

/**
 * Advertências ACUMULADAS ao fim de cada um dos últimos 12 meses.
 *
 * ⚠️ O número do cartão é o acumulado de toda a história; a sparkline tem de
 * responder à MESMA pergunta, senão são dois tempos diferentes lado a lado num
 * cartão de 64 pixels. Assim o último ponto da curva É o número exibido.
 */
function serieAdvertenciasAcumulada(emps: Employee[]): number[] {
  const datas: string[] = []
  for (const e of emps) for (const d of e.discEventos) if (d.tipo === 'advertencia') datas.push(d.data)
  if (!datas.length) return []
  const hoje = new Date()
  const fins: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 0) // último dia do mês
    fins.push(d.toISOString().slice(0, 10))
  }
  return fins.map((f) => datas.filter((d) => d <= f).length)
}

export type Kpi = {
  label: string; value: string | number; unit: string
  delta: string; deltaColor: string; deltaArrow: string
  /** A legenda que explica de que janela o número fala, ou por que ele é "—". */
  nota: string
  color: string
  /** `null` = não há série real para desenhar. Melhor cartão sem gráfico do que
   *  gráfico sem dado — era daí que vinham as quatro sparklines sorteadas. */
  spark: string | null
  sparkColor: string
}
export type EscSegment = { label: string; count: number; color: string; dash: string; offset: string }
export type DeptHighlight = { deptId: string; deptNome: string; color: string; id: string; nome: string; cargo: string; initials: string; hasAvatar: boolean; score: number; scoreColor: string; comparadoCom: number }

/* ⚠️⚠️ SAÍRAM daqui em 03/09/2026, sem substituto, por não serem renderizados
   por ninguém — e por serem ficção guardada num arquivo de medição:

   - `alerts` / `Alert`: quatro "novidades" com data inventada à mão ("há 2
     dias", "há 4 dias", "há 1 semana") e uma delas — "Novas certificações
     concluídas no ClassRoom neste período" — afirmada sempre, sem olhar o
     espelho do ClassRoom.
   - `rankList` / `RankRow`: os 3 primeiros e os 3 ÚLTIMOS colocados da empresa,
     com nome e foto, montados fora de qualquer régua de alcance.
   - `deptBars` / `DeptBar` e `deptCount`: score por setor com `score = 0` para
     o setor sem ninguém avaliável — o zero que a regra da casa proíbe.
   - `turnoverNow` e `periodFactor`: mortos desde que "Tarefas concluídas" saiu.

   Código morto que calcula ficção não é inofensivo: é a próxima pessoa achando
   que existe uma fonte para isso e ligando o cartão de volta. */

export type OpcoesDashboard = {
  assidMap?: PeriodAssid
  /** Extremos do calendário, quando `period === 'custom'`. */
  from?: string | null
  to?: string | null
  /** A janela pedida foi coberta pelo import do ponto? Ver `lib/ponto-cobertura.ts`. */
  janelaComPonto?: boolean
  motivoSemPonto?: string | null
  /** Atrasos por dia na janela (de `/api/assiduidade-metrics`) p/ a sparkline. */
  atrasosPorDia?: { day: string; atrasos: number }[]
}

export function buildDashboard(data: TalentData, period: Period, opts: OpcoesDashboard = {}) {
  const { assidMap, from, to, janelaComPonto = false, motivoSemPonto = null, atrasosPorDia = [] } = opts
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const isDir = (deptId: string) => norm(data.deptMeta[deptId] || '').includes('diretoria')

  // Resumo executivo: só ATIVOS e SEM a Diretoria (donos). O ClassRoom é exceção (card próprio, todos).
  const perf = data.employees.filter((e) => e.status !== 'Desligado' && !isDir(e.dept))
  const nonDir = data.employees.filter((e) => !isDir(e.dept)) // turnover: inclui as saídas
  const n = perf.length || 1

  // Score médio/ranking só com quem é avaliável (hasScore) — exclui sem-dado.
  const scored = perf.filter((e) => e.hasScore)
  const compScore = scored.length ? Math.round(scored.reduce((a, e) => a + e.score, 0) / scored.length) : 0
  /* ⚠️⚠️ "Tarefas concluídas" SAIU do painel (03/09/2026). O número (5.331) era
     a soma de `24 + rnd(seed * 3) * 120` por pessoa, vezes um fator de período —
     sorteio puro, em 26px, ao lado de medições de verdade, num painel usado para
     decidir aumento. Nenhum sistema da casa registra "tarefa": o que existe é
     chamado, serviço, curso, atendimento — e isso a tela já mostra por fonte. */
  // Ponto (REAL) — atrasos e advertências do quadro ativo. Period-aware quando o
  // assidMap (do /api/assiduidade-metrics) é passado; sem ele, cai no acumulado.
  const pk = (e: Employee) => e.nexusUserId ?? e.id
  const atrasosPonto = assidMap
    ? perf.reduce((a, e) => a + (assidMap.get(pk(e))?.atrasos ?? 0), 0)
    : perf.reduce((a, e) => a + e.atrasos, 0)
  // Advertências = registro cumulativo → SEMPRE acumulado (não por período).
  const advertPonto = perf.reduce((a, e) => a + e.advertencias, 0)
  // Turnover REAL period-aware (saídas no período ÷ headcount). nonDir = sem Diretoria.
  const tser = turnoverSeries(nonDir, period, from, to)
  const { fromDay, toDay } = periodDays(period, from, to)

  /* Atrasos por bucket, nos MESMOS cortes do turnover — o gráfico do cartão de
     atrasos e o do cartão de turnover falam do mesmo intervalo, no mesmo passo. */
  const atrasosSerie = janelaComPonto
    ? tser.bucketFins.map((fimB, i) => {
        const iniB = i === 0 ? fromDay : tser.bucketFins[i - 1].toISOString().slice(0, 10)
        const fimS = fimB.toISOString().slice(0, 10)
        return atrasosPorDia
          .filter((d) => (i === 0 ? d.day >= iniB : d.day > iniB) && d.day <= fimS)
          .reduce((a, d) => a + d.atrasos, 0)
      })
    : []

  /* ⚠️⚠️ `sp(seed, base)` REMOVIDA (03/09/2026). Era um passeio aleatório de 12
     pontos semeado por um número fixo, e desenhava as sparklines de Headcount,
     Advertências e Atrasos. A do Score médio era pior: um array literal
     `[74,75,74,76,77,76,78,77,79,78,79, …]` com o valor real só no último ponto —
     onze doze avos de gráfico inventado embaixo de um número verdadeiro.

     Junto saíram os deltas `+3` (Headcount) e `+2` (Score médio), escritos à mão
     no código. O "+3" chegava a ser plausível: em 30 dias entraram mesmo 3
     pessoas — e saíram 5. O delta real do período é **−2**. */

  /* HEADCOUNT — quantos estão aqui hoje, e o saldo do período.
     ⚠️ Entradas MENOS saídas: um delta que conta só as admissões é uma
     contratação com a demissão apagada. */
  const dentroDaJanela = (iso: string | null) => !!iso && iso.slice(0, 10) >= fromDay && iso.slice(0, 10) <= toDay
  const admitidos = nonDir.filter((e) => dentroDaJanela(e.hireISO)).length
  const saidas = nonDir.filter((e) => dentroDaJanela(e.leftISO)).length
  const saldoHc = admitidos - saidas
  // A curva do headcount ao fim de cada bucket do MESMO intervalo do turnover.
  const hcSerie = tser.bucketFins.map((d) => {
    const dia = d.toISOString().slice(0, 10)
    return nonDir.filter((e) => (!e.hireISO || e.hireISO.slice(0, 10) <= dia) && (!e.leftISO || e.leftISO.slice(0, 10) > dia)).length
  })

  /* ADVERTÊNCIAS — registro CUMULATIVO por decisão da casa: uma advertência não
     "sai" do histórico quando o filtro anda. O cartão passa a dizer isso (era
     dívida aberta no `PERIODO-E-DEPLOY.md`: faltava o rótulo, não a decisão), e a
     sparkline é o MESMO acumulado mês a mês — o último ponto dela é o número. */
  const advSerie = serieAdvertenciasAcumulada(perf)

  /* ATRASOS — obedece ao filtro. `null` quando a janela não foi medida: o ponto
     entra por import à mão e em 03/09/2026 parava em 25/06, então "7 dias",
     "30 dias" e "Trimestre atual" devolviam zero linha — e zero linha estava
     virando **0 atrasos**, em verde, ao lado de "Advertências 732". */
  const atrasosVal = janelaComPonto ? atrasosPonto : null

  const kdef: (Omit<Kpi, 'spark' | 'sparkColor' | 'deltaColor' | 'deltaArrow'> & { vals: number[]; up: boolean | null })[] = [
    {
      label: 'Headcount', value: perf.length, unit: '', color: 'var(--info)',
      delta: saldoHc === 0 ? '0' : (saldoHc > 0 ? '+' : '') + saldoHc, up: saldoHc >= 0,
      nota: `${admitidos} ${admitidos === 1 ? 'entrada' : 'entradas'} · ${saidas} ${saidas === 1 ? 'saída' : 'saídas'} no período`,
      vals: hcSerie,
    },
    {
      label: 'Turnover', value: tser.rate, unit: '%', color: 'var(--success)', delta: '', up: null,
      /* ⚠️ Sem anualizar: é saídas ÷ headcount NA JANELA. Medido em 03/09/2026 a
         mesma casa dava 1,1% em 7d, 5,7% em 30d e 29,9% em Ano — e "turnover" se
         lê como taxa anual, então quem abrisse em 7 dias veria uma empresa
         saudável. O rótulo do cartão passa a dizer de que janela ele fala. */
      nota: `${tser.saidas} ${tser.saidas === 1 ? 'saída' : 'saídas'} em ${tser.dias} dias · não anualizado`,
      vals: tser.vals.length > 1 ? tser.vals : [0, 0],
    },
    {
      label: 'Advertências', value: advertPonto, unit: '', color: 'var(--danger)', delta: '', up: null,
      nota: 'acumulado — não filtra por período', vals: advSerie,
    },
    {
      label: 'Atrasos', value: atrasosVal ?? '—', unit: '', color: 'var(--chart-5)', delta: '', up: null,
      nota: atrasosVal == null ? (motivoSemPonto ?? 'sem dado de ponto nesta janela') : 'no período',
      vals: atrasosSerie.length > 1 ? atrasosSerie : [],
    },
    {
      /* ⚠️ Sem delta e sem sparkline, de propósito. O score é um PERCENTIL dentro
         do setor: a média de percentis é quase constante por construção, e uma
         seta de tendência sobre ela diria mais sobre o arredondamento do que
         sobre a casa. O número fica; a tendência inventada, não. */
      label: 'Score médio', value: compScore, unit: '/100', color: 'var(--accent)', delta: '', up: null,
      nota: `${scored.length} de ${perf.length} com score aplicável`, vals: [],
    },
  ]
  const kpis: Kpi[] = kdef.map((k) => ({
    label: k.label, value: k.value, unit: k.unit, delta: k.delta, nota: k.nota, color: k.color,
    deltaColor: k.up == null ? 'var(--text-dim)' : k.up ? 'var(--success)' : 'var(--danger)',
    deltaArrow: k.up == null ? '' : k.up ? '▲' : '▼',
    spark: k.vals.length > 1 ? geomSpark(k.vals, 64, 24) : null,
    sparkColor: k.color,
  }))

  const deptColorById = new Map(data.departments.map((d) => [d.id, d.color]))
  const tg = geomLine(tser.vals.length > 1 ? tser.vals : [0, 0], 320, 150, 8)

  /* Destaque por departamento: o MELHOR de cada setor (cada um comparado só com o
     próprio depto). Score é relativo ao depto (produtividade percentil) → não faz
     sentido um ranking de pessoas misturando setores na home.

     ⚠️⚠️ E era exatamente isso que ele fazia: ordenava os destaques por score
     `b.score - a.score`, entre setores. O `/ranking` exibe um aviso amarelo
     dizendo que essa comparação não vale, e a home fazia a comparação, sem
     aviso, virando na prática um ranking de setores pelo campeão de cada um.
     Agora a ordem é ALFABÉTICA por setor — uma lista, não um pódio. */
  const byDeptScored = new Map<string, Employee[]>()
  for (const e of scored) {
    if (e.cargo.toLowerCase().includes('gestor')) continue // destaque é do time — gestores não entram
    const l = byDeptScored.get(e.dept) ?? []; l.push(e); byDeptScored.set(e.dept, l)
  }
  const deptHighlights: DeptHighlight[] = [...byDeptScored.entries()].map(([id, list]) => {
    const top = list.slice().sort((a, b) => b.score - a.score)[0]
    return {
      deptId: id, deptNome: data.deptMeta[id] ?? id, color: deptColorById.get(id) ?? 'var(--accent)',
      id: top.id, nome: top.nome, cargo: top.cargo, initials: top.initials, hasAvatar: top.hasAvatar,
      score: top.score, scoreColor: scoreColor(top.score),
      /* ⚠️ Contra quantos ele foi comparado. "Melhor de um" não é destaque: em
         setor de uma pessoa só o número não separa ninguém, e a tela precisa
         poder dizer isso em vez de coroar quem não teve com quem competir. */
      comparadoCom: list.length,
    }
  }).sort((a, b) => a.deptNome.localeCompare(b.deptNome))

  // Multi-contagem: cada pessoa entra em CADA formação que tem (MBA + Pós +
  // Extensão de Pós contam separado). Cores semânticas por nível (ESC_COLOR).
  const escCounts: Record<string, number> = {}
  perf.forEach((e) => personLevels(e.eduCursos, e.escolaridade).forEach((k) => { escCounts[k] = (escCounts[k] ?? 0) + 1 }))
  const escUsed = Object.keys(escCounts).sort((a, b) => {
    const ia = ESC_RANK.indexOf(a), ib = ESC_RANK.indexOf(b)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })
  // Denominador = soma das formações (o donut fecha 100%); count = nº de pessoas.
  const escTotal = Object.values(escCounts).reduce((a, b) => a + b, 0) || 1
  const C = 2 * Math.PI * 46
  let acc = 0
  const escSegments: EscSegment[] = escUsed.map((label) => {
    const count = escCounts[label]
    const frac = count / escTotal
    const seg = { label, count, color: ESC_COLOR[label] ?? '#9aa1ac', dash: (frac * C).toFixed(2) + ' ' + (C - frac * C).toFixed(2), offset: (-acc * C).toFixed(2) }
    acc += frac
    return seg
  })
  const escTop = escUsed.map((l) => ({ l, c: escCounts[l] })).sort((a, b) => b.c - a.c)[0] ?? { l: '—', c: 0 }

  return {
    periodLabel: PERIOD_LABEL[period],
    kpis,
    turnoverLine: tg.line, turnoverArea: tg.area,
    turnoverWinRate: tser.rate, turnoverLabels: tser.labels,
    turnoverSaidas: tser.saidas, turnoverDias: tser.dias,
    deptHighlights, headcountTotal: perf.length,
    escSegments, escTopPct: Math.round(escTop.c / escTotal * 100), escTopLabel: escTop.l.replace('Superior ', 'Sup. '),
  }
}
