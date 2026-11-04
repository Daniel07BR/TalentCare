import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { quemEh, podeVer, podeAvaliar, contextoDoSetor, type Quem } from '@/lib/avaliacoes/regua'
import { competenciaAnterior } from '@/lib/avaliacoes/criterios'

/* ============================================================
   O DOCUMENTO ASSINADO da avaliação (02/10/2026) — pedido do Daniel: "a
   avaliação só deve ser concluída sem opção de edição após eu subir a imagem de
   frente e verso do documento assinado pelo usuário".
   04/11/2026: basta a FOLHA onde a pessoa assina e escreve o parecer. O resto já
   está no sistema. No banco, a foto segue na coluna `frente`.

   GET   ?lado=frente|pdf → o arquivo (quem pode ver a avaliação, inclusive o avaliado)
   POST  multipart lado+arquivo → guarda a foto ou o PDF (troca enquanto não concluída)
   PATCH { acao: 'concluir' }  → exige a foto OU o PDF, e TRAVA a avaliação
   PATCH { acao: 'parecer', parecer } → grava o que a pessoa escreveu na folha.
     ⚠️ Vale depois de concluir: transcreve o papel e não muda a avaliação. Cada texto
     substituído fica em `parecerHistorico`.

   ⚠️⚠️ Só quem AVALIA a pessoa (ou a Diretoria) sobe e conclui. O avaliado não:
   o documento é a prova de que ele assinou, e quem prova não pode ser quem
   anexa a prova sobre si mesmo.
   ============================================================ */

type Ctx = { params: Promise<{ avaliadoId: string }> }
const TIPOS = ['image/jpeg', 'image/png', 'image/webp']
const MAX = 5 * 1024 * 1024
// PDF escaneado pesa mais que foto comprimida (não dá para reduzir no navegador).
const MAX_PDF = 15 * 1024 * 1024
const MAX_PARECER = 5000
type Lado = 'frente' | 'pdf'
const ladoDe = (v: unknown): Lado => (v === 'pdf' ? 'pdf' : 'frente')

async function contexto(req: NextRequest, ctx: Ctx, competenciaBody?: string) {
  const session = await auth()
  if (!session?.user) return { erro: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) }
  const quem = await quemEh((session.user as { id: string }).id)
  if (!quem) return { erro: NextResponse.json({ error: 'Sem permissão' }, { status: 403 }) }
  const { avaliadoId } = await ctx.params
  const competencia = competenciaBody || req.nextUrl.searchParams.get('competencia') || competenciaAnterior()
  const alvo = await prisma.user.findUnique({ where: { id: avaliadoId }, select: { id: true, departmentId: true } })
  if (!alvo) return { erro: NextResponse.json({ error: 'não encontrado' }, { status: 404 }) }
  if (!podeVer(quem, alvo)) return { erro: NextResponse.json({ error: 'Sem permissão' }, { status: 403 }) }
  const av = await prisma.avaliacao.findUnique({
    where: { competencia_avaliadoId: { competencia, avaliadoId } },
    select: { id: true, status: true, versao: true, documento: { select: { concluidaEm: true, frenteTipo: true } } },
  })
  if (!av || av.status !== 'publicada') {
    return { erro: NextResponse.json({ error: 'O documento só existe para avaliação publicada.' }, { status: 404 }) }
  }
  return { quem, alvo, av }
}

async function podeAnexar(quem: Quem, alvo: { id: string; departmentId: string | null }) {
  if (alvo.id === quem.id) return false
  return quem.role === 'ADMIN' || podeAvaliar(quem, alvo, await contextoDoSetor(alvo.departmentId))
}

// ── VER uma imagem ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, ctx: Ctx) {
  const c = await contexto(req, ctx)
  if ('erro' in c) return c.erro
  const lado = ladoDe(req.nextUrl.searchParams.get('lado'))
  const doc = await prisma.avaliacaoDocumento.findUnique({
    where: { avaliacaoId: c.av.id },
    select: lado === 'frente' ? { frente: true, frenteTipo: true } : { pdf: true },
  }) as { frente?: Uint8Array | null; frenteTipo?: string | null; pdf?: Uint8Array | null } | null
  const bytes = lado === 'frente' ? doc?.frente : doc?.pdf
  if (!bytes) return NextResponse.json({ error: 'sem arquivo' }, { status: 404 })
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': lado === 'pdf' ? 'application/pdf' : doc?.frenteTipo ?? 'image/jpeg',
      'Content-Disposition': lado === 'pdf' ? 'inline; filename="avaliacao-assinada.pdf"' : 'inline',
      // ⚠️ Documento pessoal assinado: nunca em cache compartilhado.
      'Cache-Control': 'private, no-store',
    },
  })
}

// ── SUBIR um lado ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest, ctx: Ctx) {
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Envio inválido.' }, { status: 400 })
  const c = await contexto(req, ctx, String(form.get('competencia') ?? '') || undefined)
  if ('erro' in c) return c.erro
  if (!(await podeAnexar(c.quem, c.alvo))) {
    return NextResponse.json({ error: 'Só quem avalia esta pessoa anexa o documento assinado.' }, { status: 403 })
  }
  if (c.av.documento?.concluidaEm) {
    return NextResponse.json({ error: 'Avaliação concluída: o documento assinado já foi anexado e não se troca.' }, { status: 409 })
  }
  const lado = ladoDe(form.get('lado'))
  const arq = form.get('arquivo')
  if (!(arq instanceof File)) return NextResponse.json({ error: 'Falta o arquivo.' }, { status: 400 })
  const bytes = new Uint8Array(await arq.arrayBuffer())
  if (lado === 'pdf') {
    // ⚠️ Confere a ASSINATURA do arquivo ("%PDF"), e não só o tipo que o navegador declarou.
    const ehPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
    if (!ehPdf) return NextResponse.json({ error: 'O arquivo não é um PDF.' }, { status: 415 })
    if (arq.size > MAX_PDF) return NextResponse.json({ error: 'PDF acima de 15 MB. Escaneie em resolução menor.' }, { status: 413 })
  } else {
    if (!TIPOS.includes(arq.type)) return NextResponse.json({ error: 'Envie uma foto (JPG, PNG ou WebP).' }, { status: 415 })
    if (arq.size > MAX) return NextResponse.json({ error: 'Imagem acima de 5 MB.' }, { status: 413 })
  }

  const dados = lado === 'frente'
    ? { frente: bytes, frenteTipo: arq.type, enviadoPorId: c.quem.id }
    : { pdf: bytes, enviadoPorId: c.quem.id }
  await prisma.avaliacaoDocumento.upsert({
    where: { avaliacaoId: c.av.id },
    create: { avaliacaoId: c.av.id, ...dados },
    update: dados,
  })
  return NextResponse.json({ ok: true, lado })
}

// ── CONCLUIR (a trava) ────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const body = (await req.json().catch(() => ({}))) as { competencia?: string; acao?: string; parecer?: unknown }
  if (body.acao !== 'concluir' && body.acao !== 'parecer') return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 })
  const c = await contexto(req, ctx, body.competencia)
  if ('erro' in c) return c.erro
  if (!(await podeAnexar(c.quem, c.alvo))) {
    return NextResponse.json({ error: body.acao === 'parecer' ? 'Só quem avalia esta pessoa digita o parecer.' : 'Só quem avalia esta pessoa conclui a avaliação.' }, { status: 403 })
  }
  if (body.acao === 'parecer') {
    if (typeof body.parecer !== 'string') return NextResponse.json({ error: 'Falta o texto do parecer.' }, { status: 400 })
    const parecer = body.parecer.trim() || null
    if (parecer && parecer.length > MAX_PARECER) return NextResponse.json({ error: `O parecer passa de ${MAX_PARECER} caracteres.` }, { status: 400 })
    const avaliacaoId = c.av.id, porId = c.quem.id
    // ⚠️ Na mesma transação: não existe troca de texto sem o rastro do texto anterior.
    await prisma.$transaction(async (tx) => {
      const atual = await tx.avaliacaoDocumento.findUnique({
        where: { avaliacaoId },
        select: { parecer: true, parecerPorId: true, parecerEm: true, parecerHistorico: true },
      })
      if ((atual?.parecer ?? null) === parecer) return
      const historico = Array.isArray(atual?.parecerHistorico) ? atual.parecerHistorico : []
      const dados = {
        parecer, parecerPorId: porId, parecerEm: new Date(),
        parecerHistorico: atual?.parecer
          ? [...historico, { texto: atual.parecer, porId: atual.parecerPorId, em: atual.parecerEm }]
          : historico,
      }
      await tx.avaliacaoDocumento.upsert({ where: { avaliacaoId }, create: { avaliacaoId, ...dados }, update: dados })
    })
    return NextResponse.json({ ok: true })
  }
  if (c.av.documento?.concluidaEm) return NextResponse.json({ ok: true, jaConcluida: true })
  // `pdf` não vem no select de contexto (é pesado): pergunta só se existe.
  const temPdf = (await prisma.avaliacaoDocumento.count({ where: { avaliacaoId: c.av.id, pdf: { not: null } } })) > 0
  if (!temPdf && !c.av.documento?.frenteTipo) {
    return NextResponse.json({ error: 'Anexe a foto da folha assinada, ou o PDF, antes de concluir.' }, { status: 422 })
  }
  // ⚠️ Condicional: duas abas concluindo ao mesmo tempo gravam uma vez só.
  await prisma.avaliacaoDocumento.updateMany({
    where: { avaliacaoId: c.av.id, concluidaEm: null },
    data: { concluidaEm: new Date(), concluidaPorId: c.quem.id, versaoAssinada: c.av.versao },
  })
  return NextResponse.json({ ok: true })
}
