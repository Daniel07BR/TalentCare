import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { periodDays } from '@/lib/period-range'
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
  const period = (req.nextUrl.searchParams.get('period') as Period) || '30d'
  const { fromDay, toDay } = periodDays(period)
  const range = { day: { gte: fromDay, lte: toDay } }

  const user = await prisma.user.findUnique({ where: { id }, select: { nexusUserId: true, name: true } })
  if (!user) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })

  const [radio, classroom, wpp, cons, hd, cd] = await Promise.all([
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

  return NextResponse.json({
    period, fromDay, toDay,
    radio: { horas: Math.round(rSec / 3600), sessoes: radio?._sum.sessions ?? 0, ultimaDay: radio?._max.day ?? null },
    classroom: { videos: cVid, courses: cCur, created: cCri, total: cCur + cCri },
    whatsapp: { has: wAb > 0 || wFi > 0, abertos: wAb, finalizados: wFi, tempoMedio: fmtDur(wFi ? Math.round(wHs / wFi) : 0) },
    consultoria: { has: cTotal > 0, studies: cStu, tickets: cTic, messages: cMsg, comments: cCom, total: cTotal },
    helpdesk: { has: hOpen > 0 || hRes > 0, opened: hOpen, resolved: hRes, formalized: hForm, tempoMedio: fmtDur(hResNormal ? Math.round(hSec / hResNormal) : 0) },
    cide: { has: (cd?._sum.atividades ?? 0) > 0, atividades: cd?._sum.atividades ?? 0 },
  })
}
