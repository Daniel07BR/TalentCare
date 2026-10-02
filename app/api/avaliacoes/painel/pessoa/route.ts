import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { quemEh } from '@/lib/avaliacoes/regua'
import { avaliacaoLiberada } from '@/lib/avaliacoes/criterios'
import { acessaSetor, painelDaPessoa, setorDoEndereco } from '@/lib/avaliacoes/painel'

/** O histórico de UMA pessoa. `?setor=<endereço>&pessoa=<endereço>&meses=`. */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const quem = await quemEh((session.user as { id: string }).id)
  if (!quem) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const setor = await setorDoEndereco(req.nextUrl.searchParams.get('setor') ?? '')
  if (!setor) return NextResponse.json({ error: 'Setor não encontrado' }, { status: 404 })
  // Só os setores com a avaliação liberada (T.I, por ora — 02/10/2026).
  if (!avaliacaoLiberada(setor.nome)) return NextResponse.json({ error: 'A avaliação ainda não foi liberada para este setor.' }, { status: 404 })
  if (!acessaSetor(quem, setor.id)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const r = await painelDaPessoa(quem, setor, req.nextUrl.searchParams.get('pessoa') ?? '', Number(req.nextUrl.searchParams.get('meses') ?? 12))
  if (!r) return NextResponse.json({ error: 'Pessoa não encontrada neste setor' }, { status: 404 })
  return NextResponse.json(r)
}
