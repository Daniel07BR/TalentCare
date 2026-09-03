import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { rangeDaRequisicao, diasNoIntervalo, rotuloDoIntervalo } from '@/lib/period-range'
import { quemEh } from '@/lib/avaliacoes/regua'
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
      birthDate: true, gender: true, entryDate: true, leftAt: true,
    },
  })
  const ativos = pessoas.filter((p) => p.active)
  const nx = ativos.map((p) => p.nexusUserId).filter((v): v is string => !!v)
  // personKey da assiduidade = nexus_user_id ?? id (cobre STAFF sem Nexus).
  const chaves = ativos.map((p) => p.nexusUserId ?? p.id)
  const nomes = ativos.map((p) => p.name)
  const ids = ativos.map((p) => p.id)

  const porNexus = { nexusUserId: { in: nx }, ...range }

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
      where: { avaliadoId: { in: ids }, competencia: competenciaAnterior(), status: 'publicada' },
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

  // ── Demografia (não é do período: é o retrato de hoje) ─────────────────────
  const hoje = new Date()
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

  return NextResponse.json({
    setor: { id: dept.id, nome: dept.name, pelaDiretoria: dept.avaliadoPelaDiretoria },
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
      competencia: competenciaAnterior(),
      publicadas: avals.length,
      avaliaveis: ativos.length,
      media: medias.length ? Math.round((medias.reduce((a, b) => a + b, 0) / medias.length) * 10) / 10 : null,
      porCriterio: [...porCriterio.entries()].map(([criterio, c]) => ({
        criterio, media: Math.round((c.soma / c.n) * 10) / 10, n: c.n,
      })),
    },
  })
}
