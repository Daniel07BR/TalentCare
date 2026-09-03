import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { rangeDaRequisicao } from '@/lib/period-range'
import { alcanceDeQuemLe, porNexus } from '@/lib/alcance'
import type { Period } from '@/lib/mock/dashboard'

// Uso do ClassRoom por usuário NO PERÍODO, lido do espelho local classroom_daily.
export async function GET(req: NextRequest) {
  /* ⚠️⚠️ ESTA ROTA DEVOLVIA A EMPRESA INTEIRA para qualquer sessão autenticada.
     O middleware não alcança isto: ele conhece o caminho, e o caminho é igual
     para todo setor. Ver `lib/alcance.ts`. */
  const alcance = await alcanceDeQuemLe()
  if (!alcance) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { period, fromDay, toDay } = rangeDaRequisicao(req)
  const rows = await prisma.classroomDaily.groupBy({
    by: ['nexusUserId'],
    where: { day: { gte: fromDay, lte: toDay }, ...porNexus(alcance) },
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
