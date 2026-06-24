import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { periodDays } from '@/lib/period-range'
import type { Period } from '@/lib/mock/dashboard'

// Resumo de atendimentos do WhatsApp por departamento NO PERÍODO, lido do espelho
// local whatsapp_daily (rápido, sem rede). Mesma resposta de antes (departments
// [{name,color,abertos}] + totalAbertos) — o card não muda.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const period = (req.nextUrl.searchParams.get('period') as Period) || '30d'
  const { fromDay, toDay } = periodDays(period)
  const rows = await prisma.whatsappDaily.groupBy({
    by: ['dept'],
    where: { day: { gte: fromDay, lte: toDay }, dept: { not: 'Sem fila' } },
    _sum: { abertos: true },
    _max: { color: true },
  })
  const departments = rows
    .map((r) => ({ name: r.dept, color: r._max.color ?? null, abertos: r._sum.abertos ?? 0 }))
    .sort((a, b) => b.abertos - a.abertos)
  const totalAbertos = departments.reduce((a, d) => a + d.abertos, 0)
  return NextResponse.json({ period, from: fromDay, to: toDay, departments, totalAbertos })
}
