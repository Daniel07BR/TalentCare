import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { quemEh, podeVer } from '@/lib/avaliacoes/regua'
import { anotacoesDoDia } from '@/lib/anotacoes-do-fluxo'

/* O CLIQUE NO DIA do calendário da ficha (04/11/2026). Ver `lib/anotacoes-do-fluxo.ts`.
   ⚠️⚠️ Traz motivo, que pode ser de saúde: a régua é a da ficha (`podeVer`). O gestor e o sub só alcançam quem é do setor que
   chefiam; a Diretoria e a T.I, como no Fluxo; e a pessoa, a própria página. Sem cache. */
export async function GET(req: NextRequest) {
  const session = await auth()
  const uid = (session?.user as { id?: string } | undefined)?.id
  const quem = uid ? await quemEh(uid) : null
  if (!quem) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id') ?? ''
  const dia = req.nextUrl.searchParams.get('dia') ?? ''
  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return NextResponse.json({ error: 'Informe a pessoa e o dia.' }, { status: 400 })
  const alvo = await prisma.user.findUnique({ where: { id }, select: { id: true, departmentId: true, nexusUserId: true } })
  if (!alvo || !podeVer(quem, alvo)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  if (!alvo.nexusUserId) return NextResponse.json({ anotacoes: [] }, { headers: { 'Cache-Control': 'no-store' } })

  const anotacoes = await anotacoesDoDia(alvo.nexusUserId, dia)
  if (!anotacoes) return NextResponse.json({ error: 'O Fluxo não respondeu agora. Tente de novo em instantes.' }, { status: 502 })
  return NextResponse.json({ anotacoes }, { headers: { 'Cache-Control': 'no-store' } })
}
