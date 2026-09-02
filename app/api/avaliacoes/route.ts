import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { quemEh, filaDaCompetencia } from '@/lib/avaliacoes/regua'
import { competenciaAnterior, competencias } from '@/lib/avaliacoes/criterios'

// A FILA do mês: quem já foi avaliado e quem falta, no alcance de quem pergunta.
// A régua inteira vive em lib/avaliacoes/regua.ts — aqui só se pergunta a ela.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const quem = await quemEh((session.user as { id: string }).id)
  if (!quem) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const competencia = req.nextUrl.searchParams.get('competencia') || competenciaAnterior()
  const fila = await filaDaCompetencia(quem, competencia)

  return NextResponse.json({
    ...fila,
    disponiveis: competencias(12),
    eu: {
      id: quem.id,
      escopo: quem.escopo.tipo,
      avalia: quem.escopo.avaliaDepartmentIds.length,
      podeGerir: quem.role === 'ADMIN',
    },
  })
}
