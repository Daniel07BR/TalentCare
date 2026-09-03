import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { rangeDaRequisicao } from '@/lib/period-range'
import { alcanceDeQuemLe, porNexus } from '@/lib/alcance'
import type { Period } from '@/lib/mock/dashboard'

// Uso da rádio por usuário NO PERÍODO, lido do espelho local radio_daily (rápido,
// sem rede). A página/card mesclam isso com a identidade (useTalentData) para
// montar top5 / por depto / por usuário respeitando o filtro de dias.
export async function GET(req: NextRequest) {
  /* ⚠️⚠️ ESTA ROTA DEVOLVIA A EMPRESA INTEIRA para qualquer sessão autenticada.
     O middleware não alcança isto: ele conhece o caminho, e o caminho é igual
     para todo setor. Ver `lib/alcance.ts`. */
  const alcance = await alcanceDeQuemLe()
  if (!alcance) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { period, fromDay, toDay } = rangeDaRequisicao(req)
  const rows = await prisma.radioDaily.groupBy({
    by: ['nexusUserId'],
    where: { day: { gte: fromDay, lte: toDay }, ...porNexus(alcance) },
    _sum: { seconds: true, sessions: true },
  })
  const byUser = rows.map((r) => ({
    nexusUserId: r.nexusUserId,
    seconds: r._sum.seconds ?? 0,
    sessions: r._sum.sessions ?? 0,
  }))
  return NextResponse.json({ period, fromDay, toDay, byUser })
}
