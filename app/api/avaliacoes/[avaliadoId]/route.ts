import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { quemEh, podeVer, podeAvaliar } from '@/lib/avaliacoes/regua'
import {
  CRITERIOS, competenciaAnterior, exigeJustificativa, mediaDe,
} from '@/lib/avaliacoes/criterios'

type Ctx = { params: Promise<{ avaliadoId: string }> }

/** Avaliadores gravados do setor da pessoa (a régua de `podeAvaliar`). */
async function avaliadoresDoSetor(departmentId: string | null): Promise<Set<string>> {
  if (!departmentId) return new Set()
  const rows = await prisma.setorAvaliador.findMany({ where: { departmentId }, select: { userId: true } })
  return new Set(rows.map((r) => r.userId))
}

// ── LER ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, ctx: Ctx) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const quem = await quemEh((session.user as { id: string }).id)
  if (!quem) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { avaliadoId } = await ctx.params
  const competencia = req.nextUrl.searchParams.get('competencia') || competenciaAnterior()

  const alvo = await prisma.user.findUnique({
    where: { id: avaliadoId },
    select: {
      id: true, name: true, jobTitle: true, avatarUrl: true, departmentId: true,
      nexusUserId: true, department: { select: { name: true } },
    },
  })
  if (!alvo) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })
  if (!podeVer(quem, alvo)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const doSetor = await avaliadoresDoSetor(alvo.departmentId)
  const posso = podeAvaliar(quem, alvo, doSetor)

  const av = await prisma.avaliacao.findUnique({
    where: { competencia_avaliadoId: { competencia, avaliadoId } },
    include: {
      notas: true,
      ciencia: true,
      versoes: { orderBy: { versao: 'desc' } },
    },
  })

  // ⚠️ RASCUNHO NÃO VAZA. Quem só pode ver (o próprio avaliado, um diretor
  // olhando de fora) recebe a avaliação apenas depois de publicada — senão a
  // pessoa leria o gestor pensando em voz alta.
  const publicada = av?.status === 'publicada'
  const podeLerConteudo = publicada || posso

  return NextResponse.json({
    competencia,
    criterios: CRITERIOS,
    pessoa: {
      id: alvo.id, nome: alvo.name, cargo: alvo.jobTitle ?? 'Colaborador',
      setor: alvo.department?.name ?? 'Sem setor', hasAvatar: !!alvo.avatarUrl,
      departmentId: alvo.departmentId, nexusUserId: alvo.nexusUserId,
    },
    posso,
    souEu: alvo.id === quem.id,
    avaliacao: av && podeLerConteudo
      ? {
          id: av.id, status: av.status, versao: av.versao, media: av.media,
          comentario: av.comentario, publishedAt: av.publishedAt,
          avaliadorId: av.avaliadorId,
          notas: Object.fromEntries(av.notas.map((n) => [n.criterio, { nota: n.nota, justificativa: n.justificativa }])),
          ciencia: av.ciencia,
          versoes: av.versoes.map((v) => ({ versao: v.versao, motivo: v.motivo, media: v.media, publishedAt: v.publishedAt, notas: v.notas, comentario: v.comentario })),
        }
      : null,
    // Existe uma avaliação, mas quem pergunta ainda não pode ler o conteúdo.
    aguardandoPublicacao: !!av && !podeLerConteudo,
  })
}

// ── SALVAR RASCUNHO / PUBLICAR / CORRIGIR ────────────────────────────────────
export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const quem = await quemEh((session.user as { id: string }).id)
  if (!quem) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { avaliadoId } = await ctx.params
  const body = (await req.json()) as {
    competencia?: string
    acao?: 'rascunho' | 'publicar'
    comentario?: string | null
    motivo?: string | null
    notas?: Record<string, { nota: number | null; justificativa?: string | null }>
  }
  const competencia = body.competencia || competenciaAnterior()
  const acao = body.acao === 'publicar' ? 'publicar' : 'rascunho'

  const alvo = await prisma.user.findUnique({
    where: { id: avaliadoId },
    select: { id: true, departmentId: true },
  })
  if (!alvo) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })

  // ⚠️⚠️ A régua vale AQUI, no servidor, e não só no formulário. Rota que confia
  // na tela não tem regra nenhuma: basta um POST para se dar 10.
  const doSetor = await avaliadoresDoSetor(alvo.departmentId)
  if (!podeAvaliar(quem, alvo, doSetor)) {
    return NextResponse.json({ error: 'Você não avalia esta pessoa' }, { status: 403 })
  }

  // Normaliza e valida as notas.
  const entrada = body.notas ?? {}
  const notas: { criterio: string; nota: number | null; justificativa: string | null }[] = []
  const faltando: string[] = []
  for (const c of CRITERIOS) {
    const v = entrada[c.key]
    const bruto = v?.nota
    const nota = typeof bruto === 'number' && Number.isFinite(bruto) ? Math.max(0, Math.min(10, Math.round(bruto))) : null
    const just = (v?.justificativa ?? '').trim() || null
    // ⚠️⚠️ Justificativa obrigatória em nota extrema (< 5 ou > 8) — só na
    // PUBLICAÇÃO. Cobrar no rascunho impediria o gestor de rascunhar em partes.
    if (acao === 'publicar' && exigeJustificativa(nota) && !just) faltando.push(c.label)
    notas.push({ criterio: c.key, nota, justificativa: just })
  }
  if (faltando.length > 0) {
    return NextResponse.json({
      error: 'justificativa_obrigatoria',
      // A mensagem diz QUAIS, senão o gestor procura o campo pela tela inteira.
      detalhe: `Nota abaixo de 5 ou acima de 8 precisa de uma linha explicando: ${faltando.join(', ')}.`,
      criterios: faltando,
    }, { status: 422 })
  }
  if (acao === 'publicar' && notas.every((n) => n.nota === null)) {
    return NextResponse.json({ error: 'Não dá para publicar uma avaliação sem nenhuma nota.' }, { status: 422 })
  }

  const media = mediaDe(notas)
  const comentario = (body.comentario ?? '').trim() || null
  const existente = await prisma.avaliacao.findUnique({
    where: { competencia_avaliadoId: { competencia, avaliadoId } },
    include: { notas: true },
  })

  // ── CORREÇÃO de uma publicada ──────────────────────────────────────────────
  // ⚠️⚠️ Publicada não se edita por cima. A versão anterior é guardada inteira e
  // a correção exige motivo — as duas ficam visíveis para o avaliado. Uma nota
  // que pode ser reescrita depois de a pessoa ler e comentar não é registro.
  if (existente?.status === 'publicada' && acao === 'publicar') {
    const motivo = (body.motivo ?? '').trim()
    if (!motivo) {
      return NextResponse.json({
        error: 'motivo_obrigatorio',
        detalhe: 'Esta avaliação já foi publicada e a pessoa pode tê-la lido. Diga o que mudou e por quê.',
      }, { status: 422 })
    }
    const res = await prisma.$transaction(async (tx) => {
      await tx.avaliacaoVersao.create({
        data: {
          avaliacaoId: existente.id,
          versao: existente.versao,
          avaliadorId: existente.avaliadorId,
          publishedAt: existente.publishedAt,
          motivo,
          comentario: existente.comentario,
          media: existente.media,
          notas: existente.notas.map((n) => ({ criterio: n.criterio, nota: n.nota, justificativa: n.justificativa })),
        },
      })
      await tx.avaliacaoNota.deleteMany({ where: { avaliacaoId: existente.id } })
      await tx.avaliacaoNota.createMany({ data: notas.map((n) => ({ ...n, avaliacaoId: existente.id })) })
      return tx.avaliacao.update({
        where: { id: existente.id },
        data: {
          avaliadorId: quem.id, comentario, media,
          versao: existente.versao + 1, publishedAt: new Date(),
        },
      })
    })
    return NextResponse.json({ ok: true, id: res.id, status: res.status, versao: res.versao, media, corrigida: true })
  }

  // ── RASCUNHO ou PRIMEIRA PUBLICAÇÃO ────────────────────────────────────────
  // ⚠️ O rascunho é COMPARTILHADO pelos avaliadores do setor: a linha é única
  // por (competência, avaliado) e a baixa do mês é uma só, não importa qual dos
  // dois a fez. `avaliadorId` é quem salvou por último.
  const dados = {
    avaliadorId: quem.id,
    departmentId: alvo.departmentId, // congelado no setor de agora
    comentario,
    media,
    status: acao === 'publicar' ? 'publicada' : 'rascunho',
    publishedAt: acao === 'publicar' ? new Date() : null,
  }
  const av = await prisma.$transaction(async (tx) => {
    const row = await tx.avaliacao.upsert({
      where: { competencia_avaliadoId: { competencia, avaliadoId } },
      create: { competencia, avaliadoId, ...dados },
      update: dados,
    })
    await tx.avaliacaoNota.deleteMany({ where: { avaliacaoId: row.id } })
    await tx.avaliacaoNota.createMany({ data: notas.map((n) => ({ ...n, avaliacaoId: row.id })) })
    return row
  })

  return NextResponse.json({ ok: true, id: av.id, status: av.status, versao: av.versao, media })
}
