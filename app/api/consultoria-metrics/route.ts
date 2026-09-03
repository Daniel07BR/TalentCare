import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { rangeDaRequisicao } from '@/lib/period-range'
import { alcanceDeQuemLe, porNexus } from '@/lib/alcance'
import type { Period } from '@/lib/mock/dashboard'

// Atividade do Consultoria Plus por usuário NO PERÍODO, lida do espelho local
// consultoria_daily (rápido, sem rede). Alimenta o card/página/ficha respeitando
// o filtro de dias.
export async function GET(req: NextRequest) {
  /* ⚠️⚠️ ESTA ROTA DEVOLVIA A EMPRESA INTEIRA para qualquer sessão autenticada.
     O middleware não alcança isto: ele conhece o caminho, e o caminho é igual
     para todo setor. Ver `lib/alcance.ts`. */
  const alcance = await alcanceDeQuemLe()
  if (!alcance) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { period, fromDay, toDay } = rangeDaRequisicao(req)
  const rows = await prisma.consultoriaDaily.groupBy({
    by: ['nexusUserId'],
    where: { day: { gte: fromDay, lte: toDay }, ...porNexus(alcance) },
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
