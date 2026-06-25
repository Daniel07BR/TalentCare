import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { periodDays } from '@/lib/period-range'
import type { Period } from '@/lib/mock/dashboard'

// Atividade do HelpDesk por usuário NO PERÍODO, lida do espelho local
// helpdesk_daily. Alimenta o card/página/ficha respeitando o filtro de dias.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const period = (req.nextUrl.searchParams.get('period') as Period) || '30d'
  const { fromDay, toDay } = periodDays(period)
  const rows = await prisma.helpdeskDaily.groupBy({
    by: ['nexusUserId'],
    where: { day: { gte: fromDay, lte: toDay } },
    _sum: { opened: true, resolved: true, formalized: true, resolvedSeconds: true },
  })
  const byUser = rows.map((r) => ({
    nexusUserId: r.nexusUserId,
    opened: r._sum.opened ?? 0,
    resolved: r._sum.resolved ?? 0,
    formalized: r._sum.formalized ?? 0,
    resolvedSeconds: r._sum.resolvedSeconds ?? 0,
  }))
  return NextResponse.json({ period, fromDay, toDay, byUser })
}
