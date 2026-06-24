import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { periodDays } from '@/lib/period-range'
import type { Period } from '@/lib/mock/dashboard'

// Uso da rádio por usuário NO PERÍODO, lido do espelho local radio_daily (rápido,
// sem rede). A página/card mesclam isso com a identidade (useTalentData) para
// montar top5 / por depto / por usuário respeitando o filtro de dias.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const period = (req.nextUrl.searchParams.get('period') as Period) || '30d'
  const { fromDay, toDay } = periodDays(period)
  const rows = await prisma.radioDaily.groupBy({
    by: ['nexusUserId'],
    where: { day: { gte: fromDay, lte: toDay } },
    _sum: { seconds: true, sessions: true },
  })
  const byUser = rows.map((r) => ({
    nexusUserId: r.nexusUserId,
    seconds: r._sum.seconds ?? 0,
    sessions: r._sum.sessions ?? 0,
  }))
  return NextResponse.json({ period, fromDay, toDay, byUser })
}
