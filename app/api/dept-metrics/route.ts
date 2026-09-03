import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { rangeDaRequisicao, diasNoIntervalo, rotuloDoIntervalo } from '@/lib/period-range'
import { quemEh, filtroDeAvaliaveis } from '@/lib/avaliacoes/regua'
import { competenciaAnterior } from '@/lib/avaliacoes/criterios'

/* ============================================================
   O RELATÓRIO DE UM DEPARTAMENTO, no período pedido.

   ⚠️⚠️ Esta rota existe porque a tela de departamento mostrava o ACUMULADO DE
   TODA A HISTÓRIA debaixo do rótulo "Últimos 30 dias". Medido em 02/09/2026: o
   TI aparecia com 59 cursos criados, quando 59 é o total de sempre e no período
   eram 4. O número não estava errado — estava respondendo outra pergunta, o que
   é pior, porque ninguém desconfia de um número plausível.

   Os agregados vêm dos espelhos diários (as 8 fontes), somados no intervalo. O
   score e o ranking continuam sendo calculados no cliente (já period-aware por
   `useScorePeriod`); aqui não se recalcula score nenhum, para não haver duas
   contas do mesmo número.
   ============================================================ */

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const quem = await quemEh((session.user as { id: string }).id)
  if (!quem) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id') ?? ''
  const { period, fromDay, toDay } = rangeDaRequisicao(req)
  const range = { day: { gte: fromDay, lte: toDay } }

  const dept = await prisma.department.findUnique({
    where: { id },
    select: { id: true, name: true, nexusDepartmentId: true, avaliadoPelaDiretoria: true },
  })
  if (!dept) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })

  // ⚠️ A régua fina: um gestor não abre o relatório de outro setor pela URL.
  // O middleware só conhece o caminho, e o caminho é o mesmo para todo setor.
  const podeVerSetor =
    quem.escopo.tipo === 'tudo' || quem.escopo.avaliaDepartmentIds.includes(dept.id) || quem.departmentId === dept.id
  if (!podeVerSetor) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  // Gente do setor. `foraDoDiretorio` fora: conta de sistema não é equipe.
  const pessoas = await prisma.user.findMany({
    where: { departmentId: dept.id, origin: { in: ['nexus', 'staff'] }, foraDoDiretorio: false },
    select: {
      id: true, name: true, nexusUserId: true, active: true, jobTitle: true,
      avatarUrl: true, birthDate: true, gender: true, entryDate: true, leftAt: true,
    },
  })
  const ativos = pessoas.filter((p) => p.active)
  const nx = ativos.map((p) => p.nexusUserId).filter((v): v is string => !!v)
  // personKey da assiduidade = nexus_user_id ?? id (cobre STAFF sem Nexus).
  const chaves = ativos.map((p) => p.nexusUserId ?? p.id)
  const nomes = ativos.map((p) => p.name)
  const ids = ativos.map((p) => p.id)

  const porNexus = { nexusUserId: { in: nx }, ...range }
  const hojeRef = new Date()

  /* ⚠️⚠️ A população avaliável vem do MESMO filtro da fila (`filtroDeAvaliaveis`).
     Antes esta rota usava `ativos.length` ("ativo hoje") e as duas divergiam:
     medido em 03/09/2026, Fiscal 22 aqui × 21 na fila, Financeiro 5 × 4. O selo
     do menu diria 4 e a faixa vermelha do setor diria 5, sobre a mesma coisa. */
  const compAtual = competenciaAnterior()
  const avaliaveisRows = await prisma.user.findMany({
    where: { departmentId: dept.id, ...filtroDeAvaliaveis(compAtual) },
    select: { id: true },
  })
  const avaliaveisIds = avaliaveisRows.map((r) => r.id)
  const avaliaveis = avaliaveisIds.length

  const [cls, hd, cide, cons, radio, ger, chat, wpp, assid, adv, avals] = await Promise.all([
    prisma.classroomDaily.aggregate({ where: porNexus, _sum: { videos: true, courses: true, created: true } }),
    prisma.helpdeskDaily.aggregate({ where: porNexus, _sum: { opened: true, resolved: true, formalized: true, resolvedSeconds: true } }),
    prisma.cideDaily.aggregate({ where: porNexus, _sum: { atividades: true } }),
    prisma.consultoriaDaily.aggregate({ where: porNexus, _sum: { studies: true, tickets: true, messages: true, comments: true } }),
    prisma.radioDaily.aggregate({ where: porNexus, _sum: { seconds: true, sessions: true } }),
    prisma.gerenciaDaily.aggregate({
      where: porNexus,
      _sum: {
        servicos: true, km: true, saidas: true, viagens: true, jornadaMin: true,
        protAbertos: true, protAprovados: true, servCriados: true, reagendados: true, cancelados: true,
      },
    }),
    prisma.chatDaily.aggregate({
      where: porNexus,
      _sum: {
        msgCanais: true, msgDiretas: true, msgChamados: true,
        chamadosAbertos: true, chamadosAssumidos: true, chamadosConcluidos: true, segundosResolucao: true,
      },
    }),
    // ⚠️ WhatsApp casa por NOME (a origem não tem id do Nexus) — ver o espelho.
    prisma.whatsappAttendantDaily.aggregate({
      where: { name: { in: nomes }, ...range },
      _sum: { abertos: true, finalizados: true, handleSum: true },
    }),
    prisma.assiduidadeDaily.aggregate({
      where: { personKey: { in: chaves }, ...range },
      _sum: { atrasos: true, atrasosAbon: true, minutosAtraso: true },
    }),
    prisma.disciplinaEvento.count({
      where: { personKey: { in: chaves }, tipo: 'advertencia', data: { gte: fromDay, lte: toDay } },
    }),
    // AVALIAÇÃO: a competência do mês fechado, não o intervalo — a avaliação é
    // mensal por natureza e não se recorta em "últimos 7 dias".
    prisma.avaliacao.findMany({
      /* ⚠️⚠️ O MESMO conjunto do denominador. Antes o denominador vinha do
         filtro da competência e o numerador de `ids` (ativo HOJE): quem
         trabalhou agosto, FOI AVALIADA e saiu em 01/09 entrava em `avaliaveis`
         e a avaliação dela não entrava em `publicadas` — "Falta avaliar 1" para
         sempre, sobre alguém que já foi avaliada e já foi embora. É o alerta
         eterno que a régua única veio evitar, reintroduzido pelo meio-conserto. */
      where: { avaliadoId: { in: avaliaveisIds }, competencia: compAtual, status: 'publicada' },
      select: { media: true, avaliadoId: true, notas: { select: { criterio: true, nota: true } } },
    }),
  ])

  // ── Chamados do CHAT por setor (as duas faces) ─────────────────────────────
  // ⚠️ Vem de `chat_dept_daily`, pela FUNÇÃO gravada no chamado — e não da soma
  // das pessoas. São perguntas diferentes: aqui é "o que este setor pediu e
  // recebeu", lá é "o que estas pessoas fizeram". Divergem quando alguém troca
  // de área, e é assim que deve ser.
  const chatSetor = dept.nexusDepartmentId
    ? await prisma.chatDeptDaily.aggregate({
        where: { nexusDepartmentId: dept.nexusDepartmentId, ...range },
        _sum: {
          pedidosAbertos: true, pedidosConcluidos: true,
          recebidosAbertos: true, recebidosConcluidos: true, recebidosCancelados: true, segundosResolucao: true,
        },
      })
    : null

  const n = (v: number | null | undefined) => v ?? 0
  const dias = diasNoIntervalo(fromDay, toDay)

  /* ── TURNOVER REAL ────────────────────────────────────────────────────────
   * ⚠️⚠️ Substitui um número INVENTADO. Até 02/09/2026 o turnover de cada setor
   * era `3.5 + rnd(seed) * 13` (`lib/mock/data.ts`) — os 4,8% do TI e os 14,8%
   * do Contábil eram sorteio, exibidos ao lado de medições de verdade.
   *
   * ⚠️ Taxa só faz sentido em 12 MESES: é a régua de RH, e em 7 dias ela daria
   * 0% para quase todo setor — um zero que se leria como "ninguém sai daqui".
   * Por isso saem DUAS coisas: as saídas DENTRO do intervalo (contagem, honesta
   * em qualquer janela) e a taxa de 12 meses (que não acompanha o filtro, e a
   * tela diz isso).
   */
  const doze = new Date(hojeRef.getFullYear() - 1, hojeRef.getMonth(), hojeRef.getDate())
  const saidasNoPeriodo = pessoas.filter(
    (p) => p.leftAt && p.leftAt >= new Date(`${fromDay}T00:00:00`) && p.leftAt <= new Date(`${toDay}T23:59:59`),
  )
  const lista12m = pessoas.filter((p) => p.leftAt && p.leftAt >= doze)
  // Denominador = quadro ativo + quem saiu no período (o headcount que existiu).
  const baseTurnover = ativos.length + lista12m.length
  /* Quem saiu, COM NOME E FOTO (pedido do dono, 03/09/2026).
   * ⚠️ Duas listas, porque respondem coisas diferentes: `noPeriodo` obedece ao
   * filtro (é o que ele pediu) e `em12m` é a gente por trás da TAXA, que é de 12
   * meses. Com o filtro em 7 dias a primeira vem vazia e a taxa continua em 40% —
   * mostrar só a primeira deixaria os 40% sem ninguém por trás. */
  const quemSaiu = (l: typeof pessoas) => l
    .sort((a, b) => (b.leftAt?.getTime() ?? 0) - (a.leftAt?.getTime() ?? 0))
    .map((p) => ({
      id: p.id, nome: p.name, cargo: p.jobTitle ?? 'Colaborador',
      hasAvatar: !!p.avatarUrl,
      quando: p.leftAt ? p.leftAt.toISOString().slice(0, 10) : null,
    }))
  const turnover = {
    saidasNoPeriodo: saidasNoPeriodo.length,
    noPeriodo: quemSaiu(saidasNoPeriodo),
    em12m: quemSaiu(lista12m),
    saidas12m: lista12m.length,
    taxa12m: baseTurnover > 0 ? Math.round((lista12m.length / baseTurnover) * 1000) / 10 : 0,
  }

  /* ── SÉRIE MENSAL REAL de atividade ───────────────────────────────────────
   * ⚠️⚠️ Substitui a "Evolução do score · Últimos 12 meses", que era um passeio
   * aleatório semeado pelo id do setor terminando no score de hoje — uma linha
   * sem relação nenhuma com o passado, no lugar mais nobre da tela.
   *
   * Não dá para reconstruir o SCORE mês a mês (ele é calculado do estado atual
   * e não há snapshot mensal). Mas a ATIVIDADE mês a mês é real e está nos
   * espelhos diários — e é ela que responde "o setor produziu mais ou menos".
   *
   * ⚠️ A série começa no primeiro mês COM registro: as fontes têm janelas de
   * histórico muito diferentes, e uma linha que cai a zero em janeiro pareceria
   * uma queda de produção quando é só ausência de fonte.
   */
  const inicioSerie = new Date(hojeRef.getFullYear(), hojeRef.getMonth() - 11, 1)
  const diaInicioSerie = inicioSerie.toISOString().slice(0, 10)
  /*
   * ⚠️⚠️ A série para no último mês FECHADO. O mês corrente tem 2 ou 3 dias e a
   * variação "vs. mês anterior" compararia 2 dias contra 30: em 03/09/2026 o
   * HelpDesk daria 45 contra 191, ou seja **−76% em vermelho e 20px** — e todo
   * dia 1º de todo mês a empresa inteira despencaria na tela.
   *
   * É o mesmo defeito do "dia parcial apaga o dia cheio" dos espelhos, só que
   * na leitura em vez de na escrita.
   */
  const fimSerie = `${hojeRef.getFullYear()}-${String(hojeRef.getMonth() + 1).padStart(2, '0')}-01`
  const mensal = nx.length
    ? await prisma.$queryRaw<{ mes: string; atividade: bigint }[]>`
        SELECT mes, SUM(atividade)::bigint AS atividade FROM (
          SELECT substring(day, 1, 7) AS mes, SUM(courses + created)::bigint AS atividade
            FROM classroom_daily WHERE nexus_user_id = ANY(${nx}) AND day >= ${diaInicioSerie} AND day < ${fimSerie} GROUP BY 1
          UNION ALL
          SELECT substring(day, 1, 7), SUM(opened + resolved + formalized)::bigint
            FROM helpdesk_daily WHERE nexus_user_id = ANY(${nx}) AND day >= ${diaInicioSerie} AND day < ${fimSerie} GROUP BY 1
          UNION ALL
          SELECT substring(day, 1, 7), SUM(atividades)::bigint
            FROM cide_daily WHERE nexus_user_id = ANY(${nx}) AND day >= ${diaInicioSerie} AND day < ${fimSerie} GROUP BY 1
          UNION ALL
          SELECT substring(day, 1, 7), SUM(studies + tickets + messages + comments)::bigint
            FROM consultoria_daily WHERE nexus_user_id = ANY(${nx}) AND day >= ${diaInicioSerie} AND day < ${fimSerie} GROUP BY 1
          UNION ALL
          SELECT substring(day, 1, 7), SUM(servicos + prot_abertos + prot_aprovados + serv_criados)::bigint
            FROM gerencia_daily WHERE nexus_user_id = ANY(${nx}) AND day >= ${diaInicioSerie} AND day < ${fimSerie} GROUP BY 1
          UNION ALL
          -- ⚠️ Do Chat entra só CHAMADO. Mensagem é vitrine e fora do score; numa
          -- série de produção ela abafaria as outras seis fontes somadas.
          SELECT substring(day, 1, 7), SUM(chamados_abertos + chamados_concluidos)::bigint
            FROM chat_daily WHERE nexus_user_id = ANY(${nx}) AND day >= ${diaInicioSerie} AND day < ${fimSerie} GROUP BY 1
        ) t GROUP BY mes ORDER BY mes`
    : []
  /* ⚠️⚠️ O `GROUP BY` só emite mês COM linha. Com [mar, abr, ago] o gráfico
     desenhava três pontos igualmente espaçados, o eixo deixava de ser tempo, e a
     variação "vs. mês anterior" comparava agosto com abril. Meses vazios entre o
     primeiro e o último viram ZERO — aqui zero é o valor certo: houve o mês e
     não houve atividade. (A ponta de trás continua começando no 1º com
     registro, que é o que separa "não houve" de "não medíamos ainda".) */
  const bruto = new Map(mensal.map((r) => [r.mes, Number(r.atividade)]))
  const serie: { mes: string; atividade: number }[] = []
  if (bruto.size > 0) {
    const chaves = [...bruto.keys()].sort()
    const [a0, m0] = chaves[0].split('-').map(Number)
    const [a1, m1] = chaves[chaves.length - 1].split('-').map(Number)
    for (let d = new Date(a0, m0 - 1, 1); d <= new Date(a1, m1 - 1, 1); d.setMonth(d.getMonth() + 1)) {
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      serie.push({ mes: k, atividade: bruto.get(k) ?? 0 })
    }
  }

  // ── Demografia (não é do período: é o retrato de hoje) ─────────────────────
  const hoje = hojeRef
  const idades = ativos
    .map((p) => p.birthDate ? Math.floor((hoje.getTime() - p.birthDate.getTime()) / 31557600000) : null)
    .filter((v): v is number => v != null && v > 14 && v < 90)
  const meses = ativos
    .map((p) => p.entryDate ? (hoje.getTime() - p.entryDate.getTime()) / 2629800000 : null)
    .filter((v): v is number => v != null && v >= 0)
  const generos = ativos.reduce<Record<string, number>>((a, p) => {
    const g = (p.gender ?? '').toLowerCase().startsWith('f') ? 'F' : (p.gender ?? '').toLowerCase().startsWith('m') ? 'M' : '?'
    a[g] = (a[g] ?? 0) + 1
    return a
  }, {})

  // ── Avaliação do setor na competência ──────────────────────────────────────
  const medias = avals.map((a) => a.media).filter((v): v is number => v != null)
  const porCriterio = new Map<string, { soma: number; n: number }>()
  for (const a of avals) {
    for (const nt of a.notas) {
      if (nt.nota == null) continue // "não se aplica" fica fora da média
      const c = porCriterio.get(nt.criterio) ?? { soma: 0, n: 0 }
      c.soma += nt.nota; c.n++
      porCriterio.set(nt.criterio, c)
    }
  }

  /* ── POR PESSOA ───────────────────────────────────────────────────────────
   * Serve às duas coisas que a tela precisa: comparar as pessoas do setor e
   * dizer ONDE ESTÁ O PROBLEMA.
   *
   * ⚠️ `atividade` segue a MESMA regra do score (`activityOf` /
   * `/api/score-metrics`): contagem de ação, sem mensagem de chat, sem escuta de
   * rádio, sem km. Uma segunda definição de "atividade" faria a tela do setor
   * discordar do ranking, e ninguém saberia qual acreditar.
   *
   * ⚠️⚠️ NÃO é idêntica: falta `datasAlteradas` da Gerência, que o score soma.
   * A diferença é pequena e o comentário diz isso de propósito — a versão
   * anterior GARANTIA a igualdade e ela não existia (o WhatsApp inteiro estava
   * de fora). Comentário que promete o que o código não faz é pior que
   * comentário nenhum.
   */
  const grupos = nx.length ? await Promise.all([
    prisma.classroomDaily.groupBy({ by: ['nexusUserId'], where: porNexus, _sum: { videos: true, courses: true, created: true } }),
    prisma.helpdeskDaily.groupBy({ by: ['nexusUserId'], where: porNexus, _sum: { opened: true, resolved: true } }),
    prisma.cideDaily.groupBy({ by: ['nexusUserId'], where: porNexus, _sum: { atividades: true } }),
    prisma.consultoriaDaily.groupBy({ by: ['nexusUserId'], where: porNexus, _sum: { studies: true, tickets: true, messages: true, comments: true } }),
    prisma.gerenciaDaily.groupBy({ by: ['nexusUserId'], where: porNexus, _sum: { servicos: true, protAbertos: true, protAprovados: true, servCriados: true, km: true } }),
    prisma.chatDaily.groupBy({ by: ['nexusUserId'], where: porNexus, _sum: { chamadosAbertos: true, chamadosConcluidos: true, msgCanais: true, msgDiretas: true, msgChamados: true } }),
    prisma.assiduidadeDaily.groupBy({ by: ['personKey'], where: { personKey: { in: chaves }, ...range }, _sum: { atrasos: true, minutosAtraso: true } }),
    prisma.disciplinaEvento.groupBy({ by: ['personKey'], where: { personKey: { in: chaves }, tipo: 'advertencia', data: { gte: fromDay, lte: toDay } }, _count: { _all: true } }),
    prisma.radioDaily.groupBy({ by: ['nexusUserId'], where: porNexus, _sum: { seconds: true } }),
    /*
     * ⚠️⚠️ O WhatsApp FALTAVA aqui, e o comentário abaixo garantia que esta era
     * "a mesma conta do score". Não era: `/api/score-metrics` soma
     * `whatsappAttendantDaily.finalizados` e este bloco não somava.
     *
     * O efeito era o pior tipo de zero — o que passa por medição: a atendente do
     * Painel aparecia com **barra vazia e atividade 0** na comparação entre
     * pessoas, enquanto o cartão logo abaixo, na MESMA página, mostrava os 1.186
     * atendimentos dela. Numa tela que decide aumento.
     *
     * ⚠️ Casa por NOME (a origem não tem id do Nexus), igual ao score.
     */
    prisma.whatsappAttendantDaily.groupBy({
      by: ['name'], where: { name: { in: nomes }, ...range },
      _sum: { abertos: true, finalizados: true, handleSum: true },
    }),
    /* ⚠️ SEM `range`: "ter fonte" é propriedade da PESSOA, não da janela. Com o
       filtro no intervalo, a atendente sem conta no Nexus era "medida" em 30
       dias e virava "não medido nos sistemas" em 7 dias de férias — mudava de
       população conforme o filtro. */
    prisma.whatsappAttendantDaily.groupBy({ by: ['name'], where: { name: { in: nomes } }, _count: { _all: true } }),
  ]) : [[], [], [], [], [], [], [], [], [], [], []] as never

  const [gCls, gHd, gCide, gCons, gGer, gChat, gAss, gAdv, gRadio, gWpp, gWppSempre] = grupos
  const mapa = <T,>(rows: T[], chave: (r: T) => string | null, valor: (r: T) => number) =>
    new Map(rows.map((r) => [chave(r), valor(r)] as const))

  const mCls = mapa(gCls, (r) => r.nexusUserId, (r) => n(r._sum.courses) + n(r._sum.created) + n(r._sum.videos))
  const mHd = mapa(gHd, (r) => r.nexusUserId, (r) => n(r._sum.opened) + n(r._sum.resolved))
  const mCide = mapa(gCide, (r) => r.nexusUserId, (r) => n(r._sum.atividades))
  const mCons = mapa(gCons, (r) => r.nexusUserId, (r) => n(r._sum.studies) + n(r._sum.tickets) + n(r._sum.messages) + n(r._sum.comments))
  const mGer = mapa(gGer, (r) => r.nexusUserId, (r) => n(r._sum.servicos) + n(r._sum.protAbertos) + n(r._sum.protAprovados) + n(r._sum.servCriados))
  const mChatCham = mapa(gChat, (r) => r.nexusUserId, (r) => n(r._sum.chamadosAbertos) + n(r._sum.chamadosConcluidos))
  const mChatMsg = mapa(gChat, (r) => r.nexusUserId, (r) => n(r._sum.msgCanais) + n(r._sum.msgDiretas) + n(r._sum.msgChamados))
  const mAtr = mapa(gAss, (r) => r.personKey, (r) => n(r._sum.atrasos))
  const mMin = mapa(gAss, (r) => r.personKey, (r) => n(r._sum.minutosAtraso))
  const mAdv = mapa(gAdv, (r) => r.personKey, (r) => r._count._all)

  const normNome = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  const mWppFin = new Map(gWpp.map((r) => [normNome(r.name), n(r._sum.finalizados)]))
  const mWppAb = new Map(gWpp.map((r) => [normNome(r.name), n(r._sum.abertos)]))
  const mRadio = new Map(gRadio.map((r) => [r.nexusUserId, n(r._sum.seconds)]))
  const temWppAlgumDia = new Set(gWppSempre.map((r) => normNome(r.name)))

  const notaDe = new Map(avals.map((a) => [a.avaliadoId, a.media]))
  const equipePessoas = ativos.map((p) => {
    const k = p.nexusUserId
    const pk = p.nexusUserId ?? p.id
    return {
      id: p.id,
      nome: p.name,
      cargo: p.jobTitle ?? 'Colaborador',
      // ⚠️ Quem não tem conta no Nexus não aparece em fonte nenhuma. `semFonte`
      // existe para a tela não mostrar "0 de atividade" ao lado de quem trabalha
      // — zero e "não medimos" são coisas diferentes.
      hasAvatar: !!p.avatarUrl,
      // ⚠️ `semFonte` = sem conta no Nexus E sem registro de WhatsApp (que casa
      // por nome). Quem atende no Painel sem conta do Nexus É medido.
      semFonte: !k && !temWppAlgumDia.has(normNome(p.name)),
      atividade: (k ? (mCls.get(k) ?? 0) + (mHd.get(k) ?? 0) + (mCide.get(k) ?? 0) + (mCons.get(k) ?? 0) + (mGer.get(k) ?? 0) + (mChatCham.get(k) ?? 0) : 0)
        + (mWppFin.get(normNome(p.name)) ?? 0),
      mensagens: k ? (mChatMsg.get(k) ?? 0) : 0,
      atrasos: mAtr.get(pk) ?? 0,
      minutosAtraso: mMin.get(pk) ?? 0,
      advertencias: mAdv.get(pk) ?? 0,
      // null = ainda não avaliada nesta competência (≠ nota zero).
      nota: notaDe.get(p.id) ?? null,
    }
  })

  /* ── RANKING POR FONTE ─────────────────────────────────────────────────────
   * ⚠️⚠️ Pedido do dono (03/09/2026): *"ao invés de apresentar a tira e um monte
   * de número, mostre um card com o rank de atendimento dos funcionários com
   * quantidade, foto e nome, e o restante dos dados ao lado."*
   *
   * E ele está certo por um motivo além do visual: uma tira de totais responde
   * "quanto o setor fez" e some com QUEM fez. Num relatório lido para decidir
   * sobre gente, o nome é o dado — o total é o contexto.
   *
   * ⚠️ Só entra quem tem valor > 0. Listar a equipe inteira com zeros faria a
   * lista acusar quem não passa por aquela fonte — e quase ninguém passa por
   * todas as oito.
   */
  const nomeDe = new Map(ativos.map((p) => [p.id, p]))
  const rank = (
    valores: Map<string | null, number>,
    porNome = false,
  ): { id: string; nome: string; cargo: string; hasAvatar: boolean; valor: number }[] =>
    ativos
      .map((p) => ({
        id: p.id, nome: p.name, cargo: p.jobTitle ?? 'Colaborador', hasAvatar: !!p.avatarUrl,
        valor: (porNome ? valores.get(normNome(p.name)) : p.nexusUserId ? valores.get(p.nexusUserId) : 0) ?? 0,
      }))
      .filter((x) => x.valor > 0)
      .sort((a, b) => b.valor - a.valor)
  void nomeDe

  const mHdResolvidos = new Map(gHd.map((r) => [r.nexusUserId, n(r._sum.resolved)]))
  const mClsConcl = new Map(gCls.map((r) => [r.nexusUserId, n(r._sum.courses) + n(r._sum.created)]))
  const mConsTudo = new Map(gCons.map((r) => [r.nexusUserId, n(r._sum.studies) + n(r._sum.tickets) + n(r._sum.messages) + n(r._sum.comments)]))
  const mGerServ = new Map(gGer.map((r) => [r.nexusUserId, n(r._sum.servicos) + n(r._sum.servCriados) + n(r._sum.protAbertos)]))
  const mChatConcl = new Map(gChat.map((r) => [r.nexusUserId, n(r._sum.chamadosConcluidos)]))
  const mCideAt = new Map(gCide.map((r) => [r.nexusUserId, n(r._sum.atividades)]))

  /* ⚠️⚠️ Ranking VAZIO é o caso COMUM, não a borda. Quem RESOLVE chamado de
     HelpDesk é o T.I; quem CONCLUI chamado no Chat é o setor que atende. Todo o
     resto da empresa só ABRE — então, para a maioria das combinações
     setor × fonte, ranquear pela grandeza "nobre" devolvia lista vazia e o
     cartão perdia metade da própria estrutura, sem dizer por quê.
     Cada fonte agora tem uma ALTERNATIVA, e o cartão diz por qual está
     ranqueando. */
  const mHdAbertos = new Map(gHd.map((r) => [r.nexusUserId, n(r._sum.opened)]))
  const mChatAbertos = new Map(gChat.map((r) => [r.nexusUserId, n(r._sum.chamadosAbertos)]))
  const mClsVideos = new Map(gCls.map((r) => [r.nexusUserId, n(r._sum.videos)]))
  const mGerKm = new Map(gGer.map((r) => [r.nexusUserId, n(r._sum.km)]))

  type Rk = { rotulo: string; gente: ReturnType<typeof rank> }
  const comAlternativa = (
    a: [string, Map<string | null, number>], b: [string, Map<string | null, number>], porNome = false,
  ): Rk => {
    const primeiro = rank(a[1], porNome)
    if (primeiro.length > 0) return { rotulo: a[0], gente: primeiro }
    return { rotulo: b[0], gente: rank(b[1], porNome) }
  }

  const rankings: Record<string, Rk> = {
    whatsapp: comAlternativa(['mais finalizou atendimento', mWppFin], ['mais abriu atendimento', mWppAb], true),
    helpdesk: comAlternativa(['mais resolveu', mHdResolvidos], ['mais abriu chamado', mHdAbertos]),
    classroom: comAlternativa(['mais concluiu e criou curso', mClsConcl], ['mais assistiu vídeo', mClsVideos]),
    consultoria: { rotulo: 'mais registrou atividade', gente: rank(mConsTudo) },
    cide: { rotulo: 'mais alterou cadastro', gente: rank(mCideAt) },
    gerencia: comAlternativa(['mais entregou e pediu', mGerServ], ['mais rodou (km)', mGerKm]),
    chat: comAlternativa(['mais concluiu chamado', mChatConcl], ['mais abriu chamado', mChatAbertos]),
    // ⚠️ A rádio NÃO tem ranking. Ver o comentário na tela: pódio de escuta,
    // com foto e posição, na mesma gramática dos cartões de entrega, numa tela
    // lida para decidir aumento.
    radio: { rotulo: '', gente: [] },
  }

  return NextResponse.json({
    pessoas: equipePessoas,
    rankings,
    setor: { id: dept.id, nome: dept.name, pelaDiretoria: dept.avaliadoPelaDiretoria },
    // Quem está lendo alcança a empresa toda? Muda o que se pode COBRAR dele na
    // faixa de ação. Vem do servidor porque é a régua que sabe, não a tela.
    ehAdmin: quem.escopo.tipo === 'tudo',
    turnover,
    serie,
    period, fromDay, toDay, dias, label: rotuloDoIntervalo(period, fromDay, toDay),
    equipe: { ativos: ativos.length, total: pessoas.length, comNexus: nx.length },

    classroom: { criados: n(cls._sum.created), assistidos: n(cls._sum.courses), videos: n(cls._sum.videos) },
    helpdesk: {
      abertos: n(hd._sum.opened),
      resolvidos: n(hd._sum.resolved) + n(hd._sum.formalized),
      segundos: n(hd._sum.resolvedSeconds),
      resolvidosNormais: n(hd._sum.resolved),
    },
    cide: { atividades: n(cide._sum.atividades) },
    consultoria: {
      estudos: n(cons._sum.studies), chamados: n(cons._sum.tickets),
      mensagens: n(cons._sum.messages), comentarios: n(cons._sum.comments),
    },
    radio: { horas: Math.round(n(radio._sum.seconds) / 3600), sessoes: n(radio._sum.sessions) },
    gerencia: {
      servicos: n(ger._sum.servicos), km: n(ger._sum.km), saidas: n(ger._sum.saidas),
      viagens: n(ger._sum.viagens), horasJornada: Math.round(n(ger._sum.jornadaMin) / 60),
      protAbertos: n(ger._sum.protAbertos), protAprovados: n(ger._sum.protAprovados),
      servCriados: n(ger._sum.servCriados), reagendados: n(ger._sum.reagendados), cancelados: n(ger._sum.cancelados),
    },
    chat: {
      msgCanais: n(chat._sum.msgCanais), msgDiretas: n(chat._sum.msgDiretas), msgChamados: n(chat._sum.msgChamados),
      chamadosAbertos: n(chat._sum.chamadosAbertos), chamadosConcluidos: n(chat._sum.chamadosConcluidos),
      segundos: n(chat._sum.segundosResolucao),
    },
    // As duas faces do chamado entre setores — que NÃO se somam.
    chamadosDoSetor: chatSetor ? {
      pediu: n(chatSetor._sum.pedidosAbertos), pediuConcluidos: n(chatSetor._sum.pedidosConcluidos),
      recebeu: n(chatSetor._sum.recebidosAbertos), recebeuConcluidos: n(chatSetor._sum.recebidosConcluidos),
      cancelados: n(chatSetor._sum.recebidosCancelados), segundos: n(chatSetor._sum.segundosResolucao),
    } : null,
    whatsapp: { abertos: n(wpp._sum.abertos), finalizados: n(wpp._sum.finalizados), handleSum: n(wpp._sum.handleSum) },
    assiduidade: {
      atrasos: n(assid._sum.atrasos), abonados: n(assid._sum.atrasosAbon),
      minutos: n(assid._sum.minutosAtraso), advertencias: adv,
      // ⚠️ FALTA não tem fonte no dump do Nexo → `null`, e a tela mostra "—".
      // Zero se leria como "ninguém faltou", que é o que não se sabe.
      faltas: null as number | null,
    },
    demografia: {
      idadeMedia: idades.length ? Math.round(idades.reduce((a, b) => a + b, 0) / idades.length) : null,
      idadesInformadas: idades.length,
      tempoCasaMeses: meses.length ? Math.round(meses.reduce((a, b) => a + b, 0) / meses.length) : null,
      generos,
    },
    avaliacao: {
      competencia: compAtual,
      publicadas: avals.length,
      avaliaveis,
      media: medias.length ? Math.round((medias.reduce((a, b) => a + b, 0) / medias.length) * 10) / 10 : null,
      porCriterio: [...porCriterio.entries()].map(([criterio, c]) => ({
        criterio, media: Math.round((c.soma / c.n) * 10) / 10, n: c.n,
      })),
    },
  })
}
