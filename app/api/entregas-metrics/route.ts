import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { rangeDaRequisicao, diasNoIntervalo } from '@/lib/period-range'
import { quemEh } from '@/lib/avaliacoes/regua'
import { competenciaAnterior } from '@/lib/avaliacoes/criterios'
import { montar } from '@/lib/servicos/calcular-mes'
import { competenciaAtual } from '@/lib/servicos/pontuacao'
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

  /* ⚠️ A régua fina: o middleware só conhece o caminho, e o caminho é o mesmo
     para quem quer que esteja logado. Entregas é chefiada pelo **Legal**
     (Evandro e Joice), então quem manda é o VÍNCULO gravado.

     ⚠️⚠️ E NÃO entra "eu sento neste setor". `lib/alcance.ts` recusa esse
     critério com todas as letras — *"o setor DELE não entra por ser dele… a Ana
     Carolina, Colaborador do Fiscal, alcançaria as 31 pessoas do setor só por
     sentar lá"*. A primeira versão desta rota tinha a cláusula, herdada por
     cópia, e ela era inerte só por acidente (os dois do setor são
     `SEM_PERMISSAO`); bastaria um deles virar sub-encarregado para entrar pela
     porta errada. Achado do crítico, 09/09/2026. */
  const podeVer =
    quem.escopo.tipo === 'tudo' ||
    quem.escopo.avaliaDepartmentIds.includes(ENTREGAS_DEPT_ID)
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

  /* ⚠️ A MESMA derivação do relatório de setor (`dept-metrics`): quando o filtro
     cabe num mês só (o card de meses, ou um intervalo do calendário dentro de um
     mês), a competência é aquele mês; nos presets que cruzam meses fica o último
     mês FECHADO. Copiar a linha é ruim, mas divergir dela é pior — e é o que
     estava acontecendo. */
  const compDoFiltro = fromDay.slice(0, 7) === toDay.slice(0, 7) ? fromDay.slice(0, 7) : competenciaAnterior()
  const mesCorrente = compDoFiltro === competenciaAtual()

  const [noPeriodo, historico, serie, notas, primeiroKm, primeiraSaida, primeiroServico, ultimoDiaDaFonte] =
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
      /* ⚠️⚠️ A NOTA DO MÊS, PELA MESMA COMPETÊNCIA E PELA MESMA CONTA DO
         RELATÓRIO DE SETOR — e as duas coisas foram erro meu antes.

         A primeira versão lia só o que estava GRAVADO, na competência
         CORRENTE. Setembro nunca tem valor gravado (`gravarMes` não grava mês
         aberto, decisão de 08/09), então a coluna mostrava "— sem pontuação"
         para os dois o mês inteiro — e "sem pontuação" se lê como "não
         pontuou", não como "setembro só fecha no dia 30".

         Pior: `/departamentos/<id>`, que este botão liga a esta tela, deriva a
         competência DO FILTRO e chama `montar(parcial)`. Com "30 dias" o
         relatório dizia **ago/2026, Elton 870** e esta tela dizia **set/2026,
         Elton "—"**: mesma pessoa, mesmo instante, mesmo filtro, dois números.

         O argumento de "não recalcular para não ter duas contas" estava
         invertido: `montar()` **é** a régua única. Chamá-la é o caminho de uma
         régua só; não chamá-la foi o que produziu a divergência. Achado do
         crítico, 09/09/2026. */
      prisma.pontuacaoMes.findMany({
        where: { personKey: { in: personKeys }, competencia: compDoFiltro },
        select: { personKey: true, competencia: true, pontos: true, origem: true, detalhe: true },
      }),
      /* ⚠️⚠️ AS JANELAS DA FONTE, MEDIDAS — não cravadas no texto.
         Serviço vem desde 2001 (import do Access); km, saídas e jornada só
         desde que o app passou a registrar. Cravar "17/07/2026" num texto
         funciona até o dia em que a origem mudar e ninguém reparar; medir o
         primeiro dia com valor acompanha a fonte sozinho. */
      prisma.gerenciaDaily.aggregate({ where: { km: { gt: 0 } }, _min: { day: true } }),
      prisma.gerenciaDaily.aggregate({ where: { saidas: { gt: 0 } }, _min: { day: true } }),
      /* ⚠️ O "2001" do texto era CRAVADO no JSX, com a condição olhando outro
         valor. A rota mede — o texto só repete o que ela disser. */
      prisma.gerenciaDaily.aggregate({ where: { servicos: { gt: 0 } }, _min: { day: true } }),
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
  const notaDe = new Map(notas.map((n) => [n.personKey, n]))
  /* Sem valor gravado na competência: a PRÉVIA sai da mesma lib que grava
     (`montar`), como no relatório de setor. Parcial no mês corrente, prévia num
     mês fechado ainda não rodado. Quem não recebe nota entra com o MOTIVO, não
     com zero. */
  const semNotaDe = new Map<string, string>()
  let motivoDaCompetencia: string | null = null
  let pontuacaoParcial = false
  let pontuacaoPrevia = false
  /* ⚠️ FALHA EM VOZ ALTA, como no relatório de setor: a prévia se desliga assim
     que existe UM valor gravado na competência, e sem este aviso as outras
     pessoas voltam a "—" sem nenhuma mensagem. Hoje é o caso exato do setor —
     agosto tem nota gravada só do Elton —, e "—" mudo ao lado de 870 se lê como
     "o outro tirou zero". Misturar mês gravado com prévia na mesma coluna
     comparativa seria pior; dizer que a prévia está desligada, não. */
  const ativosNaEquipe = equipe.filter((p) => p.active).length
  if (notas.length > 0 && notas.length < ativosNaEquipe) {
    motivoDaCompetencia =
      `${notas.length} de ${ativosNaEquipe} pessoas têm valor gravado em ${compDoFiltro} — `
      + 'enquanto houver valor gravado, a prévia ao vivo das demais fica desligada'
  }
  if (notas.length === 0) {
    const r = await montar(ENTREGAS_DEPT_ID, compDoFiltro, { parcial: mesCorrente })
    if ('erro' in r) {
      /* ⚠️ A recusa da lib é escrita para quem PODE criar a régua (o gestor do
         setor); quem lê isto pode ser a Diretoria, para quem "crie a régua" não
         é uma instrução executável. */
      motivoDaCompetencia = (r.erro ?? '').includes('régua')
        ? 'este setor ainda não tem régua de pontuação vigente nesta competência'
        : r.erro ?? null
    } else {
      pontuacaoParcial = r.parcial
      pontuacaoPrevia = !r.parcial
      for (const l of r.linhas) {
        if (l.semNota) { semNotaDe.set(l.personKey, l.semNota); continue }
        notaDe.set(l.personKey, {
          personKey: l.personKey, competencia: compDoFiltro,
          pontos: l.pontos, origem: 'previa', detalhe: l.detalhe,
        })
      }
    }
  }

  const hoje = new Date().toISOString().slice(0, 10)
  const fonteAte = ultimoDiaDaFonte._max.day ?? null

  const pessoas = equipe.map((p) => {
    const k = p.nexusUserId
    const s = k ? porPessoa.get(k)?._sum : undefined
    const h = k ? porHistorico.get(k) : undefined
    const nota = notaDe.get(p.nexusUserId ?? p.id)
    const ultimoDia = h?._max.day ?? null

    /* ⚠️⚠️ "Sem registro desde X" NÃO é o mesmo que "não fez nada" — e a
       primeira régua desta bandeira estava ERRADA.

       Ela era `ultimoDia < fromDay`: a pessoa só ficava marcada quando a
       história dela terminava ANTES da janela. Em "Ano corrente" o último dia
       do Gilberto (24/02/2026) cai DENTRO da janela, então a bandeira apagava
       — e a tela mostrava "2 de 2 pessoas tiveram registro", com a linha dele
       imprimindo 153 serviços ao lado dos 1.183 do Elton, sem uma palavra
       sobre os seis meses e meio de silêncio. **Justamente no filtro que a
       chefia abre para comparar os dois.** Achado do crítico, 09/09/2026.

       A régua certa não olha a JANELA: olha a FONTE. Quem está escuro está
       escuro em todo filtro. A lacuna é entre o último dia da pessoa e o
       último dia que a fonte tem para o setor — se a fonte andou meses sem
       ela, o silêncio é dela, não do recorte.

       ⚠️ O corte de 30 dias não é gosto: a unidade de decisão deste sistema é
       o MÊS (a nota é mensal, a régua é por competência). Um mensageiro sem
       um único registro num mês inteiro que a fonte cobriu é a anomalia que
       vale contar. O texto na tela mostra a lacuna MEDIDA, nunca o limiar. */
    const lacuna = ultimoDia && fonteAte
      ? Math.round((new Date(`${fonteAte}T12:00:00Z`).getTime() - new Date(`${ultimoDia}T12:00:00Z`).getTime()) / 86400_000)
      : null
    const fontePara = lacuna != null && lacuna >= 30
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
      /** Dias em que a FONTE teve registro (de qualquer um do setor) na janela —
       *  o denominador honesto de "esta pessoa cobre a janela inteira?". */
      diasDaFonteNaJanela: serie.length,
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
      /** Por que esta pessoa NÃO recebe nota — o "—" tem de dizer o motivo. */
      semNota: semNotaDe.get(p.nexusUserId ?? p.id) ?? null,
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
    competencia: compDoFiltro,
    pontuacao: {
      parcial: pontuacaoParcial,
      previa: pontuacaoPrevia,
      motivo: motivoDaCompetencia,
    },
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
      /** Primeiro dia com serviço — o outro extremo da janela desigual. */
      servicosDesde: primeiroServico._min.day ?? null,
      /* ⚠️⚠️ A JANELA PEDIDA CRUZA A BORDA DO QUE O APP MEDE?
         Sem isto a tela afirmava, sobre junho/2026, "Jornada 0 h — toda medida
         entre um início e um fim registrados" para um homem que rodou 12 dias e
         concluiu 156 serviços. Km escapava por ter a ressalva; jornada e saídas
         não tinham nenhuma. É a regra do `null` outra vez: o zero afirmava algo
         sobre a pessoa quando era a fonte que não existia ainda.
         - `fora`  = a janela inteira é anterior ao app  → a tela mostra "—"
         - `dias…` = quantos dias da janela o app cobre  → a tela diz sobre
                     quantos dias de quantos o número fala */
      appFora: !!primeiroKm._min.day && toDay < primeiroKm._min.day,
      appDiasNaJanela: primeiroKm._min.day
        ? Math.max(0, diasNoIntervalo(
            fromDay > primeiroKm._min.day ? fromDay : primeiroKm._min.day,
            toDay,
          ))
        : 0,
      /** Último dia com dado na fonte INTEIRA (todas as pessoas). */
      fonteAte,
      /** A fonte inteira parou antes da janela? Aí o problema é o sync. */
      fonteParada: !!fonteAte && fonteAte < fromDay,
    },
  })
}
