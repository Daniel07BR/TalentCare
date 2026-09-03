import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { rangeDaRequisicao } from '@/lib/period-range'
import { alcanceDeQuemLe, porNexus } from '@/lib/alcance'
import type { Period } from '@/lib/mock/dashboard'

// Atividade do HelpDesk por usuário NO PERÍODO, lida do espelho local
// helpdesk_daily. Alimenta o card/página/ficha respeitando o filtro de dias.
export async function GET(req: NextRequest) {
  /* ⚠️⚠️ ESTA ROTA DEVOLVIA A EMPRESA INTEIRA para qualquer sessão autenticada.
     O middleware não alcança isto: ele conhece o caminho, e o caminho é igual
     para todo setor. Ver `lib/alcance.ts`. */
  const alcance = await alcanceDeQuemLe()
  if (!alcance) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { period, fromDay, toDay } = rangeDaRequisicao(req)
  const rows = await prisma.helpdeskDaily.groupBy({
    by: ['nexusUserId'],
    where: { day: { gte: fromDay, lte: toDay }, ...porNexus(alcance) },
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
