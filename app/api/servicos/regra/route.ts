import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { quemEh, podeGerirServicos } from '@/lib/avaliacoes/regua'
import { EVENTOS, competenciaValida, competenciaAtual } from '@/lib/servicos/pontuacao'

/* ============================================================
   A RÉGUA DE PONTUAÇÃO DO SETOR — cada um define a sua.

   ⚠️⚠️ NUNCA SE EDITA UMA RÉGUA. Salvar cria uma VERSÃO nova, com a competência
   a partir da qual ela vale. Editar no lugar reescreveria o passado: afrouxar o
   peso do atraso em dezembro mudaria também a nota de novembro, que a pessoa já
   leu e sobre a qual já conversou com o gestor.

   É o mesmo princípio do `AvaliacaoVersao`: "uma nota que se reescreve em
   silêncio depois de a pessoa ler não é registro — é negociação, e vence quem
   insiste mais". Aqui pesa ainda mais, porque quem edita a régua é o gestor do
   próprio time (decisão do dono, 03/09/2026) — o registro de autor, data e
   vigência é o que separa "mudamos o critério" de "mudei a nota dele".
   ============================================================ */

export async function GET(req: NextRequest) {
  const session = await auth()
  const uid = (session?.user as { id?: string } | undefined)?.id
  const quem = uid ? await quemEh(uid) : null
  if (!quem) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const departmentId = req.nextUrl.searchParams.get('departmentId') ?? ''
  if (!podeGerirServicos(quem, departmentId)) {
    return NextResponse.json({ error: 'Você não administra este setor.' }, { status: 403 })
  }

  const versoes = await prisma.pontuacaoRegra.findMany({
    where: { departmentId },
    include: { itens: true },
    orderBy: { vigenteDesde: 'desc' },
  })
  const autores = await prisma.user.findMany({
    where: { id: { in: [...new Set(versoes.map((v) => v.criadoPor))] } },
    select: { id: true, name: true },
  })
  const nomePorId = new Map(autores.map((a) => [a.id, a.name]))

  return NextResponse.json({
    eventos: EVENTOS,
    competenciaAtual: competenciaAtual(),
    versoes: versoes.map((v) => ({
      id: v.id, base: v.base, fatorPorMinuto: v.fatorPorMinuto, vigenteDesde: v.vigenteDesde, motivo: v.motivo,
      criadoEm: v.criadoEm, criadoPor: nomePorId.get(v.criadoPor) ?? '—',
      itens: v.itens.map((i) => ({ evento: i.evento, pontos: i.pontos })),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  const uid = (session?.user as { id?: string } | undefined)?.id
  const quem = uid ? await quemEh(uid) : null
  if (!quem) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null) as {
    departmentId?: string; base?: number; fatorPorMinuto?: number
    vigenteDesde?: string; motivo?: string
    itens?: { evento: string; pontos: number }[]
  } | null
  const departmentId = body?.departmentId ?? ''
  if (!podeGerirServicos(quem, departmentId)) {
    return NextResponse.json({ error: 'Você não administra este setor.' }, { status: 403 })
  }

  const base = Math.round(Number(body?.base))
  if (!Number.isFinite(base) || base < 0 || base > 1000) {
    return NextResponse.json({ error: 'A base tem de ser um número entre 0 e 1000.' }, { status: 422 })
  }
  /* ⚠️⚠️ O FATOR é o botão que mais pesa. Com 0,5 — o pedido inicial — agosto de
     2026 daria 4.639 pontos à Marcia e 3.787 ao Ezequiel, contra uma base mensal
     de 100 e uma advertência de −15: a metade disciplinar da régua sumiria ao
     lado da metade de serviço. Editável para que essa proporção seja uma
     ESCOLHA, e não uma descoberta no fim do mês. */
  const fatorPorMinuto = Number(body?.fatorPorMinuto ?? 0.5)
  if (!Number.isFinite(fatorPorMinuto) || fatorPorMinuto < 0 || fatorPorMinuto > 100) {
    return NextResponse.json({ error: 'O fator por minuto tem de ser um número entre 0 e 100.' }, { status: 422 })
  }

  const vigenteDesde = (body?.vigenteDesde ?? '').trim()
  if (!competenciaValida(vigenteDesde)) {
    return NextResponse.json({ error: 'A vigência tem de ser uma competência no formato AAAA-MM.' }, { status: 422 })
  }
  /* ⚠️⚠️ NÃO SE MUDA A RÉGUA DO PASSADO. Deixar alguém datar uma régua nova para
     um mês já fechado é permitir recalcular, hoje, a nota que a pessoa recebeu
     e leu meses atrás — exatamente o que a versão existe para impedir. */
  if (vigenteDesde < competenciaAtual()) {
    return NextResponse.json({
      error: `A vigência não pode ser anterior ao mês corrente (${competenciaAtual()}). Uma régua nova vale daqui para a frente — o que já foi pontuado fica como foi.`,
    }, { status: 422 })
  }

  const validos = new Set(EVENTOS.map((e) => e.chave))
  const itens = (body?.itens ?? []).filter((i) => validos.has(i.evento))
  for (const i of itens) {
    if (!Number.isFinite(i.pontos) || Math.abs(i.pontos) > 1000) {
      return NextResponse.json({ error: `Pontos inválidos para "${i.evento}".` }, { status: 422 })
    }
  }

  const regra = await prisma.pontuacaoRegra.upsert({
    where: { departmentId_vigenteDesde: { departmentId, vigenteDesde } },
    create: {
      departmentId, base, fatorPorMinuto, vigenteDesde, criadoPor: quem.id, motivo: body?.motivo?.trim() || null,
      itens: { create: itens.map((i) => ({ evento: i.evento, pontos: Math.round(i.pontos) })) },
    },
    /* Reeditar a versão do MÊS CORRENTE, antes de ela ter produzido nota
       fechada, é ajuste — não reescrita de história. De competências passadas o
       guarda-corpo acima já protege. */
    update: {
      base, fatorPorMinuto, criadoPor: quem.id, motivo: body?.motivo?.trim() || null,
      itens: { deleteMany: {}, create: itens.map((i) => ({ evento: i.evento, pontos: Math.round(i.pontos) })) },
    },
    include: { itens: true },
  })

  return NextResponse.json({ ok: true, regra: { id: regra.id, base: regra.base, fatorPorMinuto: regra.fatorPorMinuto, vigenteDesde: regra.vigenteDesde, itens: regra.itens.map((i) => ({ evento: i.evento, pontos: i.pontos })) } })
}
