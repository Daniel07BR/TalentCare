import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { rangeDaRequisicao, diasNoIntervalo } from '@/lib/period-range'
import { quemEh } from '@/lib/avaliacoes/regua'
import { ENTREGAS_DEPT_ID } from '@/lib/entregas'

/* ============================================================
   A ÁREA DO SETOR ENTREGAS — a mensageria da casa, por pessoa e por dia.

   Lê o espelho `gerencia_daily` (7ª fonte), somado NO INTERVALO. Nenhum número
   desta rota é calculado em outro lugar: a nota do mês vem do que
   `calcular-mes.ts` GRAVOU, não de uma segunda conta ao vivo.

   ⚠️⚠️ O QUE ESTA ROTA DELIBERADAMENTE NÃO TRAZ, e por quê — os três estão no
   Relatório Geral da Gerência, que é a referência do dono, e sair de lá sem
   dizer isso faria a tela parecer incompleta por descuido:

   1. **Protocolos baixados por pessoa.** `protocols.delivered_by` é lixo do
      import do Access: medido em 09/09/2026, dos protocolos entregues em 2026,
      **27.488 saíram no nome de "Sistema"** e a maioria do resto está sem
      autor. Nenhum dos dois mensageiros aparece uma vez sequer. Creditar
      entrega a partir desse campo seria inventar autoria.

   2. **Taxa de conclusão como anel.** Em toda a base há **8 `pending` e 2
      `in_progress`**, todos do mês corrente: junho, julho e agosto fecharam
      100%. Um anel cravado em 100% não é medição, é enfeite — e a regra da
      casa é anel só com denominador real. A tela diz o fato em palavras.

   3. **A faixa de acumulado do sistema** (Protocolos Baixados / em Aberto /
      Serviços Pendentes / Total). No Relatório Geral ela é honesta porque diz
      que não obedece ao filtro; aqui ela teria DOIS desvios — não filtra por
      período E não filtra por setor —, e "27.488 protocolos" ao lado do nome
      de duas pessoas é o defeito dos "59 cursos" com outro rótulo.
   ============================================================ */

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const quem = await quemEh((session.user as { id: string }).id)
  if (!quem) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  /* ⚠️ A régua fina, igual à do relatório de setor: o middleware só conhece o
     caminho, e o caminho é o mesmo para quem quer que esteja logado. Entregas
     é chefiada pelo Legal (Evandro e Joice), então o vínculo gravado é o que
     manda — não o setor em que a pessoa senta. */
  const podeVer =
    quem.escopo.tipo === 'tudo' ||
    quem.escopo.avaliaDepartmentIds.includes(ENTREGAS_DEPT_ID) ||
    quem.departmentId === ENTREGAS_DEPT_ID
  if (!podeVer) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { period, fromDay, toDay } = rangeDaRequisicao(req)

  const dept = await prisma.department.findUnique({
    where: { id: ENTREGAS_DEPT_ID },
    select: { id: true, name: true },
  })
  if (!dept) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })

  /* A equipe. `foraDoDiretorio` fora — conta de sistema não é gente. Inativos
     entram para que uma saída recente não vire buraco silencioso na tela. */
  const equipe = await prisma.user.findMany({
    where: { departmentId: dept.id, origin: { in: ['nexus', 'staff'] }, foraDoDiretorio: false },
    select: {
      id: true, name: true, nexusUserId: true, active: true, jobTitle: true,
      avatarUrl: true, entryDate: true, leftAt: true,
    },
    orderBy: { name: 'asc' },
  })
  const nexusIds = equipe.map((p) => p.nexusUserId).filter((v): v is string => !!v)
  const personKeys = equipe.map((p) => p.nexusUserId ?? p.id)

  const [noPeriodo, historico, serie, notas, primeiroKm, primeiraSaida, ultimoDiaDaFonte] =
    await Promise.all([
      /* ── O que a pessoa fez NO INTERVALO ─────────────────────────────── */
      prisma.gerenciaDaily.groupBy({
        by: ['nexusUserId'],
        where: { nexusUserId: { in: nexusIds }, day: { gte: fromDay, lte: toDay } },
        _sum: {
          servicos: true, km: true, saidas: true, viagens: true,
          jornadaMin: true,
          protAbertos: true, protAprovados: true, servCriados: true,
          reagendados: true, cancelados: true, datasAlteradas: true,
        },
        _count: { _all: true },
      }),
      /* ⚠️⚠️ O ÚLTIMO DIA COM REGISTRO DE CADA UM, **sem filtro de período** —
         e é o bloco mais importante desta rota.

         Medido em 09/09/2026: o Gilberto tem 14.936 serviços no espelho e o
         último em **24/02/2026**. Em qualquer janela recente ele aparece com
         zero, e zero num painel de performance se lê como "não trabalhou".
         Ele não parou de trabalhar por escolha: parou de aparecer na fonte, e
         nenhum sistema da casa registra afastamento (o Nexus só tem
         ativo/inativo, e ele está ATIVO).

         Com a data ao lado, o zero deixa de acusar e vira uma pergunta que
         alguém pode responder. É a mesma decisão que o relatório de setor já
         tomou para a planilha de serviços do Legal. */
      prisma.gerenciaDaily.groupBy({
        by: ['nexusUserId'],
        where: { nexusUserId: { in: nexusIds } },
        _max: { day: true },
        _min: { day: true },
        _sum: { servicos: true, km: true },
      }),
      /* Conclusões por dia, no intervalo — a série do gráfico. */
      prisma.gerenciaDaily.groupBy({
        by: ['day'],
        where: { nexusUserId: { in: nexusIds }, day: { gte: fromDay, lte: toDay } },
        _sum: { servicos: true, km: true, saidas: true },
        orderBy: { day: 'asc' },
      }),
      /* ⚠️ A nota do mês vem do que foi GRAVADO por `calcular-mes.ts`. Não se
         recalcula aqui: duas contas do mesmo número acabam divergindo, e esta
         é a que decide aumento. Quem não tem linha recebe "—" com o motivo.

         ⚠️⚠️ E é a ÚLTIMA COMPETÊNCIA GRAVADA, não a corrente. O mês corrente
         só ganha valor depois de fechar e de alguém rodar a régua — em
         09/09/2026, `pontuacao_mes` de setembro está VAZIA para o setor
         inteiro. Cravar a competência atual faria a coluna mostrar "—" para
         todo mundo durante o mês todo, e "—" para todos se lê como "este setor
         não pontua", que é falso: o Elton tem 870 em agosto. A tela diz QUAL
         mês está mostrando. */
      prisma.pontuacaoMes.findMany({
        where: { personKey: { in: personKeys } },
        select: { personKey: true, competencia: true, pontos: true, origem: true, detalhe: true },
        orderBy: { competencia: 'desc' },
      }),
      /* ⚠️⚠️ AS JANELAS DA FONTE, MEDIDAS — não cravadas no texto.
         Serviço vem desde 2001 (import do Access); km, saídas e jornada só
         desde que o app passou a registrar. Cravar "17/07/2026" num texto
         funciona até o dia em que a origem mudar e ninguém reparar; medir o
         primeiro dia com valor acompanha a fonte sozinho. */
      prisma.gerenciaDaily.aggregate({ where: { km: { gt: 0 } }, _min: { day: true } }),
      prisma.gerenciaDaily.aggregate({ where: { saidas: { gt: 0 } }, _min: { day: true } }),
      /* ⚠️ Até quando a FONTE INTEIRA tem dado — não só esta equipe. É o que
         separa "esta pessoa parou" de "o sync parou": se o último dia da casa
         também for fevereiro, o problema é o cron, não o Gilberto. */
      prisma.gerenciaDaily.aggregate({ _max: { day: true } }),
    ])

  /* ⚠️⚠️ A FRAÇÃO DE TETO VEM À PARTE, e pode vir `null`.
     A coluna `jornada_teto_min` é nova e o `prisma db push` da produção ainda
     não rodou (o classificador barra o comando; ele está com o dono). Enquanto
     a coluna não existir, esta consulta falha — e a resposta certa para isso é
     **`null`, não zero**. Zero aqui diria "nenhuma hora veio do teto", que é a
     afirmação mais forte que a tela pode fazer sobre a jornada, e ela seria
     falsa: em agosto/2026 são 34% das horas do Elton. A tela mostra "—" e diz
     que o dado ainda não está disponível.
     ⚠️ É uma query separada de propósito: se ela cair, o resto da tela — que
     não depende da coluna nova — continua de pé. */
  let tetoPorPessoa: Map<string, number> | null = null
  try {
    const linhas = await prisma.$queryRaw<{ nexus_user_id: string; teto: bigint }[]>`
      SELECT nexus_user_id, COALESCE(SUM(jornada_teto_min), 0) AS teto
      FROM gerencia_daily
      WHERE day >= ${fromDay} AND day <= ${toDay}
        AND nexus_user_id = ANY(${nexusIds}::text[])
      GROUP BY nexus_user_id
    `
    tetoPorPessoa = new Map(linhas.map((l) => [l.nexus_user_id, Number(l.teto)]))
  } catch {
    tetoPorPessoa = null
  }

  const porPessoa = new Map(noPeriodo.map((r) => [r.nexusUserId, r]))
  const porHistorico = new Map(historico.map((r) => [r.nexusUserId, r]))
  /* A competência mais recente em que ALGUÉM do setor tem nota gravada, e as
     notas só dela — comparar pessoas em meses diferentes na mesma coluna seria
     um ranking entre janelas distintas. */
  const compMostrada = notas.length ? notas[0].competencia : null
  const notaDe = new Map(
    notas.filter((n) => n.competencia === compMostrada).map((n) => [n.personKey, n]),
  )

  const hoje = new Date().toISOString().slice(0, 10)
  const fonteAte = ultimoDiaDaFonte._max.day ?? null

  const pessoas = equipe.map((p) => {
    const k = p.nexusUserId
    const s = k ? porPessoa.get(k)?._sum : undefined
    const h = k ? porHistorico.get(k) : undefined
    const nota = notaDe.get(p.nexusUserId ?? p.id)
    const ultimoDia = h?._max.day ?? null

    /* ⚠️⚠️ "Sem registro desde X" NÃO é o mesmo que "não fez nada".
       A bandeira só acende quando a pessoa TEM história na fonte e a história
       parou ANTES da janela pedida — aí o zero da janela é ausência de fonte,
       não ausência de trabalho. Quem nunca teve linha nenhuma (o escritório,
       por exemplo) não entra nisso: para essa pessoa a Gerência simplesmente
       não é fonte, e dizer "parou" seria inventar um passado. */
    const fontePara = !!ultimoDia && ultimoDia < fromDay
    const diasParado = ultimoDia
      ? Math.round((new Date(`${hoje}T12:00:00Z`).getTime() - new Date(`${ultimoDia}T12:00:00Z`).getTime()) / 86400_000)
      : null

    return {
      id: p.id,
      nome: p.name,
      cargo: p.jobTitle ?? 'Colaborador',
      hasAvatar: !!p.avatarUrl,
      ativo: p.active,
      entrouEm: p.entryDate ? p.entryDate.toISOString().slice(0, 10) : null,
      saiuEm: p.leftAt ? p.leftAt.toISOString().slice(0, 10) : null,

      /* No período. `null` quando a pessoa não tem NENHUMA linha na fonte —
         não é zero, é "esta fonte não fala dela". */
      naFonte: !!h,
      diasComRegistro: (k ? porPessoa.get(k)?._count._all : 0) ?? 0,
      servicos: s?.servicos ?? 0,
      km: s?.km ?? 0,
      saidas: s?.saidas ?? 0,
      viagens: s?.viagens ?? 0,
      jornadaMin: s?.jornadaMin ?? 0,
      /* Quanto da jornada acima veio do TETO de 16 h em vez de um fim medido.
         `null` = a coluna ainda não existe no banco — não é "nenhuma". */
      jornadaTetoMin: tetoPorPessoa ? (k ? tetoPorPessoa.get(k) ?? 0 : 0) : null,
      protAbertos: s?.protAbertos ?? 0,
      protAprovados: s?.protAprovados ?? 0,
      servCriados: s?.servCriados ?? 0,
      reagendados: s?.reagendados ?? 0,
      cancelados: s?.cancelados ?? 0,
      datasAlteradas: s?.datasAlteradas ?? 0,

      /* A história, fora do filtro — o antídoto do zero mudo. */
      primeiroDia: h?._min.day ?? null,
      ultimoDia,
      servicosNaVida: h?._sum.servicos ?? 0,
      fontePara,
      diasParado: fontePara ? diasParado : null,

      /* A nota do mês corrente, se gravada. */
      pontos: nota?.pontos ?? null,
      pontosOrigem: nota?.origem ?? null,
      pontosDetalhe: nota?.detalhe ?? null,
    }
  })

  /* ⚠️ Os totais somam SÓ quem a fonte cobre na janela. Somar quem está parado
     como zero baixaria a média do setor por falta de dado. */
  const cobertos = pessoas.filter((p) => p.diasComRegistro > 0)
  const soma = (f: (p: (typeof pessoas)[number]) => number) => pessoas.reduce((a, p) => a + f(p), 0)

  return NextResponse.json({
    period, fromDay, toDay,
    dias: diasNoIntervalo(fromDay, toDay),
    setor: { id: dept.id, nome: dept.name },
    competencia: compMostrada,
    pessoas,
    totais: {
      servicos: soma((p) => p.servicos),
      km: soma((p) => p.km),
      saidas: soma((p) => p.saidas),
      viagens: soma((p) => p.viagens),
      jornadaMin: soma((p) => p.jornadaMin),
      jornadaTetoMin: tetoPorPessoa ? soma((p) => p.jornadaTetoMin ?? 0) : null,
      protAbertos: soma((p) => p.protAbertos),
      protAprovados: soma((p) => p.protAprovados),
      servCriados: soma((p) => p.servCriados),
      reagendados: soma((p) => p.reagendados),
      cancelados: soma((p) => p.cancelados),
      datasAlteradas: soma((p) => p.datasAlteradas),
      /** Quantos da equipe a fonte cobriu NESTA janela — o denominador honesto. */
      pessoasComRegistro: cobertos.length,
      pessoasNaEquipe: pessoas.filter((p) => p.ativo).length,
    },
    serie: serie.map((d) => ({
      day: d.day,
      servicos: d._sum.servicos ?? 0,
      km: d._sum.km ?? 0,
      saidas: d._sum.saidas ?? 0,
    })),
    cobertura: {
      /** Primeiro dia com km/saída no espelho — quando o app começou a medir. */
      kmDesde: primeiroKm._min.day ?? null,
      saidasDesde: primeiraSaida._min.day ?? null,
      /** Último dia com dado na fonte INTEIRA (todas as pessoas). */
      fonteAte,
      /** A fonte inteira parou antes da janela? Aí o problema é o sync. */
      fonteParada: !!fonteAte && fonteAte < fromDay,
    },
  })
}
