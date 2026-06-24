import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { periodDays } from '@/lib/period-range'
import type { Period } from '@/lib/mock/dashboard'

// Uso do ClassRoom por usuário NO PERÍODO, lido do espelho local classroom_daily.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const period = (req.nextUrl.searchParams.get('period') as Period) || '30d'
  const { fromDay, toDay } = periodDays(period)
  const rows = await prisma.classroomDaily.groupBy({
    by: ['nexusUserId'],
    where: { day: { gte: fromDay, lte: toDay } },
    _sum: { videos: true, courses: true, created: true },
  })
  const byUser = rows.map((r) => ({
    nexusUserId: r.nexusUserId,
    videos: r._sum.videos ?? 0,
    courses: r._sum.courses ?? 0,
    created: r._sum.created ?? 0,
  }))
  return NextResponse.json({ period, fromDay, toDay, byUser })
}
