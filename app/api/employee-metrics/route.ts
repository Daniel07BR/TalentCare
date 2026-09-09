import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { rangeDaRequisicao } from '@/lib/period-range'
import { quemEh, podeVer } from '@/lib/avaliacoes/regua'
import { competenciaAnterior } from '@/lib/avaliacoes/criterios'
import { montar } from '@/lib/servicos/calcular-mes'
import { competenciaAtual } from '@/lib/servicos/pontuacao'
import { coberturaDoPonto, janelaTemDado, motivoSemPonto } from '@/lib/ponto-cobertura'
import type { Period } from '@/lib/mock/dashboard'

// Métricas REAIS de UMA pessoa no PERÍODO (rádio, ClassRoom, WhatsApp), lidas dos
// espelhos diários locais. Alimenta a ficha (que respeita o filtro de dias).
function fmtDur(sec: number): string {
  if (!sec) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}min` : `${m}min`
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id') ?? ''
  const { period, fromDay, toDay } = rangeDaRequisicao(req)
  const range = { day: { gte: fromDay, lte: toDay } }
  const cobPonto = await coberturaDoPonto()

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, nexusUserId: true, name: true, departmentId: true },
  })
  if (!user) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })

  /*
   * ⚠️⚠️ A RÉGUA FINA. Esta rota expõe os números de UMA pessoa por `?id=`, e o
   * gate do middleware não alcança isso: ele só conhece o caminho, e o caminho é
   * o mesmo para todo mundo. Sem esta linha, no dia em que o sistema abrir, um
   * gestor do Fiscal puxaria a ficha de qualquer pessoa do Contábil trocando o
   * id na URL — e nada apareceria em log nenhum.
   */
  const quem = await quemEh((session.user as { id: string }).id)
  if (!quem || !podeVer(quem, user)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  // personKey da assiduidade/disciplina = nexus_user_id ?? id (cobre STAFF).
  const personKey = user.nexusUserId ?? id

  /* A competência de que a POSIÇÃO fala — a mesma régua do relatório de setor. */
  const compFicha = fromDay.slice(0, 7) === toDay.slice(0, 7) ? fromDay.slice(0, 7) : competenciaAnterior()

  const [radio, classroom, wpp, cons, hd, cd, gd, ct, assid, assidDias, advert, gLgpdPessoa, servicos, servTotal, pontuacoes, discLista] = await Promise.all([
    user.nexusUserId
      ? prisma.radioDaily.aggregate({ where: { nexusUserId: user.nexusUserId, ...range }, _sum: { seconds: true, sessions: true }, _max: { day: true } })
      : null,
    user.nexusUserId
      ? prisma.classroomDaily.aggregate({ where: { nexusUserId: user.nexusUserId, ...range }, _sum: { videos: true, courses: true, created: true } })
      : null,
    /* ⚠️⚠️ Casava por nome EXATO. O resto do sistema (`score-metrics`,
       `dept-metrics`) casa NORMALIZADO, e o `FONTES.md` diz que é normalizado:
       um acento diferente entre o cadastro do Nexus e o espelho do Painel fazia
       a ficha da atendente dizer "Sem atividade no WhatsApp" enquanto o
       relatório do setor a mostrava em 1º lugar com 274 finalizados.
       A normalização é em JS, como nas outras rotas — o Postgres da casa não tem
       `unaccent`, e criar a extensão só para isto seria mais superfície. */
    prisma.whatsappAttendantDaily.groupBy({
      by: ['name'], where: range, _sum: { abertos: true, finalizados: true, handleSum: true },
    }),
    user.nexusUserId
      ? prisma.consultoriaDaily.aggregate({ where: { nexusUserId: user.nexusUserId, ...range }, _sum: { studies: true, tickets: true, messages: true, comments: true } })
      : null,
    user.nexusUserId
      ? prisma.helpdeskDaily.aggregate({ where: { nexusUserId: user.nexusUserId, ...range }, _sum: { opened: true, resolved: true, formalized: true, resolvedSeconds: true } })
      : null,
    user.nexusUserId
      ? prisma.cideDaily.aggregate({ where: { nexusUserId: user.nexusUserId, ...range }, _sum: { empresas: true } })
      : null,
    // GERÊNCIA no período: execução (saídas) + escritório (demanda) juntas.
    user.nexusUserId
      ? prisma.gerenciaDaily.aggregate({
          where: { nexusUserId: user.nexusUserId, ...range },
          _sum: {
            servicos: true, km: true, saidas: true, viagens: true, jornadaMin: true,
            protAbertos: true, protAprovados: true, servCriados: true,
            reagendados: true, cancelados: true, datasAlteradas: true,
          },
        })
      : null,
    // CHAT INTERNO no período: conversa (canais/diretas/chamados) + chamados.
    user.nexusUserId
      ? prisma.chatDaily.aggregate({
          where: { nexusUserId: user.nexusUserId, ...range },
          _sum: {
            msgCanais: true, msgDiretas: true, msgChamados: true,
            chamadosAbertos: true, chamadosAssumidos: true, chamadosConcluidos: true,
            segundosResolucao: true,
          },
        })
      : null,
    // ASSIDUIDADE (ponto) no período: soma atrasos/minutos + advertências no range.
    prisma.assiduidadeDaily.aggregate({
      where: { personKey, ...range },
      _sum: { atrasos: true, atrasosAbon: true, minutosAtraso: true, atrasosAte5: true, atrasosAte30: true, atrasosMais30: true },
    }),
    /* ⚠️⚠️ OS DIAS DO PERÍODO, para o calendário de ocorrências.
       Ele desenhava sempre as últimas 18 semanas, vindas do dataset do cliente,
       enquanto TODOS os números ao lado dele obedeciam ao filtro — filtrar
       "01 a 31 de agosto" trocava os KPIs e deixava o mapa em maio–setembro. É a
       regra (b) da casa: número ao lado do filtro obedece ao filtro.
       ⚠️ Só vêm os dias COM ocorrência (é o que a tabela guarda), então um ano
       inteiro da pessoa mais atrasada são ~57 linhas — não pesa no payload. */
    prisma.assiduidadeDaily.findMany({
      where: { personKey, ...range },
      select: { day: true, atrasos: true, atrasosAbon: true, minutosAtraso: true, atrasosAte5: true, atrasosAte30: true, atrasosMais30: true },
      orderBy: { day: 'asc' },
    }),
    prisma.disciplinaEvento.count({ where: { personKey, tipo: 'advertencia', data: { gte: fromDay, lte: toDay } } }),
    /* ⚠️ A falta GRAVE do período, por tipo. Fora do bloco de cobertura do
       ponto: a medida de LGPD não vem do dump do Nexo. */
    prisma.disciplinaEvento.groupBy({
      by: ['tipo'],
      where: { personKey, tipo: { in: ['lgpd_advertencia', 'lgpd_suspensao'] }, data: { gte: fromDay, lte: toDay } },
      _count: { _all: true },
    }),
    /* ⚠️ A LISTA com o motivo sai daqui, e não do dataset do cliente: esta rota
       confere `podeVer`; aquele dataset viaja inteiro no payload de toda página.
       Contagem pode viajar; o texto da advertência, não. */
    /* SERVIÇOS da planilha do setor (11ª fonte). Vêm por aqui e não por rota
       nova porque a ficha evita fetch extra de propósito — ver o comentário no
       topo dela. ⚠️ `personKey` não nulo: linha sem dono conta para o setor e
       não credita ninguém, então não pode aparecer na ficha de alguém. */
    prisma.servicoDepto.findMany({
      where: { personKey, dia: { gte: fromDay, lte: toDay } },
      select: { dia: true, status: true, tarefa: true, minutos: true },
    }),
    /* ⚠️⚠️ O TOTAL da pessoa na planilha, sem filtro. Sem ele a ficha mostra o
       recorte de 30 dias e quem subiu 18 meses de arquivo pergunta onde foram
       parar os dados — foi exatamente o que aconteceu em 04/09/2026. O número
       do período estava certo e mesmo assim enganava, porque nada dizia que era
       um recorte. */
    prisma.servicoDepto.count({ where: { personKey, status: 'concluida' } }),
    /* A pontuação mensal. NÃO se recorta por período: é mensal por natureza, e a
       tela diz isso — mesma regra da avaliação mensal no `PERIODO-E-DEPLOY.md`. */
    prisma.pontuacaoMes.findMany({
      where: { personKey }, orderBy: { competencia: 'asc' },
      select: { competencia: true, pontos: true, origem: true, detalhe: true },
    }),
    /* ⚠️⚠️ TODOS OS TIPOS, não só `advertencia`. Este filtro é anterior à fonte
       de LGPD e o commit que a integrou não passou por aqui: o resultado é que a
       ficha — para onde o painel de Suspensões manda o gestor clicar — não
       recebia uma linha sequer da medida, e o ramo que a rotula na tela era
       código morto. É a regra do `FONTES.md` cobrando o preço: integrar a fonte
       não basta, percorra TODOS os consumidores. (Achado do crítico, 09/09.) */
    prisma.disciplinaEvento.findMany({
      where: { personKey },
      select: { data: true, motivo: true, dias: true, tipo: true, source: true },
      orderBy: { data: 'desc' },
    }),
  ])

  const rSec = radio?._sum.seconds ?? 0
  const cVid = classroom?._sum.videos ?? 0
  const cCur = classroom?._sum.courses ?? 0
  const cCri = classroom?._sum.created ?? 0
  const normNome = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  const meuNome = normNome(user.name)
  const minhas = wpp.filter((r) => normNome(r.name) === meuNome)
  const wAb = minhas.reduce((a, r) => a + (r._sum.abertos ?? 0), 0)
  const wFi = minhas.reduce((a, r) => a + (r._sum.finalizados ?? 0), 0)
  const wHs = minhas.reduce((a, r) => a + (r._sum.handleSum ?? 0), 0)
  const cStu = cons?._sum.studies ?? 0
  const cTic = cons?._sum.tickets ?? 0
  const cMsg = cons?._sum.messages ?? 0
  const cCom = cons?._sum.comments ?? 0
  const cTotal = cStu + cTic + cMsg + cCom
  const hOpen = hd?._sum.opened ?? 0
  const hResNormal = hd?._sum.resolved ?? 0
  const hForm = hd?._sum.formalized ?? 0
  const hRes = hResNormal + hForm // formalizado conta como resolvido
  const hSec = hd?._sum.resolvedSeconds ?? 0

  const tCan = ct?._sum.msgCanais ?? 0
  const tDir = ct?._sum.msgDiretas ?? 0
  const tCha = ct?._sum.msgChamados ?? 0
  const tAb = ct?._sum.chamadosAbertos ?? 0
  const tAs = ct?._sum.chamadosAssumidos ?? 0
  const tCo = ct?._sum.chamadosConcluidos ?? 0
  const tSec = ct?._sum.segundosResolucao ?? 0

  const lgpdSusp = gLgpdPessoa.find((r) => r.tipo === 'lgpd_suspensao')?._count._all ?? 0
  const lgpdAdv = gLgpdPessoa.find((r) => r.tipo === 'lgpd_advertencia')?._count._all ?? 0

  /* ── QUANDO CADA FONTE VIU ESTA PESSOA PELA ÚLTIMA VEZ ───────────────────
     ⚠️⚠️ Existe para separar "ela parou" de "a FONTE dela parou" — a dívida que
     o `FONTES.md` registra desde 03/09: o `gerencia_daily` do Gilberto termina
     em 24/02/2026 com o espelho fresco (os outros até 03/09), e ele cai no fundo
     do ranking por "0 atividade no mês". Numa lista de piores, é a diferença
     entre uma conversa e uma injustiça.

     ⚠️ NÃO acompanha o filtro, de propósito: a pergunta é "quando foi a última
     vez", e recortá-la pela janela responderia outra coisa. A tela diz isso.

     ⚠️ Duas datas por fonte, e é o par que informa: a da PESSOA sozinha não
     distingue os dois casos. Só comparada com a da FONTE ela vira notícia.

     ⚠️ WhatsApp casa por NOME (a fonte não tem `nexusUserId`) — a mesma régua
     do resto do painel, com a normalização de acento e caixa. */
  const ultimaAtividade = await (async () => {
    const nx = user.nexusUserId
    const nome = user.name
    const linhas = await prisma.$queryRaw<{ fonte: string; dela: string | null; fonte_ate: string | null }[]>`
      SELECT 'ClassRoom' AS fonte,
             (SELECT MAX(day) FROM classroom_daily WHERE nexus_user_id = ${nx}) AS dela,
             (SELECT MAX(day) FROM classroom_daily) AS fonte_ate
      UNION ALL SELECT 'HelpDesk',
             (SELECT MAX(day) FROM helpdesk_daily WHERE nexus_user_id = ${nx}),
             (SELECT MAX(day) FROM helpdesk_daily)
      UNION ALL SELECT 'CIDE',
             (SELECT MAX(day) FROM cide_daily WHERE nexus_user_id = ${nx}),
             (SELECT MAX(day) FROM cide_daily)
      UNION ALL SELECT 'Consultoria Plus',
             (SELECT MAX(day) FROM consultoria_daily WHERE nexus_user_id = ${nx}),
             (SELECT MAX(day) FROM consultoria_daily)
      UNION ALL SELECT 'Gerência',
             (SELECT MAX(day) FROM gerencia_daily WHERE nexus_user_id = ${nx}),
             (SELECT MAX(day) FROM gerencia_daily)
      UNION ALL SELECT 'Chat Interno',
             (SELECT MAX(day) FROM chat_daily WHERE nexus_user_id = ${nx}),
             (SELECT MAX(day) FROM chat_daily)
      UNION ALL SELECT 'Rádio',
             (SELECT MAX(day) FROM radio_daily WHERE nexus_user_id = ${nx}),
             (SELECT MAX(day) FROM radio_daily)
      UNION ALL SELECT 'Painel de Atendimento',
             (SELECT MAX(day) FROM whatsapp_attendant_daily
               WHERE lower(translate(name,'ÁÀÃÂÉÊÍÓÔÕÚÇáàãâéêíóôõúç','AAAAEEIOOOUCaaaaeeioooucc'))
                   = lower(translate(${nome},'ÁÀÃÂÉÊÍÓÔÕÚÇáàãâéêíóôõúç','AAAAEEIOOOUCaaaaeeioooucc'))),
             (SELECT MAX(day) FROM whatsapp_attendant_daily)
      UNION ALL SELECT 'Planilha do setor',
             (SELECT MAX(dia) FROM servico_depto WHERE person_key = ${personKey}),
             (SELECT MAX(dia) FROM servico_depto)
    `
    return linhas.map((l) => ({ fonte: l.fonte, dela: l.dela, fonteAte: l.fonte_ate }))
  })()

  /* ── ONDE ELA ESTÁ NO SETOR, na competência do filtro ────────────────────
     ⚠️ Comparada só com quem PONTUA no setor naquele mês. Quem não tem nota
     (chefia, sem crédito, competência não rodada) não entra no denominador:
     "3º de 7 que pontuam" é uma frase verdadeira; "3º de 21" contaria como
     concorrente quem o sistema decidiu não pontuar. */
  const gravadoNoSetor = user.departmentId
    ? await prisma.pontuacaoMes.findMany({
        where: { departmentId: user.departmentId, competencia: compFicha },
        select: { personKey: true, pontos: true },
      })
    : []

  /* ⚠️⚠️ O SISTEMA TRABALHA COM O QUE TEM (pedido do dono, 09/09/2026).
     Antes isto lia SÓ o gravado, e `pontuacao_mes` só ganha linha quando alguém
     roda a competência — então o mês corrente inteiro mostrava "—" na ficha,
     dizendo "ninguém do Legal pontuou em setembro" enquanto as oito pessoas já
     tinham atividade registrada naquele dia. A planilha de serviços sobe no fim
     do mês; a atividade dos sistemas do Nexus é ao vivo, e ela basta para dizer
     onde a pessoa está AGORA.

     ⚠️ A conta é a MESMA do relatório de setor e do CLI (`montar`) — não uma
     segunda régua. Parcial no mês corrente (sem bônus de mês limpo, sem gravar);
     prévia num mês fechado que ninguém rodou.

     ⚠️ E quem não recebe nota (encarregado, ou sem fonte de crédito no mês) não
     entra nem como concorrente nem como colocado: `semNota` é respeitado aqui
     como na lista do setor, senão a ficha diria uma posição que a outra tela
     nega. */
  const mesCorrente = compFicha === competenciaAtual()
  let calculado: { personKey: string; pontos: number }[] = []
  let estado: 'gravado' | 'parcial' | 'previa' | 'indisponivel' = gravadoNoSetor.length ? 'gravado' : 'indisponivel'
  let motivoSemCalculo: string | null = null
  let semNotaDela: string | null = null

  if (!gravadoNoSetor.length && user.departmentId) {
    const r = await montar(user.departmentId, compFicha, { parcial: mesCorrente })
    if ('erro' in r) {
      motivoSemCalculo = (r.erro ?? '').includes('régua')
        ? 'este setor ainda não tem régua de pontuação'
        : r.erro ?? null
    } else {
      calculado = r.linhas.filter((l) => !l.semNota).map((l) => ({ personKey: l.personKey, pontos: l.pontos }))
      semNotaDela = r.linhas.find((l) => l.personKey === personKey)?.semNota ?? null
      estado = r.parcial ? 'parcial' : 'previa'
    }
  }

  const doSetor = gravadoNoSetor.length ? gravadoNoSetor : calculado
  const ordenados = [...doSetor].sort((a, b) => b.pontos - a.pontos)
  const idx = ordenados.findIndex((p) => p.personKey === personKey)
  /* ⚠️ Soma de TODOS os meses gravados — não acompanha o filtro, e a tela diz. */
  const acumulado = pontuacoes.reduce((a, p) => a + p.pontos, 0)
  const posicao = {
    competencia: compFicha,
    /** `null` = ela não pontua nesta competência. Nunca o último lugar. */
    posicao: idx >= 0 ? idx + 1 : null,
    de: ordenados.length,
    pontosNoMes: idx >= 0 ? ordenados[idx].pontos : null,
    /* ⚠️ Os pontos do 1º colocado — é o DENOMINADOR do anel. Sem ele o arco não
       poderia significar nada, e anel que enche por enfeite é a regra (d) da
       casa quebrada: gráfico sem dado atrás. */
    pontosDoPrimeiro: ordenados.length ? ordenados[0].pontos : null,
    acumulado,
    /** Quantos meses entraram no acumulado — sem isso "1.459" não tem escala. */
    meses: pontuacoes.length,
    /** De onde saiu a posição: mês gravado, parcial ao vivo, prévia de mês
     *  fechado, ou nada. A tela TEM de dizer — um parcial exibido como número
     *  fechado é menor do que será, e quem lê conclui que a pessoa produziu
     *  menos. */
    estado,
    /** Por que ELA não pontua (chefia / sem-credito), quando é o caso. */
    semNota: semNotaDela,
    /** Por que o setor inteiro não tem número (sem régua, mês não coberto…). */
    motivo: motivoSemCalculo,
  }

  return NextResponse.json({
    period, fromDay, toDay,
    radio: { horas: Math.round(rSec / 3600), sessoes: radio?._sum.sessions ?? 0, ultimaDay: radio?._max.day ?? null },
    classroom: { videos: cVid, courses: cCur, created: cCri, total: cCur + cCri },
    whatsapp: { has: wAb > 0 || wFi > 0, abertos: wAb, finalizados: wFi, tempoMedio: fmtDur(wFi ? Math.round(wHs / wFi) : 0) },
    consultoria: { has: cTotal > 0, studies: cStu, tickets: cTic, messages: cMsg, comments: cCom, total: cTotal },
    helpdesk: { has: hOpen > 0 || hRes > 0, opened: hOpen, resolved: hRes, formalized: hForm, tempoMedio: fmtDur(hResNormal ? Math.round(hSec / hResNormal) : 0) },
    cide: { has: (cd?._sum.empresas ?? 0) > 0, atividades: cd?._sum.empresas ?? 0 },
    // Duas faces separadas: `hasSaida` só é true p/ quem realmente saiu na rua,
    // senão a ficha de quem só abre protocolo mostraria um card de mensageiro.
    gerencia: {
      servicos: gd?._sum.servicos ?? 0,
      km: gd?._sum.km ?? 0,
      saidas: gd?._sum.saidas ?? 0,
      viagens: gd?._sum.viagens ?? 0,
      jornadaMin: gd?._sum.jornadaMin ?? 0,
      protAbertos: gd?._sum.protAbertos ?? 0,
      protAprovados: gd?._sum.protAprovados ?? 0,
      servCriados: gd?._sum.servCriados ?? 0,
      reagendados: gd?._sum.reagendados ?? 0,
      cancelados: gd?._sum.cancelados ?? 0,
      datasAlteradas: gd?._sum.datasAlteradas ?? 0,
      hasSaida: (gd?._sum.servicos ?? 0) > 0 || (gd?._sum.saidas ?? 0) > 0 || (gd?._sum.km ?? 0) > 0,
      hasEscritorio: (gd?._sum.protAbertos ?? 0) > 0 || (gd?._sum.protAprovados ?? 0) > 0
        || (gd?._sum.servCriados ?? 0) > 0 || (gd?._sum.reagendados ?? 0) > 0 || (gd?._sum.cancelados ?? 0) > 0
        || (gd?._sum.datasAlteradas ?? 0) > 0,
    },
    // CHAT INTERNO — duas faces separadas na ficha, como na Gerência: CONVERSA
    // (quanto se falou) e CHAMADO (o que foi pedido e entregue). `hasConversa` e
    // `hasChamado` existem para a ficha de quem só conversa não mostrar um
    // bloco de chamados zerado, que se lê como "não atendeu nada".
    //
    // ⚠️ `tempoMedio` sai de SEGUNDOS DE EXPEDIENTE (08h–18h, seg a sex) já
    // contados no chat — é o mesmo número do painel de chamados de lá, e não
    // uma segunda conta feita aqui.
    chat: {
      msgCanais: tCan, msgDiretas: tDir, msgChamados: tCha,
      mensagens: tCan + tDir + tCha,
      chamadosAbertos: tAb, chamadosAssumidos: tAs, chamadosConcluidos: tCo,
      tempoMedio: fmtDur(tCo ? Math.round(tSec / tCo) : 0),
      hasConversa: tCan + tDir + tCha > 0,
      hasChamado: tAb > 0 || tAs > 0 || tCo > 0,
    },
    assiduidade: (() => {
      const atr = assid._sum.atrasos ?? 0
      const abon = assid._sum.atrasosAbon ?? 0
      const min = assid._sum.minutosAtraso ?? 0
      const fx5 = assid._sum.atrasosAte5 ?? 0
      const fx30 = assid._sum.atrasosAte30 ?? 0
      const fxM = assid._sum.atrasosMais30 ?? 0
      return {
        // mesma fórmula do VM: 100 − atrasos·2 − advertências·5 (abonados fora).
        assid: Math.max(0, 100 - atr * 2 - advert * 5),
        atrasos: atr, atrasosAbon: abon, minutos: min, advertencias: advert,
        /* ⚠️⚠️ A GRAVIDADE DO ATRASO, em faixas (pedido do dono, 08/09/2026).
           "6 atrasos · 43 min" não distingue seis vezes chegando 7 minutos
           depois de duas chegando meia hora — e as duas conversas com a pessoa
           são completamente diferentes.
           ⚠️ Vem em CONTAGEM, não em percentual: quem calcula a porcentagem é a
           tela, que sabe se tem denominador para isso. Um "33%" sobre três
           atrasos diz menos que "1 de 3", e mandar só o percentual apagaria a
           amostra de quem lê. */
        faixas: {
          ate5: fx5, ate30: fx30, mais30: fxM,
          /* Atraso contado sem `entrada_prevista`: não deu para medir a
             gravidade. Fica fora das três faixas em vez de virar "até 5 min". */
          semMedida: Math.max(0, atr - fx5 - fx30 - fxM),
        },
        /* ⚠️ FALTA continua sem fonte na origem (o dump do Nexo não a traz) →
           `null`, e a ficha mostra "—". SUSPENSÃO passou a ter fonte em
           09/09/2026 (o Controle da LGPD do Nexus): cravá-la em `null` fazia a
           ficha dizer "sem fonte" sobre um fato registrado — e era para essa
           ficha que o painel de Suspensões mandava o gestor clicar. */
        faltas: null as number | null,
        suspensoes: lgpdSusp,
        lgpdAdvertencias: lgpdAdv,
        /* ⚠️⚠️ A COBERTURA vem junto, na rota que a ficha JÁ chama — de propósito.
           A ficha evita fetch extra (ver o comentário no topo dela), e sem isso
           ela ficaria com a heurística velha: "há qualquer ocorrência no
           período". Essa heurística lê um mês IMPECÁVEL como "sem registro de
           ponto", apagando da ficha justamente a boa notícia — e faz esta tela
           discordar do `/ranking`, que a mostraria com 100 e "sem ocorrência no
           período". Uma régua (`lib/ponto-cobertura.ts`), quatro telas. */
        /** Os dias com ocorrência DENTRO do filtro — alimentam o calendário. */
        dias: assidDias.map((d) => ({
          day: d.day, atrasos: d.atrasos, abonados: d.atrasosAbon, minutos: d.minutosAtraso,
          ate5: d.atrasosAte5, ate30: d.atrasosAte30, mais30: d.atrasosMais30,
        })),
        /** Até quando o ponto mediu — o calendário para de afirmar depois disso. */
        pontoAte: cobPonto.ultimoDia,
        pessoaMedida: cobPonto.roster.has(personKey),
        janelaComPonto: janelaTemDado(cobPonto, fromDay, toDay),
        motivoSemPonto: motivoSemPonto(cobPonto, cobPonto.roster.has(personKey), janelaTemDado(cobPonto, fromDay, toDay)),
      }
    })(),
    // Histórico completo de advertências (não é do período — é a ficha da pessoa).
    disciplina: discLista.map((d) => ({ data: d.data, motivo: d.motivo, tipo: d.tipo, dias: d.dias })),

    /* SERVIÇOS do setor, no período. ⚠️ `temFonte` distingue "este setor não
       manda planilha" de "esta pessoa não fez nada": sem ele, todo mundo dos
       outros 14 setores apareceria com "0 serviços", que é a mesma falta do
       ponto com outra roupa. */
    servicos: (() => {
      const concl = servicos.filter((x) => x.status === 'concluida')
      const porMesMap = new Map<string, { concluidos: number; minutos: number }>()
      for (const x of concl) {
        const mes = x.dia.slice(0, 7)
        const a = porMesMap.get(mes) ?? { concluidos: 0, minutos: 0 }
        a.concluidos++; a.minutos += x.minutos
        porMesMap.set(mes, a)
      }
      const porTarefa = new Map<string, { n: number; minutos: number }>()
      for (const x of concl) {
        const a = porTarefa.get(x.tarefa) ?? { n: 0, minutos: 0 }
        a.n++; a.minutos += x.minutos
        porTarefa.set(x.tarefa, a)
      }
      return {
        temFonte: servicos.length > 0 || servTotal > 0,
        concluidos: concl.length,
        abertos: servicos.filter((x) => x.status === 'aberta').length,
        desconsiderados: servicos.filter((x) => x.status === 'desconsiderada').length,
        minutos: concl.reduce((a, x) => a + x.minutos, 0),
        porMes: [...porMesMap].sort((a, b) => a[0].localeCompare(b[0])).map(([mes, v]) => ({ mes, ...v })),
        porTarefa: [...porTarefa].sort((a, b) => b[1].n - a[1].n).slice(0, 8).map(([tarefa, v]) => ({ tarefa, ...v })),
        /** Concluídos na planilha INTEIRA — o contexto que faz o recorte se ler. */
        totalConcluidos: servTotal,
      }
    })(),

    /* A PONTUAÇÃO mensal. ⚠️ `origem` viaja junto e a tela TEM de mostrá-la:
       "informado pelo setor" e "calculado pela régua" são procedências
       diferentes, e o histórico do Legal é todo informado — 105 dos 127 valores
       passam do teto que a régua atual permite. Exibir os dois com a mesma cara
       seria inventar procedência para número de gente de verdade. */
    pontuacao: pontuacoes.map((p) => ({ competencia: p.competencia, pontos: p.pontos, origem: p.origem, detalhe: p.detalhe })),
    /**
     * ONDE ELA ESTÁ no setor, na competência do filtro — o número do cabeçalho.
     *
     * ⚠️⚠️ A COMPETÊNCIA SEGUE O FILTRO quando ele cabe num mês só (o card de
     * meses, ou um intervalo do calendário dentro de um mês); nos presets que
     * cruzam meses fica o último mês FECHADO. É a MESMA régua do relatório de
     * setor — duas telas que respondessem "qual mês?" diferente diriam posições
     * diferentes sobre a mesma pessoa no mesmo dia.
     *
     * ⚠️ `posicao: null` quando ela não pontua naquele mês (chefia, sem crédito,
     * ou competência não rodada). Um "—" honesto; nunca o último lugar, que é o
     * que um `?? 0` produziria — e último lugar acusa.
     *
     * ⚠️ `acumulado` é a soma de TODOS os meses gravados, e por isso não
     * acompanha o filtro. A tela diz isso: é o "já acumulado", não o do período.
     */
    posicao,
    /** Quando cada fonte viu esta pessoa pela última vez, e até quando a FONTE
     *  mediu. É o PAR que informa — ver o comentário no cálculo. */
    ultimaAtividade,
  })
}
