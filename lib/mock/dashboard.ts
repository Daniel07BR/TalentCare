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
  /**
   * QUEM ESTÁ ATRÁS DO NÚMERO — a lista que o cartão abre ao ser clicado.
   *
   * ⚠️⚠️ Advertências, Atrasos e Suspensões só listam quem tem valor no
   * `assidMap`, que vem de `/api/assiduidade-metrics` com `porPersonKey(alcance)`
   * aplicado — eles se limitam sozinhos à régua.
   *
   * ⚠️⚠️ **O HEADCOUNT NÃO.** `movimento` sai de `nonDir`, o dataset do cliente,
   * que NÃO passa por `alcance`. Hoje é inofensivo porque `proxy.ts:117` manda
   * todo não-ADMIN embora de `/dashboard` — ou seja, a régua que protege este
   * cartão é o ROTEADOR, não a de conteúdo, e são duas réguas para a mesma
   * pergunta. No dia em que o painel abrir para gestor, ele passa a listar por
   * nome as admissões e demissões da casa inteira, com data. Achado do crítico
   * em 09/09/2026; está na lista de dívida do `FONTES.md`.
   *
   * ⚠️ `null` = este cartão não abre. Turnover não abre porque a lista de quem
   * saiu já é uma tela inteira (`/turnover`), e um painel de 8 linhas ao lado de
   * um relatório completo é o caminho pior competindo com o melhor.
   */
  pessoas: KpiPessoa[] | null
  /** O que o painel diz no topo, antes da lista. */
  pessoasNota?: string
  /** O que o número de cada linha CONTA. ⚠️ Nem sempre é o rótulo do cartão: em
   *  "Suspensões" cada linha conta medidas de LGPD (suspensão + advertência),
   *  porque a lista mostra todos os envolvidos e o cartão só as suspensões. */
  pessoasSufixo?: string
}

/** Uma linha do painel — o formato mora em `app/(app)/PainelPessoas.tsx`, que
 *  é quem o desenha. Repetido aqui como tipo estrutural para o `lib/` não
 *  importar de `app/`. */
export type KpiPessoa = {
  id: string; nome: string; cargo: string; setor: string; hasAvatar: boolean
  valor: number
  detalhe?: string
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
  /** ⚠️ A PONTUAÇÃO DA RÉGUA por pessoa, na competência do filtro — a que o dono
   *  calibrou. Quem não está no mapa não pontua: é "—", nunca 0. */
  pontuacao?: Map<string, number>
  competenciaPontuacao?: string
  estadoPontuacao?: 'gravado' | 'parcial' | 'previa' | 'misto'
  /** Medidas do Controle da LGPD no período. `null` = não foi possível ler. */
  lgpdSuspensoes?: number | null
  lgpdAdvertencias?: number | null
  /** Extremos do calendário, quando `period === 'custom'`. */
  from?: string | null
  to?: string | null
  /** A janela pedida foi coberta pelo import do ponto? Ver `lib/ponto-cobertura.ts`. */
  janelaComPonto?: boolean
  motivoSemPonto?: string | null
  /** Atrasos por dia na janela (de `/api/assiduidade-metrics`) p/ a sparkline. */
  atrasosPorDia?: { day: string; atrasos: number }[]
  /** As duas pontas do que o import do ponto cobriu — a série só desenha dentro. */
  pontoDesde?: string | null
  pontoAte?: string | null
}

export function buildDashboard(data: TalentData, period: Period, opts: OpcoesDashboard = {}) {
  const { assidMap, from, to, janelaComPonto = false, motivoSemPonto = null, atrasosPorDia = [], pontoDesde = null, pontoAte = null, lgpdSuspensoes = null, lgpdAdvertencias = null, pontuacao, competenciaPontuacao, estadoPontuacao } = opts
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
  /* ⚠️⚠️ ADVERTÊNCIAS PASSARAM A OBEDECER AO FILTRO (09/09/2026, pedido do dono).
     Era o último número da fileira que não obedecia: o cartão mostrava 820 em
     "30 dias" e 820 em "1 a 9 de setembro", com o rótulo do período em cima. A
     ressalva "acumulado — não filtra por período" existia e estava correta, mas
     um número que não responde à pergunta ao lado dele é um número respondendo
     outra pergunta — a regra (b) da casa, que custou os "59 cursos" do TI.
     ⚠️ `null` quando a janela não foi medida, como os atrasos: sem cobertura de
     ponto, zero advertência se lê como "ninguém foi advertido". */
  const advertPonto = assidMap
    ? perf.reduce((a, e) => a + (assidMap.get(pk(e))?.advertencias ?? 0), 0)
    : perf.reduce((a, e) => a + e.advertencias, 0)
  // Turnover REAL period-aware (saídas no período ÷ headcount). nonDir = sem Diretoria.
  const tser = turnoverSeries(nonDir, period, from, to)
  const { fromDay, toDay } = periodDays(period, from, to)

  /* Atrasos por bucket, nos MESMOS cortes do turnover — o gráfico do cartão de
     atrasos e o do cartão de turnover falam do mesmo intervalo, no mesmo passo. */
  /* ⚠️⚠️ SÓ OS BUCKETS QUE A COBERTURA ALCANÇA. `janelaComPonto` é um sim/não por
     sobreposição — certo para decidir se a métrica existe, insuficiente para
     desenhar. Em "Ano corrente" são 9 buckets mensais contra um import que
     termina em 25/06, e jul/ago/set saíam **zerados**: a série real do banco é
     `112 · 150 · 156 · 139 · 151 · 141 · 0 · 0 · 0`, e uma curva que despenca a
     zero no último trimestre lê-se "o problema de atraso acabou em julho".
     Bucket fora da cobertura não é zero — é ausência, e ausência não se
     desenha. */
  const atrasosSerie = janelaComPonto
    ? tser.bucketFins.flatMap((fimB, i) => {
        const iniB = i === 0 ? fromDay : tser.bucketFins[i - 1].toISOString().slice(0, 10)
        const fimS = fimB.toISOString().slice(0, 10)
        const foraDaCobertura = (!!pontoAte && iniB > pontoAte) || (!!pontoDesde && fimS < pontoDesde)
        if (foraDaCobertura) return []
        return [atrasosPorDia
          .filter((d) => (i === 0 ? d.day >= iniB : d.day > iniB) && d.day <= fimS)
          .reduce((a, d) => a + d.atrasos, 0)]
      })
    : []
  /* A janela pedida vai ALÉM do que o import cobriu? O cartão tem de dizer até
     onde ele mediu, senão o número parece falar do período inteiro. */
  const pontoTruncado = janelaComPonto && !!pontoAte && toDay > pontoAte
  const br = (d: string) => d.split('-').reverse().join('/')

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

  /* ⚠️ A SPARKLINE SAIU JUNTO com o acumulado. Ela desenhava
     `serieAdvertenciasAcumulada` — advertências acumuladas mês a mês, uma curva
     que só sobe — e agora o número é do PERÍODO. Curva que sempre sobe embaixo
     de um número que vai e volta com o filtro é o gráfico dizendo uma coisa e o
     número outra, lado a lado. Sem série inventada: o cartão fica sem
     sparkline até existir a série certa (advertências POR BUCKET da janela,
     como a de atrasos). */
  const advVal = janelaComPonto ? advertPonto : null

  /* ATRASOS — obedece ao filtro. `null` quando a janela não foi medida: o ponto
     entra por import à mão e em 03/09/2026 parava em 25/06, então "7 dias",
     "30 dias" e "Trimestre atual" devolviam zero linha — e zero linha estava
     virando **0 atrasos**, em verde, ao lado de "Advertências 732". */
  const atrasosVal = janelaComPonto ? atrasosPonto : null

  /* ── QUEM ESTÁ ATRÁS DE CADA NÚMERO ──────────────────────────────────────
     Pedido do dono (09/09/2026): poder clicar no cartão e ver as pessoas.
     ⚠️ Tudo daqui sai do que a régua de alcance já trouxe — ver `Kpi.pessoas`. */
  const nomeDept = new Map(data.departments.map((d) => [d.id, d.nome]))
  const pessoaBase = (e: Employee) => ({
    id: e.id, nome: e.nome, cargo: e.cargo,
    setor: nomeDept.get(e.dept) ?? '—', hasAvatar: e.hasAvatar,
  })
  const br2 = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—')

  /* ⚠️ Ordena por valor e CORTA o que é zero: um painel de "quem se atrasou" com
     80 linhas em zero acusaria 80 pessoas para mostrar 12. Quem não aparece na
     lista é quem não teve ocorrência — e isso o número já diz. */
  const comValor = (f: (e: Employee) => number, detalhe?: (e: Employee) => string) =>
    perf
      .map((e) => ({ ...pessoaBase(e), valor: f(e), detalhe: detalhe?.(e) }))
      .filter((p) => p.valor > 0)
      .sort((a, b) => b.valor - a.valor)

  const atrasosPessoas = assidMap
    ? comValor(
        (e) => assidMap.get(pk(e))?.atrasos ?? 0,
        (e) => {
          const m = assidMap.get(pk(e))?.minutos ?? 0
          return m ? `${m} min somados` : ''
        },
      )
    : null
  const advertPessoas = assidMap ? comValor((e) => assidMap.get(pk(e))?.advertencias ?? 0) : null

  /* SUSPENSÕES — decisão do dono (09/09/2026): "o gestor responde pelo time".
     ⚠️ A lista inclui quem levou ADVERTÊNCIA de LGPD e nenhuma suspensão: são
     medidas da mesma natureza (assinadas, por vazamento de dado), e deixá-las
     de fora esconderia gente ENVOLVIDA numa lista que se propõe a mostrar os
     envolvidos. O `valor` é o total de medidas; o `detalhe` diz a composição, e
     o cartão continua contando só as suspensões — a nota do painel avisa. */
  const lgpdPessoas = assidMap
    ? perf
        .map((e) => {
          const a = assidMap.get(pk(e))
          const s = a?.lgpdSuspensoes ?? 0
          const adv = a?.lgpdAdvertencias ?? 0
          const partes = [
            s ? `${s} suspensão${s === 1 ? '' : 'es'}` : '',
            adv ? `${adv} advertência${adv === 1 ? '' : 's'}` : '',
          ].filter(Boolean)
          return { ...pessoaBase(e), valor: s + adv, detalhe: partes.join(' · ') }
        })
        .filter((p) => p.valor > 0)
        .sort((a, b) => b.valor - a.valor)
    : null

  /* HEADCOUNT abre o MOVIMENTO da janela, não as 86 pessoas: o número grande é
     um retrato de hoje, e o que a legenda promete ("3 entradas · 4 saídas") é o
     que alguém quer ver por nome. */
  const movimento: KpiPessoa[] = [
    ...nonDir.filter((e) => dentroDaJanela(e.hireISO)).map((e) => ({ ...pessoaBase(e), valor: 1, detalhe: `entrou em ${br2(e.hireISO)}` })),
    ...nonDir.filter((e) => dentroDaJanela(e.leftISO)).map((e) => ({ ...pessoaBase(e), valor: 1, detalhe: `saiu em ${br2(e.leftISO)}` })),
  ].sort((a, b) => (a.detalhe ?? '').localeCompare(b.detalhe ?? ''))

  const kdef: (Omit<Kpi, 'spark' | 'sparkColor' | 'deltaColor' | 'deltaArrow'> & { vals: number[]; up: boolean | null; pessoas: KpiPessoa[] | null; pessoasNota?: string; pessoasSufixo?: string })[] = [
    {
      label: 'Headcount', value: perf.length, unit: '', color: 'var(--info)',
      delta: saldoHc === 0 ? '0' : (saldoHc > 0 ? '+' : '') + saldoHc, up: saldoHc >= 0,
      nota: `${admitidos} ${admitidos === 1 ? 'entrada' : 'entradas'} · ${saidas} ${saidas === 1 ? 'saída' : 'saídas'} no período`,
      vals: hcSerie,
      /* ⚠️ Abre o MOVIMENTO da janela, não as 86 pessoas: o número grande é um
         retrato de hoje, e o que a legenda promete é o que alguém quer por nome. */
      pessoas: movimento.length ? movimento : null,
      pessoasNota: 'quem entrou e quem saiu nesta janela',
    },
    {
      label: 'Turnover', value: tser.rate, unit: '%', color: 'var(--success)', delta: '', up: null,
      /* ⚠️ Sem anualizar: é saídas ÷ headcount NA JANELA. Medido em 03/09/2026 a
         mesma casa dava 1,1% em 7d, 5,7% em 30d e 29,9% em Ano — e "turnover" se
         lê como taxa anual, então quem abrisse em 7 dias veria uma empresa
         saudável. O rótulo do cartão passa a dizer de que janela ele fala. */
      nota: `${tser.saidas} ${tser.saidas === 1 ? 'saída' : 'saídas'} em ${tser.dias} dias · não anualizado`,
      vals: tser.vals.length > 1 ? tser.vals : [0, 0],
      /* ⚠️ NÃO abre, de propósito: quem saiu já é uma TELA inteira (`/turnover`,
         com motivo, tempo de casa e a curva). Um painel de oito linhas ao lado
         de um relatório completo é o caminho pior competindo com o melhor. */
      pessoas: null,
    },
    {
      label: 'Advertências', value: advVal ?? '—', unit: '', color: 'var(--danger)', delta: '', up: null,
      nota: advVal == null
        ? (motivoSemPonto ?? 'sem dado de ponto nesta janela')
        : pontoTruncado ? `no período, medido até ${br(pontoAte!)}` : 'no período · derivadas do 2º atraso do mês',
      vals: [],
      pessoas: advVal == null ? null : (advertPessoas?.length ? advertPessoas : null),
      pessoasNota: 'quantas advertências cada um teve na janela',
    },
    {
      label: 'Atrasos', value: atrasosVal ?? '—', unit: '', color: 'var(--chart-5)', delta: '', up: null,
      nota: atrasosVal == null
        ? (motivoSemPonto ?? 'sem dado de ponto nesta janela')
        : pontoTruncado ? `no período, medido até ${br(pontoAte!)}` : 'no período',
      vals: atrasosSerie.length > 1 ? atrasosSerie : [],
      pessoas: atrasosVal == null ? null : (atrasosPessoas?.length ? atrasosPessoas : null),
      pessoasNota: 'quantos atrasos cada um teve na janela',
    },
    {
      /* SUSPENSÕES — pedido do dono (09/09/2026), no lugar do "Score médio".
         Vêm do Controle da LGPD do Nexus: medida ASSINADA por vazamento de dado
         pessoal, não a advertência derivada do atraso que está no cartão ao
         lado. É o número mais grave da fileira e o que menos aparecia.

         ⚠️ `null` (→ "—") quando a leitura FALHOU, nunca 0: zero suspensões é a
         melhor notícia do painel, e uma queda de rede não pode produzi-la.

         ⚠️ A nota carrega as advertências de LGPD quando existem na janela.
         Elas não cabem no cartão de "Advertências" (aquele conta a derivada do
         2º atraso, outra natureza) e sumiriam da tela inteira sem isto.

         ⚠️ Sem sparkline: são poucos eventos e esparsos — 5 em 2026 na casa
         toda. Uma curva sobre isso desenha ruído com cara de tendência. */
      label: 'Suspensões', value: lgpdSuspensoes ?? '—', unit: '', color: 'var(--danger)', delta: '', up: null,
      nota: lgpdSuspensoes == null
        ? 'não foi possível ler'
        : `por vazamento de dados (LGPD), no período${lgpdAdvertencias ? ` · e ${lgpdAdvertencias} advertência${lgpdAdvertencias === 1 ? '' : 's'} de LGPD` : ''}`,
      vals: [],
      /* ⚠️⚠️ ABRE POR DECISÃO EXPLÍCITA DO DONO (09/09/2026), não por descuido.
         No Nexus a área de LGPD é fechada (T.I e Diretoria) e aqui o cartão é
         lido por gestor — então isto DÁ ao gestor, no TalentCare, o que o Nexus
         não lhe dá. A pergunta foi feita e a resposta foi "o gestor responde
         pelo time". Vale o mesmo `alcance` do resto: o gestor vê o time dele, a
         Diretoria vê a casa. Se um dia a régua do Nexus mudar, este é o lugar a
         revisar junto. */
      pessoas: lgpdSuspensoes == null ? null : (lgpdPessoas?.length ? lgpdPessoas : null),
      pessoasNota: 'medidas de LGPD na janela — o cartão conta só as suspensões',
      pessoasSufixo: 'medidas de LGPD',
    },
  ]
  const kpis: Kpi[] = kdef.map((k) => ({
    label: k.label, value: k.value, unit: k.unit, delta: k.delta, nota: k.nota, color: k.color,
    pessoas: k.pessoas, pessoasNota: k.pessoasNota, pessoasSufixo: k.pessoasSufixo,
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
  /* ⚠️⚠️ O DESTAQUE PASSOU A USAR A PONTUAÇÃO DA RÉGUA (09/09/2026, decisão do
     dono), e não o `score` de percentil. Eram DUAS réguas de desempenho no
     mesmo painel: o score é percentil de atividade + assiduidade + formação, e
     ninguém o validou; a pontuação é a que o dono calibrou peso por peso e é a
     que decide aumento. O Lucas dava 94 numa e 1.319 na outra.

     ⚠️ Só entra quem PONTUA na competência. Quem não está no mapa (encarregado,
     sem crédito, setor sem régua) não vira destaque com nota zero — some da
     lista, e o setor inteiro some quando ninguém dele pontua. É "—" por
     ausência, não zero por acusação.

     ⚠️ A comparação continua sendo DENTRO do setor. Pontos de setores
     diferentes não se comparam (o Legal tem planilha de serviços; o Fiscal
     não), e por isso a ordem segue alfabética — lista, não pódio. */
  const pontosDe = (e: Employee) => pontuacao?.get(e.id)
  const deptHighlights: DeptHighlight[] = [...byDeptScored.entries()].map(([id, list]) => {
    const comPontos = list.filter((e) => pontosDe(e) != null)
    if (!comPontos.length) return null
    const top = comPontos.slice().sort((a, b) => (pontosDe(b) ?? 0) - (pontosDe(a) ?? 0))[0]
    const pts = pontosDe(top) as number
    return {
      deptId: id, deptNome: data.deptMeta[id] ?? id, color: deptColorById.get(id) ?? 'var(--accent)',
      id: top.id, nome: top.nome, cargo: top.cargo, initials: top.initials, hasAvatar: top.hasAvatar,
      /* ⚠️ A cor sai da POSIÇÃO no próprio setor, não de uma faixa fixa: pontos
         são absolutos, e "1.319 é verde, 198 é vermelho" seria uma régua de
         valor inventada — a mesma armadilha do gauge de score que saiu daqui. */
      score: pts, scoreColor: 'var(--accent)',
      /* ⚠️ Contra quantos ele foi comparado. "Melhor de um" não é destaque: em
         setor de uma pessoa só o número não separa ninguém, e a tela precisa
         poder dizer isso em vez de coroar quem não teve com quem competir. */
      comparadoCom: comPontos.length,
    }
  }).filter((x): x is DeptHighlight => x !== null)
    .sort((a, b) => a.deptNome.localeCompare(b.deptNome))

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
    // ⚠️ `periodLabel` saiu: a tela lê `label` do `usePeriod()`, que passa por
    // `rotuloDoIntervalo` e sabe formatar o intervalo do calendário.
    kpis,
    turnoverLine: tg.line, turnoverArea: tg.area,
    turnoverWinRate: tser.rate, turnoverLabels: tser.labels,
    turnoverSaidas: tser.saidas, turnoverDias: tser.dias,
    deptHighlights, headcountTotal: perf.length,
    /** O que o número do destaque é, para a tela poder dizer. */
    pontuacaoInfo: { competencia: competenciaPontuacao ?? null, estado: estadoPontuacao ?? null },
    escSegments, escTopPct: Math.round(escTop.c / escTotal * 100), escTopLabel: escTop.l.replace('Superior ', 'Sup. '),
  }
}
