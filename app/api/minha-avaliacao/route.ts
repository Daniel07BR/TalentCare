import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { competencias } from '@/lib/avaliacoes/criterios'

// O que a PESSOA vê de si mesma: as avaliações publicadas dela, da mais nova
// para a mais velha, com a nota por critério e o histórico para o gráfico.
//
// ⚠️⚠️ Rascunho NUNCA entra aqui. `status: 'publicada'` é a régua inteira — sem
// ela a pessoa leria o gestor pensando em voz alta, e o gestor deixaria de
// rascunhar por medo, que é o oposto do que o rascunho existe para permitir.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const meuId = (session.user as { id: string }).id

  // ⚠️ Um admin pode olhar a página de outra pessoa passando ?id=. Qualquer
  // outro só vê a si mesmo — e a checagem é aqui, no servidor.
  const pedido = req.nextUrl.searchParams.get('id')
  const eu = await prisma.user.findUnique({
    where: { id: meuId },
    select: { id: true, role: true },
  })
  const alvoId = pedido && eu?.role === 'ADMIN' ? pedido : meuId

  const avaliacoes = await prisma.avaliacao.findMany({
    where: { avaliadoId: alvoId, status: 'publicada' },
    orderBy: { competencia: 'desc' },
    take: 24,
    include: {
      notas: true,
      ciencia: true,
      versoes: { orderBy: { versao: 'desc' }, select: { versao: true, motivo: true, media: true, publishedAt: true } },
    },
  })

  const avaliadorIds = [...new Set(avaliacoes.map((a) => a.avaliadorId))]
  const avaliadores = await prisma.user.findMany({
    where: { id: { in: avaliadorIds } },
    select: { id: true, name: true, jobTitle: true },
  })
  const nomeDe = new Map(avaliadores.map((a) => [a.id, a]))

  const pessoa = await prisma.user.findUnique({
    where: { id: alvoId },
    select: { id: true, name: true, jobTitle: true, avatarUrl: true, department: { select: { name: true } } },
  })

  return NextResponse.json({
    pessoa: pessoa && {
      id: pessoa.id, nome: pessoa.name, cargo: pessoa.jobTitle ?? 'Colaborador',
      setor: pessoa.department?.name ?? 'Sem setor', hasAvatar: !!pessoa.avatarUrl,
    },
    souEu: alvoId === meuId,
    // Últimas competências, para a pessoa ver que meses ficaram SEM avaliação —
    // um mês ausente é informação, e escondê-lo faria o gráfico mentir por
    // omissão sobre a regularidade da avaliação.
    esperadas: competencias(12),
    avaliacoes: avaliacoes.map((a) => ({
      id: a.id,
      competencia: a.competencia,
      media: a.media,
      versao: a.versao,
      comentario: a.comentario,
      publishedAt: a.publishedAt,
      avaliador: nomeDe.get(a.avaliadorId)?.name ?? 'Avaliador',
      avaliadorCargo: nomeDe.get(a.avaliadorId)?.jobTitle ?? null,
      notas: a.notas.map((n) => ({ criterio: n.criterio, nota: n.nota, justificativa: n.justificativa })),
      ciencia: a.ciencia && {
        cienteEm: a.ciencia.cienteEm, comentario: a.ciencia.comentario,
        versaoCiente: a.ciencia.versaoCiente, lidoEm: a.ciencia.lidoEm,
      },
      // ⚠️ Ciência de uma versão ANTERIOR não vale para a atual: a pessoa deu
      // ciência de um texto que mudou depois.
      precisaCienciaNova: !!a.ciencia && a.ciencia.versaoCiente < a.versao,
      versoes: a.versoes,
    })),
  })
}
