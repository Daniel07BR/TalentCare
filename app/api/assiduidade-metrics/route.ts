import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { periodDays } from '@/lib/period-range'
import type { Period } from '@/lib/mock/dashboard'

// Assiduidade (ponto) por pessoa NO PERÍODO, lida dos espelhos locais
// (assiduidade_daily + disciplina_evento). A página mescla com a identidade
// (useTalentData) p/ montar leaderboards/por depto respeitando o filtro de dias.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const period = (req.nextUrl.searchParams.get('period') as Period) || '30d'
  const { fromDay, toDay } = periodDays(period)

  const [pontoRows, advRows] = await Promise.all([
    prisma.assiduidadeDaily.groupBy({
      by: ['personKey'],
      where: { day: { gte: fromDay, lte: toDay } },
      _sum: { atrasos: true, atrasosAbon: true, minutosAtraso: true },
    }),
    prisma.disciplinaEvento.groupBy({
      by: ['personKey'],
      where: { tipo: 'advertencia', data: { gte: fromDay, lte: toDay } },
      _count: { _all: true },
    }),
  ])

  const advByKey = new Map(advRows.map((r) => [r.personKey, r._count._all]))
  const keys = new Set<string>([...pontoRows.map((r) => r.personKey), ...advByKey.keys()])
  const byPerson = [...keys].map((personKey) => {
    const p = pontoRows.find((r) => r.personKey === personKey)
    return {
      personKey,
      atrasos: p?._sum.atrasos ?? 0,
      abonados: p?._sum.atrasosAbon ?? 0,
      minutos: p?._sum.minutosAtraso ?? 0,
      advertencias: advByKey.get(personKey) ?? 0,
    }
  })

  return NextResponse.json({ period, fromDay, toDay, byPerson })
}
