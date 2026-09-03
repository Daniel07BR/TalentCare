import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { rangeDaRequisicao } from '@/lib/period-range'
import { quemEh, podeVer } from '@/lib/avaliacoes/regua'
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

  const [radio, classroom, wpp, cons, hd, cd, gd, ct, assid, advert] = await Promise.all([
    user.nexusUserId
      ? prisma.radioDaily.aggregate({ where: { nexusUserId: user.nexusUserId, ...range }, _sum: { seconds: true, sessions: true }, _max: { day: true } })
      : null,
    user.nexusUserId
      ? prisma.classroomDaily.aggregate({ where: { nexusUserId: user.nexusUserId, ...range }, _sum: { videos: true, courses: true, created: true } })
      : null,
    prisma.whatsappAttendantDaily.aggregate({ where: { name: user.name, ...range }, _sum: { abertos: true, finalizados: true, handleSum: true } }),
    user.nexusUserId
      ? prisma.consultoriaDaily.aggregate({ where: { nexusUserId: user.nexusUserId, ...range }, _sum: { studies: true, tickets: true, messages: true, comments: true } })
      : null,
    user.nexusUserId
      ? prisma.helpdeskDaily.aggregate({ where: { nexusUserId: user.nexusUserId, ...range }, _sum: { opened: true, resolved: true, formalized: true, resolvedSeconds: true } })
      : null,
    user.nexusUserId
      ? prisma.cideDaily.aggregate({ where: { nexusUserId: user.nexusUserId, ...range }, _sum: { atividades: true } })
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
    prisma.assiduidadeDaily.aggregate({ where: { personKey, ...range }, _sum: { atrasos: true, atrasosAbon: true, minutosAtraso: true } }),
    prisma.disciplinaEvento.count({ where: { personKey, tipo: 'advertencia', data: { gte: fromDay, lte: toDay } } }),
  ])

  const rSec = radio?._sum.seconds ?? 0
  const cVid = classroom?._sum.videos ?? 0
  const cCur = classroom?._sum.courses ?? 0
  const cCri = classroom?._sum.created ?? 0
  const wAb = wpp._sum.abertos ?? 0
  const wFi = wpp._sum.finalizados ?? 0
  const wHs = wpp._sum.handleSum ?? 0
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

  return NextResponse.json({
    period, fromDay, toDay,
    radio: { horas: Math.round(rSec / 3600), sessoes: radio?._sum.sessions ?? 0, ultimaDay: radio?._max.day ?? null },
    classroom: { videos: cVid, courses: cCur, created: cCri, total: cCur + cCri },
    whatsapp: { has: wAb > 0 || wFi > 0, abertos: wAb, finalizados: wFi, tempoMedio: fmtDur(wFi ? Math.round(wHs / wFi) : 0) },
    consultoria: { has: cTotal > 0, studies: cStu, tickets: cTic, messages: cMsg, comments: cCom, total: cTotal },
    helpdesk: { has: hOpen > 0 || hRes > 0, opened: hOpen, resolved: hRes, formalized: hForm, tempoMedio: fmtDur(hResNormal ? Math.round(hSec / hResNormal) : 0) },
    cide: { has: (cd?._sum.atividades ?? 0) > 0, atividades: cd?._sum.atividades ?? 0 },
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
      return {
        // mesma fórmula do VM: 100 − atrasos·2 − advertências·5 (abonados fora).
        assid: Math.max(0, 100 - atr * 2 - advert * 5),
        atrasos: atr, atrasosAbon: abon, minutos: min, advertencias: advert,
        // faltas/suspensões: sem fonte na origem (null → ficha mostra "—").
        faltas: null as number | null, suspensoes: null as number | null,
      }
    })(),
  })
}
