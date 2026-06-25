import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { periodDays } from '@/lib/period-range'
import type { Period } from '@/lib/mock/dashboard'

// "Visão geral" do WhatsApp montada do espelho LOCAL (não ao vivo): KPIs,
// série diária de abertos e top atendentes, para o período selecionado. O
// snapshot pendingNow/openNow é "agora" (do último sync).
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const period = (req.nextUrl.searchParams.get('period') as Period) || '30d'
  const { fromDay, toDay } = periodDays(period)
  const where = { day: { gte: fromDay, lte: toDay } }

  const [dayRows, attRows, snap] = await Promise.all([
    prisma.whatsappDaily.findMany({ where, select: { day: true, abertos: true, finalizados: true, handleSum: true } }),
    prisma.whatsappAttendantDaily.groupBy({ by: ['dept', 'name'], where, _sum: { abertos: true } }),
    prisma.whatsappSnapshot.findUnique({ where: { id: 1 } }),
  ])

  let abertos = 0, finalizados = 0, handleSum = 0
  const byDay = new Map<string, number>()
  for (const r of dayRows) {
    abertos += r.abertos
    finalizados += r.finalizados
    handleSum += r.handleSum
    byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.abertos)
  }
  const series = [...byDay.entries()].map(([day, n]) => ({ day, abertos: n })).sort((a, b) => a.day.localeCompare(b.day))
  // Atendentes por (depto, nome) no período — a página monta o ranking geral e as abas.
  const attendants = attRows
    .map((r) => ({ dept: r.dept, name: r.name, abertos: r._sum.abertos ?? 0 }))
    .filter((a) => a.abertos > 0)

  return NextResponse.json({
    period, fromDay, toDay,
    kpis: {
      pendingNow: snap?.pendingNow ?? 0,
      openNow: snap?.openNow ?? 0,
      abertos,
      finalizados,
      avgHandleSeconds: finalizados ? Math.round(handleSum / finalizados) : 0,
    },
    series,
    attendants,
    snapshotAt: snap?.updatedAt ?? null,
  })
}
