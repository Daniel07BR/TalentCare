import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { rangeDaRequisicao } from '@/lib/period-range'
import { prisma as db } from '@/lib/db/prisma'
import { alcanceDeQuemLe } from '@/lib/alcance'
import type { Period } from '@/lib/mock/dashboard'

// Resumo de atendimentos do WhatsApp por departamento NO PERÍODO, lido do espelho
// local whatsapp_daily (rápido, sem rede). Mesma resposta de antes (departments
// [{name,color,abertos}] + totalAbertos) — o card não muda.
export async function GET(req: NextRequest) {
  /* ⚠️⚠️ Devolvia a empresa inteira para qualquer sessão. Ver `lib/alcance.ts`. */
  const alcance = await alcanceDeQuemLe()
  if (!alcance) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { period, fromDay, toDay } = rangeDaRequisicao(req)
  /* ⚠️ O espelho guarda o NOME do setor (`dept`), não o id — ele vem do OneCode,
     que não conhece o Nexus. O recorte precisa dos nomes. */
  const meusSetores = alcance.tipo === 'tudo' ? null
    : (await db.department.findMany({ where: { id: { in: alcance.departmentIds } }, select: { name: true } })).map((d) => d.name)

  const rows = await prisma.whatsappDaily.groupBy({
    by: ['dept'],
    where: {
      day: { gte: fromDay, lte: toDay }, dept: { not: 'Sem fila' },
      ...(meusSetores ? { dept: { in: meusSetores, not: 'Sem fila' } } : {}),
    },
    _sum: { abertos: true },
    _max: { color: true },
  })
  const departments = rows
    .map((r) => ({ name: r.dept, color: r._max.color ?? null, abertos: r._sum.abertos ?? 0 }))
    .sort((a, b) => b.abertos - a.abertos)
  const totalAbertos = departments.reduce((a, d) => a + d.abertos, 0)
  return NextResponse.json({ period, from: fromDay, to: toDay, departments, totalAbertos })
}
