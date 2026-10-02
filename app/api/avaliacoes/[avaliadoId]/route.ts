import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { quemEh, podeVer, podeAvaliar, type Setor } from '@/lib/avaliacoes/regua'
import {
  CRITERIOS, competenciaAnterior, exigeJustificativa, mediaDe,
} from '@/lib/avaliacoes/criterios'
import type { Prisma } from '@prisma/client'
import { reguaDoSetor, type Gestao } from '@/lib/avaliacoes/metodo'

type Ctx = { params: Promise<{ avaliadoId: string }> }

/**
 * ⚠️⚠️ Quem LÊ o que é só da gestão: quem avalia a pessoa, ou a Diretoria — e
 * NUNCA a própria pessoa, nem quando ela é ADMIN olhando a si mesma.
 */
const leGestao = (quem: { id: string; role: string }, alvoId: string, posso: boolean) =>
  alvoId !== quem.id && (posso || quem.role === 'ADMIN')

/**
 * O contexto do setor da pessoa: quem avalia ali, em que nível, e se o setor
 * responde à Diretoria.
 *
 * ⚠️⚠️ Montado do MESMO jeito que em `filaDaCompetencia`. Se as duas contas
 * divergirem, a tela oferece o botão de avaliar e a rota responde 403 — o pior
 * tipo de bug de permissão, porque parece defeito da tela.
 */
async function contextoDoSetor(departmentId: string | null): Promise<Setor> {
  if (!departmentId) return { niveis: new Map(), pelaDiretoria: false }
  const [rows, dept] = await Promise.all([
    prisma.setorAvaliador.findMany({ where: { departmentId }, select: { userId: true, nivel: true } }),
    prisma.department.findUnique({ where: { id: departmentId }, select: { avaliadoPelaDiretoria: true } }),
  ])
  return {
    niveis: new Map(rows.map((r) => [r.userId, r.nivel])),
    pelaDiretoria: !!dept?.avaliadoPelaDiretoria,
  }
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

  const posso = podeAvaliar(quem, alvo, await contextoDoSetor(alvo.departmentId))
  const gestaoVisivel = leGestao(quem, alvo.id, posso)

  const av = await prisma.avaliacao.findUnique({
    where: { competencia_avaliadoId: { competencia, avaliadoId } },
    include: {
      notas: true,
      ciencia: true,
      versoes: { orderBy: { versao: 'desc' } },
      gestao: gestaoVisivel,
      // Só os metadados: as imagens vêm pela rota `/documento`, uma de cada vez.
      documento: { select: { frenteTipo: true, versoTipo: true, concluidaEm: true, concluidaPorId: true, versaoAssinada: true } },
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
    // A régua escrita do setor: o que cada nível significa no cargo.
    regua: reguaDoSetor(alvo.department?.name),
    // `null` = esta pessoa não lê a parte da gestão (o bloco nem aparece).
    gestaoVisivel,
    avaliacao: av && podeLerConteudo
      ? {
          id: av.id, status: av.status, versao: av.versao, media: av.media,
          comentario: av.comentario, combinado: av.combinado, publishedAt: av.publishedAt,
          documento: av.documento
            ? {
                temFrente: !!av.documento.frenteTipo, temVerso: !!av.documento.versoTipo,
                // O PDF é pesado: pergunta só se existe, sem trazer os bytes.
                temPdf: (await prisma.avaliacaoDocumento.count({ where: { avaliacaoId: av.id, pdf: { not: null } } })) > 0,
                concluidaEm: av.documento.concluidaEm, versaoAssinada: av.documento.versaoAssinada,
                concluidaPor: av.documento.concluidaPorId
                  ? (await prisma.user.findUnique({ where: { id: av.documento.concluidaPorId }, select: { name: true } }))?.name ?? null
                  : null,
              }
            : null,
          gestao: gestaoVisivel && av.gestao
            ? { querNaEquipe: av.gestao.querNaEquipe, prontoParaMais: av.gestao.prontoParaMais, emRisco: av.gestao.emRisco, anotacao: av.gestao.anotacao }
            : null,
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
    combinado?: string | null
    gestao?: Partial<Gestao> | null
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
  if (!podeAvaliar(quem, alvo, await contextoDoSetor(alvo.departmentId))) {
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
      detalhe: `"Abaixo do esperado" e "Acima do esperado" precisam de uma linha explicando: ${faltando.join(', ')}.`,
      criterios: faltando,
    }, { status: 422 })
  }
  /* ⚠️ Com três critérios que sempre se aplicam (01/10/2026), publicar exige os
     três: média de dois deles seria lida como a avaliação inteira. */
  const semNota = notas.filter((n) => n.nota === null)
  if (acao === 'publicar' && semNota.length > 0 && semNota.length < notas.length) {
    return NextResponse.json({
      error: 'criterio_sem_nota',
      detalhe: `Falta escolher o nível de: ${semNota.map((n) => CRITERIOS.find((c) => c.key === n.criterio)?.label).join(', ')}.`,
    }, { status: 422 })
  }
  if (acao === 'publicar' && notas.every((n) => n.nota === null)) {
    return NextResponse.json({ error: 'Não dá para publicar uma avaliação sem nenhuma nota.' }, { status: 422 })
  }

  const media = mediaDe(notas)
  const comentario = (body.comentario ?? '').trim() || null
  const combinado = (body.combinado ?? '').trim() || null

  // A parte da gestão, normalizada. Só quem AVALIA grava (a régua acima já
  // barrou quem não avalia); booleano ou nulo, nada além disso.
  const g = body.gestao ?? {}
  const sn = (v: unknown) => (typeof v === 'boolean' ? v : null)
  const gestao = {
    querNaEquipe: sn(g.querNaEquipe), prontoParaMais: sn(g.prontoParaMais), emRisco: sn(g.emRisco),
    anotacao: (typeof g.anotacao === 'string' ? g.anotacao.trim() : '') || null,
    updatedById: quem.id,
  }
  const gravarGestao = (tx: Prisma.TransactionClient, avaliacaoId: string) =>
    tx.avaliacaoGestao.upsert({ where: { avaliacaoId }, create: { avaliacaoId, ...gestao }, update: gestao })
  const existente = await prisma.avaliacao.findUnique({
    where: { competencia_avaliadoId: { competencia, avaliadoId } },
    include: { notas: true, documento: { select: { concluidaEm: true } } },
  })

  // ⚠️⚠️ A TRAVA (02/10/2026): com o documento assinado anexado e a avaliação
  // concluída, nada mais muda — nem rascunho, nem correção, nem a gestão. O que
  // está no papel e o que está no sistema têm de ser a mesma coisa.
  if (existente?.documento?.concluidaEm) {
    return NextResponse.json({
      error: 'avaliacao_concluida',
      detalhe: 'Esta avaliação foi concluída com o documento assinado e não pode mais ser alterada.',
    }, { status: 409 })
  }

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
          combinado: existente.combinado,
          media: existente.media,
          notas: existente.notas.map((n) => ({ criterio: n.criterio, nota: n.nota, justificativa: n.justificativa })),
        },
      })
      await tx.avaliacaoNota.deleteMany({ where: { avaliacaoId: existente.id } })
      await tx.avaliacaoNota.createMany({ data: notas.map((n) => ({ ...n, avaliacaoId: existente.id })) })
      await gravarGestao(tx, existente.id)
      return tx.avaliacao.update({
        where: { id: existente.id },
        data: {
          avaliadorId: quem.id, comentario, combinado, media,
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
    combinado,
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
    await gravarGestao(tx, row.id)
    return row
  })

  return NextResponse.json({ ok: true, id: av.id, status: av.status, versao: av.versao, media })
}
