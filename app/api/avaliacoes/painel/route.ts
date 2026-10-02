import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { quemEh } from '@/lib/avaliacoes/regua'
import { acessaSetor, painelDoSetor, setorDoEndereco } from '@/lib/avaliacoes/painel'
import { enderecoDe } from '@/lib/avaliacoes/endereco'
import { prisma } from '@/lib/db/prisma'

/**
 * O painel de avaliações de UM setor. `?setor=` aceita o endereço legível
 * (`ti-x8k2p9`) ou o id do setor (o cartão da página do departamento só tem o id).
 * `?meses=6|12|24`.
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const quem = await quemEh((session.user as { id: string }).id)
  if (!quem) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const pedido = req.nextUrl.searchParams.get('setor') ?? ''
  const porId = await prisma.department.findUnique({ where: { id: pedido }, select: { id: true, name: true } })
  const setor = porId
    ? { id: porId.id, nome: porId.name, endereco: enderecoDe({ id: porId.id, nome: porId.name }) }
    : await setorDoEndereco(pedido)
  if (!setor) return NextResponse.json({ error: 'Setor não encontrado' }, { status: 404 })
  if (!acessaSetor(quem, setor.id)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const meses = Number(req.nextUrl.searchParams.get('meses') ?? 12)
  return NextResponse.json(await painelDoSetor(quem, setor, meses))
}
