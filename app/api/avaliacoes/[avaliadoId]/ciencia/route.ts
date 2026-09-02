import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { competenciaAnterior } from '@/lib/avaliacoes/criterios'

// A CIÊNCIA do avaliado + o comentário dele.
//
// ⚠️⚠️ Só o PRÓPRIO avaliado dá ciência. Gestor não marca ciência por ninguém —
// se marcasse, a ciência deixaria de provar que a pessoa leu, que é a única
// coisa que ela existe para provar.
//
// ⚠️⚠️ O comentário NÃO altera a nota. Fica ao lado dela, permanente, e o
// avaliador é avisado. Deixar a reação mexer no número transformaria a
// avaliação numa negociação — venceria quem insistisse mais.
export async function POST(req: NextRequest, ctx: { params: Promise<{ avaliadoId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const meuId = (session.user as { id: string }).id

  const { avaliadoId } = await ctx.params
  if (avaliadoId !== meuId) {
    return NextResponse.json({ error: 'A ciência é de quem foi avaliado.' }, { status: 403 })
  }

  const body = (await req.json()) as { competencia?: string; comentario?: string | null }
  const competencia = body.competencia || competenciaAnterior()
  const comentario = (body.comentario ?? '').trim() || null

  const av = await prisma.avaliacao.findUnique({
    where: { competencia_avaliadoId: { competencia, avaliadoId } },
    select: { id: true, status: true, versao: true },
  })
  // ⚠️ Rascunho não recebe ciência: a pessoa não pode dar ciência do que ainda
  // não lhe foi mostrado.
  if (!av || av.status !== 'publicada') {
    return NextResponse.json({ error: 'Não há avaliação publicada nesta competência.' }, { status: 404 })
  }

  const dados = { versaoCiente: av.versao, cienteEm: new Date(), comentario, lidoEm: null }
  await prisma.avaliacaoCiencia.upsert({
    where: { avaliacaoId: av.id },
    // ⚠️ Ciência nova zera o `lidoEm`: se a pessoa comentar de novo depois de uma
    // correção, o avaliador tem de ver que há recado novo. Sem isso o comentário
    // chega marcado como já lido.
    create: { avaliacaoId: av.id, ...dados },
    update: dados,
  })

  return NextResponse.json({ ok: true, versaoCiente: av.versao })
}

// O avaliador marcando que LEU o comentário do avaliado.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ avaliadoId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const meuId = (session.user as { id: string }).id

  const { avaliadoId } = await ctx.params
  const body = (await req.json()) as { competencia?: string }
  const competencia = body.competencia || competenciaAnterior()

  const av = await prisma.avaliacao.findUnique({
    where: { competencia_avaliadoId: { competencia, avaliadoId } },
    select: { id: true, avaliadorId: true },
  })
  if (!av) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })
  if (av.avaliadorId !== meuId) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  await prisma.avaliacaoCiencia.update({
    where: { avaliacaoId: av.id },
    data: { lidoEm: new Date() },
  })
  return NextResponse.json({ ok: true })
}
