import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { periodDays } from '@/lib/period-range'
import type { Period } from '@/lib/mock/dashboard'

// Atividade da Gerência por usuário NO PERÍODO, lida do espelho local
// gerencia_daily. Devolve as duas famílias (execução e escritório) juntas —
// quem separa é a tela, não a API.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const period = (req.nextUrl.searchParams.get('period') as Period) || '30d'
  const { fromDay, toDay } = periodDays(period)
  const rows = await prisma.gerenciaDaily.groupBy({
    by: ['nexusUserId'],
    where: { day: { gte: fromDay, lte: toDay } },
    _sum: {
      servicos: true, km: true, viagens: true, jornadaMin: true,
      protAbertos: true, protAprovados: true, servCriados: true,
      reagendados: true, cancelados: true,
    },
  })
  const byUser = rows.map((r) => ({
    nexusUserId: r.nexusUserId,
    servicos: r._sum.servicos ?? 0,
    km: r._sum.km ?? 0,
    viagens: r._sum.viagens ?? 0,
    jornadaMin: r._sum.jornadaMin ?? 0,
    protAbertos: r._sum.protAbertos ?? 0,
    protAprovados: r._sum.protAprovados ?? 0,
    servCriados: r._sum.servCriados ?? 0,
    reagendados: r._sum.reagendados ?? 0,
    cancelados: r._sum.cancelados ?? 0,
  }))
  return NextResponse.json({ period, fromDay, toDay, byUser })
}
