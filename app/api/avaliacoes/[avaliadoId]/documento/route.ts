import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { quemEh, podeVer, podeAvaliar, type Quem, type Setor } from '@/lib/avaliacoes/regua'
import { competenciaAnterior } from '@/lib/avaliacoes/criterios'

/* ============================================================
   O DOCUMENTO ASSINADO da avaliação (02/10/2026) — pedido do Daniel: "a
   avaliação só deve ser concluída sem opção de edição após eu subir a imagem de
   frente e verso do documento assinado pelo usuário".

   GET   ?lado=frente|verso|pdf → o arquivo (quem pode ver a avaliação, inclusive o avaliado)
   POST  multipart lado+arquivo → guarda um lado, ou o PDF único (troca enquanto não concluída)
   PATCH { acao: 'concluir' }  → exige frente E verso, OU o PDF único, e TRAVA a avaliação

   ⚠️⚠️ Só quem AVALIA a pessoa (ou a Diretoria) sobe e conclui. O avaliado não:
   o documento é a prova de que ele assinou, e quem prova não pode ser quem
   anexa a prova sobre si mesmo.
   ============================================================ */

type Ctx = { params: Promise<{ avaliadoId: string }> }
const TIPOS = ['image/jpeg', 'image/png', 'image/webp']
const MAX = 5 * 1024 * 1024
// PDF escaneado pesa mais que foto comprimida (não dá para reduzir no navegador).
const MAX_PDF = 15 * 1024 * 1024
type Lado = 'frente' | 'verso' | 'pdf'
const ladoDe = (v: unknown): Lado => (v === 'verso' ? 'verso' : v === 'pdf' ? 'pdf' : 'frente')

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
    select: { id: true, status: true, versao: true, documento: { select: { concluidaEm: true, frenteTipo: true, versoTipo: true } } },
  })
  if (!av || av.status !== 'publicada') {
    return { erro: NextResponse.json({ error: 'O documento só existe para avaliação publicada.' }, { status: 404 }) }
  }
  return { quem, alvo, av }
}

/** Mesmo contexto do setor que a rota da avaliação usa — a régua é UMA. */
async function setorDe(departmentId: string | null): Promise<Setor> {
  if (!departmentId) return { niveis: new Map(), pelaDiretoria: false }
  const [rows, dept] = await Promise.all([
    prisma.setorAvaliador.findMany({ where: { departmentId }, select: { userId: true, nivel: true } }),
    prisma.department.findUnique({ where: { id: departmentId }, select: { avaliadoPelaDiretoria: true } }),
  ])
  return { niveis: new Map(rows.map((r) => [r.userId, r.nivel])), pelaDiretoria: !!dept?.avaliadoPelaDiretoria }
}

async function podeAnexar(quem: Quem, alvo: { id: string; departmentId: string | null }) {
  if (alvo.id === quem.id) return false
  return quem.role === 'ADMIN' || podeAvaliar(quem, alvo, await setorDe(alvo.departmentId))
}

// ── VER uma imagem ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, ctx: Ctx) {
  const c = await contexto(req, ctx)
  if ('erro' in c) return c.erro
  const lado = ladoDe(req.nextUrl.searchParams.get('lado'))
  const doc = await prisma.avaliacaoDocumento.findUnique({
    where: { avaliacaoId: c.av.id },
    select: lado === 'frente' ? { frente: true, frenteTipo: true } : lado === 'verso' ? { verso: true, versoTipo: true } : { pdf: true },
  }) as { frente?: Uint8Array | null; frenteTipo?: string | null; verso?: Uint8Array | null; versoTipo?: string | null; pdf?: Uint8Array | null } | null
  const bytes = lado === 'frente' ? doc?.frente : lado === 'verso' ? doc?.verso : doc?.pdf
  if (!bytes) return NextResponse.json({ error: 'sem arquivo' }, { status: 404 })
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': lado === 'pdf' ? 'application/pdf' : (lado === 'frente' ? doc?.frenteTipo : doc?.versoTipo) ?? 'image/jpeg',
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
    : lado === 'verso'
      ? { verso: bytes, versoTipo: arq.type, enviadoPorId: c.quem.id }
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
  const body = (await req.json().catch(() => ({}))) as { competencia?: string; acao?: string }
  if (body.acao !== 'concluir') return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 })
  const c = await contexto(req, ctx, body.competencia)
  if ('erro' in c) return c.erro
  if (!(await podeAnexar(c.quem, c.alvo))) {
    return NextResponse.json({ error: 'Só quem avalia esta pessoa conclui a avaliação.' }, { status: 403 })
  }
  if (c.av.documento?.concluidaEm) return NextResponse.json({ ok: true, jaConcluida: true })
  // `pdf` não vem no select de contexto (é pesado): pergunta só se existe.
  const temPdf = (await prisma.avaliacaoDocumento.count({ where: { avaliacaoId: c.av.id, pdf: { not: null } } })) > 0
  const temFotos = !!c.av.documento?.frenteTipo && !!c.av.documento?.versoTipo
  if (!temPdf && !temFotos) {
    return NextResponse.json({ error: 'Anexe a frente e o verso, ou o PDF único, antes de concluir.' }, { status: 422 })
  }
  // ⚠️ Condicional: duas abas concluindo ao mesmo tempo gravam uma vez só.
  await prisma.avaliacaoDocumento.updateMany({
    where: { avaliacaoId: c.av.id, concluidaEm: null },
    data: { concluidaEm: new Date(), concluidaPorId: c.quem.id, versaoAssinada: c.av.versao },
  })
  return NextResponse.json({ ok: true })
}
