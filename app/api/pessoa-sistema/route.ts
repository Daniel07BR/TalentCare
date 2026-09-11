import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { rangeDaRequisicao } from '@/lib/period-range'
import { quemEh, podeVer } from '@/lib/avaliacoes/regua'
import { detalheDaPessoa, SISTEMAS, type Sistema } from '@/lib/pessoa-sistema'

export const dynamic = 'force-dynamic'

/* O que uma pessoa fez num sistema, no período — o clique no nome dela nos
   resumos. ⚠️⚠️ A régua é a da FICHA (`podeVer`): quem não pode abrir a ficha
   da pessoa não vê o que ela fez. Ver `lib/pessoa-sistema.ts`. */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const sp = req.nextUrl.searchParams
  const sistema = sp.get('sistema') as Sistema
  if (!SISTEMAS.includes(sistema)) return NextResponse.json({ error: 'sistema desconhecido' }, { status: 400 })
  const alvo = await prisma.user.findUnique({ where: { id: sp.get('id') ?? '' }, select: { id: true, name: true, nexusUserId: true, departmentId: true } })
  if (!alvo) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })
  const quem = await quemEh((session.user as { id: string }).id)
  if (!quem || !podeVer(quem, alvo)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  const { fromDay, toDay } = rangeDaRequisicao(req)
  const d = await detalheDaPessoa(sistema, alvo, fromDay, toDay)
  return NextResponse.json({ fromDay, toDay, ...d }, { status: d.erro ? 502 : 200 })
}
