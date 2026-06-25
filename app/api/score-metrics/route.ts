import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { periodDays } from '@/lib/period-range'
import type { Period } from '@/lib/mock/dashboard'

// Sinais do SCORE por pessoa NO PERÍODO (atividade nos sistemas + assiduidade),
// lidos dos espelhos diários locais. O cálculo do score (percentil por depto,
// formação, pesos) é feito no cliente por computeScores/withRealScores.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const period = (req.nextUrl.searchParams.get('period') as Period) || '30d'
  const { fromDay, toDay } = periodDays(period)
  const range = { day: { gte: fromDay, lte: toDay } }

  const [users, cls, hd, cide, cons, wpp, ponto, adv] = await Promise.all([
    prisma.user.findMany({ where: { origin: { in: ['nexus', 'staff'] } }, select: { id: true, nexusUserId: true, name: true } }),
    prisma.classroomDaily.groupBy({ by: ['nexusUserId'], where: range, _sum: { videos: true, courses: true, created: true } }),
    prisma.helpdeskDaily.groupBy({ by: ['nexusUserId'], where: range, _sum: { opened: true, resolved: true } }),
    prisma.cideDaily.groupBy({ by: ['nexusUserId'], where: range, _sum: { atividades: true } }),
    prisma.consultoriaDaily.groupBy({ by: ['nexusUserId'], where: range, _sum: { studies: true, tickets: true, messages: true, comments: true } }),
    prisma.whatsappAttendantDaily.groupBy({ by: ['name'], where: range, _sum: { finalizados: true } }),
    prisma.assiduidadeDaily.groupBy({ by: ['personKey'], where: range, _sum: { atrasos: true } }),
    prisma.disciplinaEvento.groupBy({ by: ['personKey'], where: { tipo: 'advertencia', data: { gte: fromDay, lte: toDay } }, _count: { _all: true } }),
  ])

  const clsM = new Map(cls.map((r) => [r.nexusUserId, (r._sum.videos ?? 0) + (r._sum.courses ?? 0) + (r._sum.created ?? 0)]))
  const hdM = new Map(hd.map((r) => [r.nexusUserId, (r._sum.opened ?? 0) + (r._sum.resolved ?? 0)]))
  const cideM = new Map(cide.map((r) => [r.nexusUserId, r._sum.atividades ?? 0]))
  const consM = new Map(cons.map((r) => [r.nexusUserId, (r._sum.studies ?? 0) + (r._sum.tickets ?? 0) + (r._sum.messages ?? 0) + (r._sum.comments ?? 0)]))
  const normName = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
  const wppM = new Map(wpp.map((r) => [normName(r.name), r._sum.finalizados ?? 0]))
  const atrM = new Map(ponto.map((r) => [r.personKey, r._sum.atrasos ?? 0]))
  const advM = new Map(adv.map((r) => [r.personKey, r._count._all]))

  const byPerson = users.map((u) => {
    const nk = u.nexusUserId
    const pk = u.nexusUserId ?? u.id
    const activity =
      (nk ? (clsM.get(nk) ?? 0) + (hdM.get(nk) ?? 0) + (cideM.get(nk) ?? 0) + (consM.get(nk) ?? 0) : 0) +
      (wppM.get(normName(u.name)) ?? 0)
    return { id: u.id, activity, atrasos: atrM.get(pk) ?? 0, advertencias: advM.get(pk) ?? 0 }
  })

  return NextResponse.json({ period, fromDay, toDay, byPerson })
}
