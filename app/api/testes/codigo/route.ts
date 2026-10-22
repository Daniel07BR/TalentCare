import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { quemEh } from '@/lib/avaliacoes/regua'
import { podeRegistrarDisc } from '@/lib/disc/regua'
import { decodificar } from '@/lib/testes/codigo'

/* ============================================================
   LANÇAR PELO CÓDIGO DOS TESTES, na ficha (22/10/2026).

   Pedido do Daniel: "crie tbm como o gestor inserir o codigo vindo da pesquisa
   aqui no talent care" — o Yuri refez o teste e mandou o código. Um código traz
   o DISC, a personalidade e (versão 2) a atenção: as três entram de uma vez,
   cada uma como uma aplicação nova (a anterior vai para o histórico).

   POST {id, codigo, previa: true}  → só decifra (a janela mostra antes de gravar)
   POST {id, codigo, aplicadoEm, observacao} → grava

   ⚠️ A régua é a do DISC (quem lança o DISC de alguém lança o código dele).
   ⚠️ O MESMO código não entra duas vezes na mesma pessoa (clique repetido), e
   não entra em OUTRA pessoa — é o código trocado de dono, como no Fluxo.
   ============================================================ */

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 })
  const session = await auth()
  const uid = (session?.user as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Sem sessão' }, { status: 401 })
  const [quem, alvo] = await Promise.all([
    quemEh(uid),
    prisma.user.findUnique({ where: { id: String(body.id ?? '') }, select: { id: true, name: true, departmentId: true } }),
  ])
  if (!alvo) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })
  if (!quem || !podeRegistrarDisc(quem, alvo)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const d = decodificar(String(body.codigo ?? ''))
  if (!d.ok) return NextResponse.json({ error: d.erro }, { status: 400 })
  const r = d.r

  const outra = await prisma.discResultado.findFirst({ where: { codigo: r.codigo, userId: { not: alvo.id } }, select: { userId: true } })
  if (outra) {
    const dono = await prisma.user.findUnique({ where: { id: outra.userId }, select: { name: true } })
    return NextResponse.json({ error: `Este código já foi lançado na ficha de ${dono?.name ?? 'outra pessoa'}. Confira se é o código desta pessoa.` }, { status: 400 })
  }
  const ja = await prisma.discResultado.findFirst({ where: { codigo: r.codigo, userId: alvo.id }, select: { aplicadoEm: true } })

  if (body.previa) return NextResponse.json({ ok: true, resultado: r, jaLancado: ja?.aplicadoEm ?? null })
  if (ja) return NextResponse.json({ ok: true, resultado: r, jaLancado: ja.aplicadoEm })

  const aplicadoEm = String(body.aplicadoEm ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(aplicadoEm)) return NextResponse.json({ error: 'Informe a data em que a pessoa fez o teste.' }, { status: 400 })
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  if (aplicadoEm > hoje) return NextResponse.json({ error: 'A data do teste não pode ser no futuro.' }, { status: 400 })
  const obs = typeof body.observacao === 'string' && body.observacao.trim() ? body.observacao.trim().slice(0, 500) : null
  const observacao = obs ?? 'Lançado pelo código dos testes'
  const por = { registradoPorId: quem.id, registradoPorNome: quem.nome }

  await prisma.$transaction(async (tx) => {
    await tx.discResultado.create({
      data: { userId: alvo.id, d: r.disc.D, i: r.disc.I, s: r.disc.S, c: r.disc.C, aplicadoEm, observacao, codigo: r.codigo, ...por },
    })
    await tx.personalidadeResultado.create({
      data: { userId: alvo.id, tipo: r.tipo, pct: r.pct, aplicadoEm, observacao, codigo: r.codigo, ...por },
    })
    if (r.busca && r.conferencia) {
      await tx.atencaoResultado.create({
        data: {
          userId: alvo.id, buscaAcertos: r.busca.acertos, buscaErros: r.busca.erros, buscaOmissoes: r.busca.omissoes,
          buscaPercorrido: r.busca.percorrido, confAcertos: r.conferencia.acertos, confErros: r.conferencia.erros,
          aplicadoEm, observacao, codigo: r.codigo, ...por,
        },
      })
    }
  })
  return NextResponse.json({ ok: true, resultado: r, jaLancado: null })
}
