import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { quemEh } from '@/lib/avaliacoes/regua'
import { niveisDoSetor, podeRegistrarDisc, podeVerDisc } from '@/lib/disc/regua'
import { validarNotas } from '@/lib/disc/calculo'

/* ============================================================
   O DISC de UMA pessoa — ler (GET ?id=) e registrar (POST).

   ⚠️⚠️ 403 é a resposta NORMAL para quem não é da régua (inclusive a própria
   pessoa): a ficha pede, recebe 403 e simplesmente não mostra o botão. O botão
   escondido não é a trava; a trava é esta rota.
   ============================================================ */

const SEM = () => NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

async function contexto(alvoId: string) {
  const session = await auth()
  const uid = (session?.user as { id?: string } | undefined)?.id
  if (!uid) return null
  const [quem, alvo] = await Promise.all([
    quemEh(uid),
    prisma.user.findUnique({ where: { id: alvoId }, select: { id: true, name: true, departmentId: true } }),
  ])
  if (!quem || !alvo) return { quem, alvo: null, pode: false }
  const niveis = await niveisDoSetor(alvo.departmentId)
  return { quem, alvo, pode: podeVerDisc(quem, alvo, niveis), podeRegistrar: podeRegistrarDisc(quem, alvo, niveis) }
}

const seletor = {
  id: true, d: true, i: true, s: true, c: true, aplicadoEm: true, observacao: true,
  registradoPorNome: true, criadoEm: true,
} as const

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') ?? ''
  const ctx = await contexto(id)
  if (!ctx) return NextResponse.json({ error: 'Sem sessão' }, { status: 401 })
  if (!ctx.alvo) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })
  if (!ctx.pode) return SEM()

  // Mais recente primeiro: a primeira é a vigente, as outras são o histórico.
  const linhas = await prisma.discResultado.findMany({
    where: { userId: ctx.alvo.id },
    orderBy: [{ aplicadoEm: 'desc' }, { criadoEm: 'desc' }],
    select: seletor,
  })
  return NextResponse.json({
    pessoa: { id: ctx.alvo.id, nome: ctx.alvo.name },
    atual: linhas[0] ?? null,
    historico: linhas.slice(1),
    podeRegistrar: ctx.podeRegistrar,
  })
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 })
  const id = String(body.id ?? '')
  const ctx = await contexto(id)
  if (!ctx) return NextResponse.json({ error: 'Sem sessão' }, { status: 401 })
  if (!ctx.alvo) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })
  if (!ctx.podeRegistrar || !ctx.quem) return SEM()

  const v = validarNotas({ D: body.d, I: body.i, S: body.s, C: body.c })
  if (!v.ok) return NextResponse.json({ error: v.erro }, { status: 400 })

  const aplicadoEm = String(body.aplicadoEm ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(aplicadoEm)) return NextResponse.json({ error: 'Informe a data da aplicação.' }, { status: 400 })
  // ⚠️ Data no futuro é digitação errada (ano trocado), não aplicação agendada.
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  if (aplicadoEm > hoje) return NextResponse.json({ error: 'A data da aplicação não pode ser no futuro.' }, { status: 400 })
  const observacao = typeof body.observacao === 'string' && body.observacao.trim() ? body.observacao.trim().slice(0, 500) : null

  const linha = await prisma.discResultado.create({
    data: {
      userId: ctx.alvo.id,
      d: v.notas.D, i: v.notas.I, s: v.notas.S, c: v.notas.C,
      aplicadoEm, observacao,
      registradoPorId: ctx.quem.id, registradoPorNome: ctx.quem.nome,
    },
    select: seletor,
  })
  return NextResponse.json({ ok: true, linha })
}
