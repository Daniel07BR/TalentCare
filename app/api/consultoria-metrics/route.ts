import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { periodDays } from '@/lib/period-range'
import type { Period } from '@/lib/mock/dashboard'

// Atividade do Consultoria Plus por usuário NO PERÍODO, lida do espelho local
// consultoria_daily (rápido, sem rede). Alimenta o card/página/ficha respeitando
// o filtro de dias.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const period = (req.nextUrl.searchParams.get('period') as Period) || '30d'
  const { fromDay, toDay } = periodDays(period)
  const rows = await prisma.consultoriaDaily.groupBy({
    by: ['nexusUserId'],
    where: { day: { gte: fromDay, lte: toDay } },
    _sum: { studies: true, tickets: true, messages: true, comments: true },
  })
  const byUser = rows.map((r) => ({
    nexusUserId: r.nexusUserId,
    studies: r._sum.studies ?? 0,
    tickets: r._sum.tickets ?? 0,
    messages: r._sum.messages ?? 0,
    comments: r._sum.comments ?? 0,
  }))
  return NextResponse.json({ period, fromDay, toDay, byUser })
}
