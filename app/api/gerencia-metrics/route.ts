import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { rangeDaRequisicao } from '@/lib/period-range'
import { alcanceDeQuemLe, porNexus } from '@/lib/alcance'
import type { Period } from '@/lib/mock/dashboard'

// Atividade da Gerência por usuário NO PERÍODO, lida do espelho local
// gerencia_daily. Devolve as duas famílias (execução e escritório) juntas —
// quem separa é a tela, não a API.
export async function GET(req: NextRequest) {
  /* ⚠️⚠️ ESTA ROTA DEVOLVIA A EMPRESA INTEIRA para qualquer sessão autenticada.
     O middleware não alcança isto: ele conhece o caminho, e o caminho é igual
     para todo setor. Ver `lib/alcance.ts`. */
  const alcance = await alcanceDeQuemLe()
  if (!alcance) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { period, fromDay, toDay } = rangeDaRequisicao(req)
  const rows = await prisma.gerenciaDaily.groupBy({
    by: ['nexusUserId'],
    where: { day: { gte: fromDay, lte: toDay }, ...porNexus(alcance) },
    _sum: {
      servicos: true, km: true, saidas: true, viagens: true, jornadaMin: true,
      protAbertos: true, protAprovados: true, servCriados: true,
      reagendados: true, cancelados: true, datasAlteradas: true,
    },
  })
  const byUser = rows.map((r) => ({
    nexusUserId: r.nexusUserId,
    servicos: r._sum.servicos ?? 0,
    km: r._sum.km ?? 0,
    saidas: r._sum.saidas ?? 0,
    viagens: r._sum.viagens ?? 0,
    jornadaMin: r._sum.jornadaMin ?? 0,
    protAbertos: r._sum.protAbertos ?? 0,
    protAprovados: r._sum.protAprovados ?? 0,
    servCriados: r._sum.servCriados ?? 0,
    reagendados: r._sum.reagendados ?? 0,
    cancelados: r._sum.cancelados ?? 0,
    datasAlteradas: r._sum.datasAlteradas ?? 0,
  }))
  return NextResponse.json({ period, fromDay, toDay, byUser })
}
