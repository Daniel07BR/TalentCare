import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { rangeDaRequisicao } from '@/lib/period-range'
import { quemEh } from '@/lib/avaliacoes/regua'
import { atendimentoDoSetor, ehRecepcao } from '@/lib/recepcao'

/* ============================================================
   ATENDIMENTO DA RECEPÇÃO — o card do setor (16/10/2026). Ver `lib/recepcao.ts`.

   ?dept=<departmentId> — obrigatório e tem de ser a Recepção (outro setor = 404: o card
   não existe lá). A régua é a das outras rotas por setor: a Diretoria vê tudo; o gestor,
   os setores que avalia e o próprio.
   ⚠️ Só CONTAGEM e nome de setor — empresa, contato e visitante não chegam ao TalentCare.
   ============================================================ */

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const quem = await quemEh((session.user as { id: string }).id)
  if (!quem) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const deptId = req.nextUrl.searchParams.get('dept')
  if (!deptId) return NextResponse.json({ error: 'Falta o setor.' }, { status: 400 })
  const dept = await prisma.department.findUnique({ where: { id: deptId }, select: { id: true, name: true } })
  if (!dept || !ehRecepcao(dept.name)) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })
  const podeVerSetor = quem.escopo.tipo === 'tudo' || quem.escopo.avaliaDepartmentIds.includes(dept.id) || quem.departmentId === dept.id
  if (!podeVerSetor) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { fromDay, toDay } = rangeDaRequisicao(req)
  return NextResponse.json(await atendimentoDoSetor(prisma, dept.id, fromDay, toDay))
}
