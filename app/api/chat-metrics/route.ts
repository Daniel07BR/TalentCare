import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { periodDays } from '@/lib/period-range'
import type { Period } from '@/lib/mock/dashboard'

// Atividade do Chat Interno NO PERÍODO, lida do espelho local. Devolve as duas
// visões que a tela precisa e que NÃO se somam:
//   byUser — mensagens e chamados por pessoa
//   byDept — chamados por setor, nas duas faces (pediu × recebeu)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const period = (req.nextUrl.searchParams.get('period') as Period) || '30d'
  const { fromDay, toDay } = periodDays(period)
  const range = { day: { gte: fromDay, lte: toDay } }

  const [rows, deptRows, primeiro] = await Promise.all([
    prisma.chatDaily.groupBy({
      by: ['nexusUserId'],
      where: range,
      _sum: {
        msgCanais: true, msgDiretas: true, msgChamados: true,
        chamadosAbertos: true, chamadosAssumidos: true, chamadosConcluidos: true,
        segundosResolucao: true,
      },
    }),
    prisma.chatDeptDaily.groupBy({
      by: ['nexusDepartmentId'],
      where: range,
      _sum: {
        pedidosAbertos: true, pedidosConcluidos: true,
        recebidosAbertos: true, recebidosConcluidos: true, recebidosCancelados: true,
        segundosResolucao: true,
      },
    }),
    // ⚠️ Desde quando HÁ dado. A tela avisa, senão o filtro de Ano parece bug:
    // o histórico de mensagem vem do import do Mattermost e é muito mais antigo
    // que o dos chamados, que só existem desde 21/08/2026.
    prisma.chatDaily.aggregate({ _min: { day: true } }),
  ])

  const byUser = rows.map((r) => ({
    nexusUserId: r.nexusUserId,
    msgCanais: r._sum.msgCanais ?? 0,
    msgDiretas: r._sum.msgDiretas ?? 0,
    msgChamados: r._sum.msgChamados ?? 0,
    chamadosAbertos: r._sum.chamadosAbertos ?? 0,
    chamadosAssumidos: r._sum.chamadosAssumidos ?? 0,
    chamadosConcluidos: r._sum.chamadosConcluidos ?? 0,
    segundosResolucao: r._sum.segundosResolucao ?? 0,
  }))

  // Nome e cor do setor vêm da tabela local de departamentos, casados pelo
  // nexus_department_id — a mesma chave dos dois lados, nunca o nome.
  const depts = await prisma.department.findMany({
    where: { nexusDepartmentId: { in: deptRows.map((d) => d.nexusDepartmentId) } },
    select: { nexusDepartmentId: true, name: true, id: true },
  })
  const nomeDe = new Map(depts.map((d) => [d.nexusDepartmentId, d]))

  const byDept = deptRows.map((r) => {
    const d = nomeDe.get(r.nexusDepartmentId)
    return {
      nexusDepartmentId: r.nexusDepartmentId,
      id: d?.id ?? null,
      // Setor que existe no chat mas ainda não no TalentCare aparece assim, em
      // vez de sumir: uma linha rotulada é auditável, uma linha ausente não é.
      nome: d?.name ?? 'Setor não cadastrado',
      pedidosAbertos: r._sum.pedidosAbertos ?? 0,
      pedidosConcluidos: r._sum.pedidosConcluidos ?? 0,
      recebidosAbertos: r._sum.recebidosAbertos ?? 0,
      recebidosConcluidos: r._sum.recebidosConcluidos ?? 0,
      recebidosCancelados: r._sum.recebidosCancelados ?? 0,
      segundosResolucao: r._sum.segundosResolucao ?? 0,
    }
  }).sort((a, b) => b.recebidosAbertos + b.recebidosConcluidos - (a.recebidosAbertos + a.recebidosConcluidos))

  return NextResponse.json({ period, fromDay, toDay, desde: primeiro._min.day ?? null, byUser, byDept })
}
