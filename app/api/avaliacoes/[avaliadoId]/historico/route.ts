import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { quemEh, podeVer, podeAvaliar, contextoDoSetor } from '@/lib/avaliacoes/regua'
import { nivelDe } from '@/lib/avaliacoes/criterios'

/**
 * TODAS as avaliações já feitas de uma pessoa (02/10/2026) — a janela "Histórico"
 * da área do setor. Sem limite de meses: é a lista para achar e abrir qualquer uma.
 *
 * ⚠️ Só o NOME do nível, nunca número. Rascunho só aparece para quem pode avaliar
 * a pessoa (é o gestor pensando em voz alta).
 */
export async function GET(_req: Request, ctx: { params: Promise<{ avaliadoId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const quem = await quemEh((session.user as { id: string }).id)
  if (!quem) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { avaliadoId } = await ctx.params
  const alvo = await prisma.user.findUnique({ where: { id: avaliadoId }, select: { id: true, departmentId: true } })
  if (!alvo) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })
  if (!podeVer(quem, alvo)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  const posso = podeAvaliar(quem, alvo, await contextoDoSetor(alvo.departmentId))

  const avs = await prisma.avaliacao.findMany({
    where: { avaliadoId, ...(posso ? {} : { status: 'publicada' }) },
    orderBy: { competencia: 'desc' },
    select: {
      competencia: true, status: true, media: true, versao: true, publishedAt: true, avaliadorId: true,
      ciencia: { select: { cienteEm: true, versaoCiente: true, comentario: true } },
      documento: { select: { concluidaEm: true } },
    },
  })
  const nomes = new Map((await prisma.user.findMany({
    where: { id: { in: [...new Set(avs.map((a) => a.avaliadorId))] } }, select: { id: true, name: true },
  })).map((u) => [u.id, u.name]))

  return NextResponse.json({
    posso,
    avaliacoes: avs.map((a) => ({
      competencia: a.competencia,
      status: a.status,
      nivel: a.status === 'publicada' && a.media != null ? nivelDe(a.media).key : null,
      versao: a.versao,
      publicadaEm: a.publishedAt,
      avaliador: nomes.get(a.avaliadorId) ?? 'Avaliador',
      ciente: !!a.ciencia && a.ciencia.versaoCiente === a.versao,
      comentou: !!a.ciencia?.comentario,
      concluidaEm: a.documento?.concluidaEm ?? null,
    })),
  })
}
