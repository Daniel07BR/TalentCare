import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { rangeDaRequisicao } from '@/lib/period-range'
import { prisma as db } from '@/lib/db/prisma'
import { alcanceDeQuemLe, porNome } from '@/lib/alcance'
import type { Period } from '@/lib/mock/dashboard'

// "Visão geral" do WhatsApp montada do espelho LOCAL (não ao vivo): KPIs,
// série diária de abertos e top atendentes, para o período selecionado. O
// snapshot pendingNow/openNow é "agora" (do último sync).
export async function GET(req: NextRequest) {
  /* ⚠️⚠️ Devolvia a empresa inteira para qualquer sessão. Ver `lib/alcance.ts`. */
  const alcance = await alcanceDeQuemLe()
  if (!alcance) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { period, fromDay, toDay } = rangeDaRequisicao(req)
  const where = { day: { gte: fromDay, lte: toDay } }

  /* ⚠️⚠️ O espelho do WhatsApp guarda o NOME do setor (`dept`), e não o id — ele
     vem do OneCode, que não conhece o Nexus. Então o recorte por setor precisa
     dos nomes, e eles saem do banco local. */
  const meusSetores = alcance.tipo === 'tudo' ? null
    : (await db.department.findMany({ where: { id: { in: alcance.departmentIds } }, select: { name: true } })).map((d) => d.name)

  const [dayRows, attRows, snap] = await Promise.all([
    prisma.whatsappDaily.findMany({
      where: meusSetores ? { ...where, dept: { in: meusSetores } } : where,
      select: { day: true, abertos: true, finalizados: true, handleSum: true },
    }),
    prisma.whatsappAttendantDaily.groupBy({ by: ['dept', 'name'], where: { ...where, ...porNome(alcance) }, _sum: { abertos: true } }),
    /* ⚠️ O SNAPSHOT ("pendentes agora") é da casa inteira e não se recorta: ele
       não tem setor nem atendente, é um número só. Fica só para quem alcança
       tudo — meio-número seria pior que nenhum. */
    alcance.tipo === 'tudo' ? prisma.whatsappSnapshot.findUnique({ where: { id: 1 } }) : null,
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
