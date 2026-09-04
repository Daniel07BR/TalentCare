import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { rangeDaRequisicao } from '@/lib/period-range'
import { alcanceDeQuemLe, porNexus, porPersonKey, porNome } from '@/lib/alcance'
import { coberturaDoPonto, janelaTemDado, motivoSemPonto } from '@/lib/ponto-cobertura'
import type { Period } from '@/lib/mock/dashboard'

// Sinais do SCORE por pessoa NO PERÍODO (atividade nos sistemas + assiduidade),
// lidos dos espelhos diários locais. O cálculo do score (percentil por depto,
// formação, pesos) é feito no cliente por computeScores/withRealScores.
export async function GET(req: NextRequest) {
  /* ⚠️⚠️ A MAIS SENSÍVEL das agregadas: ela devolve a atividade de CADA PESSOA
     da empresa, e é o que alimenta o score de todo mundo no cliente. Ver
     `lib/alcance.ts`. */
  const alcance = await alcanceDeQuemLe()
  if (!alcance) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { period, fromDay, toDay } = rangeDaRequisicao(req)
  const range = { day: { gte: fromDay, lte: toDay } }

  const [users, cls, hd, cide, cons, wpp, ger, chat, ponto, adv, serv] = await Promise.all([
    prisma.user.findMany({
      where: alcance.tipo === 'tudo'
        ? { origin: { in: ['nexus', 'staff'] } }
        : { origin: { in: ['nexus', 'staff'] }, id: { in: alcance.userIds } },
      select: { id: true, nexusUserId: true, name: true },
    }),
    prisma.classroomDaily.groupBy({ by: ['nexusUserId'], where: { ...range, ...porNexus(alcance) }, _sum: { videos: true, courses: true, created: true } }),
    prisma.helpdeskDaily.groupBy({ by: ['nexusUserId'], where: { ...range, ...porNexus(alcance) }, _sum: { opened: true, resolved: true } }),
    prisma.cideDaily.groupBy({ by: ['nexusUserId'], where: { ...range, ...porNexus(alcance) }, _sum: { atividades: true } }),
    prisma.consultoriaDaily.groupBy({ by: ['nexusUserId'], where: { ...range, ...porNexus(alcance) }, _sum: { studies: true, tickets: true, messages: true, comments: true } }),
    prisma.whatsappAttendantDaily.groupBy({ by: ['name'], where: { ...range, ...porNome(alcance) }, _sum: { finalizados: true } }),
    prisma.gerenciaDaily.groupBy({ by: ['nexusUserId'], where: { ...range, ...porNexus(alcance) }, _sum: { servicos: true, protAbertos: true, protAprovados: true, servCriados: true, datasAlteradas: true } }),
    // CHAT INTERNO: só CHAMADO. ⚠️⚠️ Mensagem NÃO entra (decisão do dono,
    // 02/09/2026) — é a métrica mais fácil de subir e a que menos diz sobre
    // entrega; em ordem de grandeza abafaria as outras sete fontes somadas e o
    // score passaria a medir quem mais escreve. Ver `activityOf()`.
    prisma.chatDaily.groupBy({ by: ['nexusUserId'], where: { ...range, ...porNexus(alcance) }, _sum: { chamadosAbertos: true, chamadosConcluidos: true } }),
    prisma.assiduidadeDaily.groupBy({ by: ['personKey'], where: { ...range, ...porPersonKey(alcance) }, _sum: { atrasos: true } }),
    prisma.disciplinaEvento.groupBy({ by: ['personKey'], where: { tipo: 'advertencia', data: { gte: fromDay, lte: toDay }, ...porPersonKey(alcance) }, _count: { _all: true } }),
    /* SERVIÇOS DA PLANILHA DO SETOR — a 11ª fonte, e ela ENTRA no score
       (decisão do dono, 03/09/2026). O paralelo é exato com o chamado do
       HelpDesk e o serviço da Gerência, que já entram: pedido feito, pedido
       entregue.
       ⚠️ Só CONCLUÍDO. "Aberta" não é entrega, e "desconsiderada" o próprio
       setor já descartou — contá-las premiaria abrir, que é o oposto.
       ⚠️ O TEMPO fica de fora, pelo mesmo motivo que tirou km e jornada da
       Gerência: é a MAGNITUDE do mesmo serviço. Somado, faria quem faz tarefa
       longa abafar quem faz muitas curtas — e a média por serviço varia 6x
       entre as pessoas do Legal por mix de tarefa, não por esforço. */
    prisma.servicoDepto.groupBy({
      by: ['personKey'],
      where: { status: 'concluida', dia: { gte: fromDay, lte: toDay }, personKey: { not: null }, ...porPersonKey(alcance) },
      _count: { _all: true },
    }),
  ])

  const clsM = new Map(cls.map((r) => [r.nexusUserId, (r._sum.videos ?? 0) + (r._sum.courses ?? 0) + (r._sum.created ?? 0)]))
  const hdM = new Map(hd.map((r) => [r.nexusUserId, (r._sum.opened ?? 0) + (r._sum.resolved ?? 0)]))
  const cideM = new Map(cide.map((r) => [r.nexusUserId, r._sum.atividades ?? 0]))
  const consM = new Map(cons.map((r) => [r.nexusUserId, (r._sum.studies ?? 0) + (r._sum.tickets ?? 0) + (r._sum.messages ?? 0) + (r._sum.comments ?? 0)]))
  // Gerência: só CONTAGEM de ação (serviço entregue/criado, protocolo aberto/
  // aprovado, data alterada). km/viagens/jornada ficam fora — são magnitude.
  const gerM = new Map(ger.map((r) => [r.nexusUserId, (r._sum.servicos ?? 0) + (r._sum.protAbertos ?? 0) + (r._sum.protAprovados ?? 0) + (r._sum.servCriados ?? 0) + (r._sum.datasAlteradas ?? 0)]))
  const chatM = new Map(chat.map((r) => [r.nexusUserId, (r._sum.chamadosAbertos ?? 0) + (r._sum.chamadosConcluidos ?? 0)]))
  const normName = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
  const wppM = new Map(wpp.map((r) => [normName(r.name), r._sum.finalizados ?? 0]))
  const atrM = new Map(ponto.map((r) => [r.personKey, r._sum.atrasos ?? 0]))
  const advM = new Map(adv.map((r) => [r.personKey, r._count._all]))
  const servM = new Map(serv.map((r) => [r.personKey, r._count._all]))

  const byPerson = users.map((u) => {
    const nk = u.nexusUserId
    const pk = u.nexusUserId ?? u.id
    const activity =
      (nk ? (clsM.get(nk) ?? 0) + (hdM.get(nk) ?? 0) + (cideM.get(nk) ?? 0) + (consM.get(nk) ?? 0) + (gerM.get(nk) ?? 0) + (chatM.get(nk) ?? 0) : 0) +
      (wppM.get(normName(u.name)) ?? 0) +
      (servM.get(pk) ?? 0)
    return { id: u.id, activity, atrasos: atrM.get(pk) ?? 0, advertencias: advM.get(pk) ?? 0 }
  })

  /* ⚠️⚠️ A JANELA FOI MEDIDA? O ponto entra por import à mão, não por cron, e em
     03/09/2026 o dump terminava em 25/06: em "7 dias", "30 dias" e "Trimestre
     atual" (jul–set) o `groupBy` acima devolve VAZIO para todo mundo, e vazio
     vira `atrasos: 0` → assiduidade **100** para as 87 pessoas. Sem esta
     bandeira o cliente não tem como distinguir "ninguém se atrasou" de "ninguém
     mediu", e o score de toda a casa carrega 20 pontos de nota cheia comprada
     com a ausência de dado. Ver `lib/ponto-cobertura.ts`. */
  const cob = await coberturaDoPonto()
  const janelaComPonto = janelaTemDado(cob, fromDay, toDay)

  return NextResponse.json({
    period, fromDay, toDay, byPerson,
    janelaComPonto,
    motivoSemPonto: janelaComPonto ? null : motivoSemPonto(cob, true, false),
    pontoAte: cob.ultimoDia,
  })
}
