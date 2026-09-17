import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { rangeDaRequisicao } from '@/lib/period-range'
import { alcanceDeQuemLe, porNexus, porDeptNexus } from '@/lib/alcance'
import type { Period } from '@/lib/mock/dashboard'

// Os CHAMADOS do FLUXO no PERÍODO, lidos do espelho local. Duas visões que a
// tela precisa e que NÃO se somam:
//   byUser — chamados e tarefas por pessoa
//   byDept — chamados por setor, nas duas faces (pediu × recebeu)
//
// ⚠️⚠️ Isto era `/api/chat-metrics` até 16/09/2026, quando os chamados saíram do
// Chat Interno. Lá ficaram as mensagens, e só elas.
export async function GET(req: NextRequest) {
  /* ⚠️⚠️ ESTA ROTA DEVOLVIA A EMPRESA INTEIRA para qualquer sessão autenticada.
     O middleware não alcança isto: ele conhece o caminho, e o caminho é igual
     para todo setor. Ver `lib/alcance.ts`. */
  const alcance = await alcanceDeQuemLe()
  if (!alcance) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { period, fromDay, toDay } = rangeDaRequisicao(req)
  const range = { day: { gte: fromDay, lte: toDay } }

  const [rows, deptRows, primeiro] = await Promise.all([
    prisma.fluxoDaily.groupBy({
      by: ['nexusUserId'],
      where: { ...range, ...porNexus(alcance) },
      _sum: {
        chamadosAbertos: true, chamadosAssumidos: true, chamadosConcluidos: true,
        segundosResolucao: true,
        tarefasAbertas: true, tarefasAssumidas: true, tarefasConcluidas: true,
      },
    }),
    prisma.fluxoDeptDaily.groupBy({
      by: ['nexusDepartmentId'],
      // ⚠️ Esta tabela é por SETOR: a chave é `nexusDepartmentId`, não
      // `nexusUserId`. Com o filtro errado o `where` viraria uma coluna que não
      // existe — ou pior, num Prisma mais permissivo, filtro nenhum.
      where: { ...range, ...porDeptNexus(alcance) },
      _sum: {
        pedidosAbertos: true, pedidosConcluidos: true,
        recebidosAbertos: true, recebidosConcluidos: true, recebidosCancelados: true,
        segundosResolucao: true,
      },
    }),
    // ⚠️ Desde quando HÁ dado. A tela avisa, senão o filtro de Ano parece bug:
    // chamado entre setores só existe desde 21/08/2026 — antes disso a coisa não
    // existia, e não é que ninguém tenha pedido nada. (Os 105 do Chat vieram
    // para cá com a data original: a janela é a mesma de sempre.)
    // ⚠️ Recortado também: o dia mais antigo da EMPRESA diria a quem lê desde
    // quando existe dado de gente que ele não alcança.
    prisma.fluxoDaily.aggregate({ where: porNexus(alcance), _min: { day: true } }),
  ])

  const byUser = rows.map((r) => ({
    nexusUserId: r.nexusUserId,
    chamadosAbertos: r._sum.chamadosAbertos ?? 0,
    chamadosAssumidos: r._sum.chamadosAssumidos ?? 0,
    chamadosConcluidos: r._sum.chamadosConcluidos ?? 0,
    segundosResolucao: r._sum.segundosResolucao ?? 0,
    tarefasAbertas: r._sum.tarefasAbertas ?? 0,
    tarefasAssumidas: r._sum.tarefasAssumidas ?? 0,
    tarefasConcluidas: r._sum.tarefasConcluidas ?? 0,
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
      // Setor que existe no Fluxo mas ainda não no TalentCare aparece assim, em
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
