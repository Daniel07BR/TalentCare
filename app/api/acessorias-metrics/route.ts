import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { rangeDaRequisicao } from '@/lib/period-range'
import { quemEh, podeVer } from '@/lib/avaliacoes/regua'

/* ============================================================
   ACESSÓRIAS — o VOLUME de cada pessoa no período (30/09/2026).

   Decisão do dono: *"no TalentCare mostra só volume de cada usuário, pois lá são
   os indicadores dos funcionários dos departamentos"*. Então aqui só sai o que
   se FEZ — processos iniciados e concluídos, entregas de obrigação e solicitações
   finalizadas. ⚠️⚠️ Nada de "atrasadas" e nada de nota: em 30/09/2026 o
   escritório implantava o Acessórias, e atraso ali media quem ainda não dá
   baixa, não quem atrasa trabalho. Por isso esta rota é À PARTE do
   `dept-metrics` — o que entra lá entra no score.

   ?dept=<departmentId>  → as pessoas do setor que têm algum volume
   ?pessoa=<userId>      → uma pessoa (a ficha)
   A mesma régua das outras: gestor só o setor dele; a ficha passa por `podeVer`.
   ============================================================ */

type Soma = { iniciados: number; concluidos: number; entregas: number; solicitacoes: number }

async function somaPorNexus(nx: string[], fromDay: string, toDay: string): Promise<Map<string, Soma>> {
  if (!nx.length) return new Map()
  const g = await prisma.acessoriasDaily.groupBy({
    by: ['nexusUserId'],
    where: { nexusUserId: { in: nx }, day: { gte: fromDay, lte: toDay } },
    _sum: { processosIniciados: true, processosConcluidos: true, entregas: true, solicitacoesFinalizadas: true },
  })
  return new Map(g.map((r) => [r.nexusUserId, {
    iniciados: r._sum.processosIniciados ?? 0,
    concluidos: r._sum.processosConcluidos ?? 0,
    entregas: r._sum.entregas ?? 0,
    solicitacoes: r._sum.solicitacoesFinalizadas ?? 0,
  }]))
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const quem = await quemEh((session.user as { id: string }).id)
  if (!quem) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  const { fromDay, toDay } = rangeDaRequisicao(req)
  const sp = req.nextUrl.searchParams

  /* Até quando a cópia está em dia — a passada mais recente do coletor.
     ⚠️ O watermark avança mesmo quando nada veio; o que se mostra é a hora da
     última passada, e a tela diz "fonte em implantação" ao lado. */
  const wm = await prisma.syncWatermark.findUnique({ where: { source: 'acessorias' } })
  const atualizadoEm = wm?.lastSyncedAt?.toISOString() ?? null

  const pessoaId = sp.get('pessoa')
  if (pessoaId) {
    const user = await prisma.user.findUnique({ where: { id: pessoaId }, select: { id: true, nexusUserId: true, departmentId: true } })
    if (!user) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })
    if (!podeVer(quem, user)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    const soma = user.nexusUserId ? (await somaPorNexus([user.nexusUserId], fromDay, toDay)).get(user.nexusUserId) : undefined
    /* ⚠️ "Tem conta no Acessórias?" separa o zero de quem trabalha lá e ficou
       parado do zero de quem nem usa o sistema — o segundo não é assunto. */
    const vinculado = user.nexusUserId
      ? (await prisma.acessoriasUsuario.count({ where: { nexusUserId: user.nexusUserId } })) > 0
      : false
    return NextResponse.json({ fromDay, toDay, atualizadoEm, vinculado, ...(soma ?? { iniciados: 0, concluidos: 0, entregas: 0, solicitacoes: 0 }) })
  }

  /* ?dept= → um setor; sem ?dept= → a casa inteira (a página /acessorias), só para
     quem enxerga tudo. */
  const deptId = sp.get('dept')
  if (deptId) {
    const dept = await prisma.department.findUnique({ where: { id: deptId }, select: { id: true } })
    if (!dept) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })
    const podeVerSetor =
      quem.escopo.tipo === 'tudo' || quem.escopo.avaliaDepartmentIds.includes(dept.id) || quem.departmentId === dept.id
    if (!podeVerSetor) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  } else if (quem.escopo.tipo !== 'tudo') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const gente = await prisma.user.findMany({
    where: { ...(deptId ? { departmentId: deptId } : {}), origin: { in: ['nexus', 'staff'] }, foraDoDiretorio: false, nexusUserId: { not: null } },
    select: { id: true, name: true, jobTitle: true, avatarUrl: true, nexusUserId: true, department: { select: { name: true } } },
  })
  const somas = await somaPorNexus(gente.map((p) => p.nexusUserId!), fromDay, toDay)
  // ⚠️ Só quem TEM volume — listar o setor inteiro com zeros acusaria quem nem usa o Acessórias.
  const pessoas = gente
    .map((p) => ({ id: p.id, nome: p.name, cargo: p.jobTitle ?? 'Colaborador', setor: p.department?.name ?? '—', hasAvatar: !!p.avatarUrl, ...(somas.get(p.nexusUserId!) ?? { iniciados: 0, concluidos: 0, entregas: 0, solicitacoes: 0 }) }))
    .filter((p) => p.iniciados + p.concluidos + p.entregas + p.solicitacoes > 0)
    .sort((a, b) => b.concluidos + b.entregas - (a.concluidos + a.entregas) || b.iniciados - a.iniciados)
  const total = pessoas.reduce(
    (t, p) => ({ iniciados: t.iniciados + p.iniciados, concluidos: t.concluidos + p.concluidos, entregas: t.entregas + p.entregas, solicitacoes: t.solicitacoes + p.solicitacoes }),
    { iniciados: 0, concluidos: 0, entregas: 0, solicitacoes: 0 },
  )
  return NextResponse.json({ fromDay, toDay, atualizadoEm, total, pessoas })
}
