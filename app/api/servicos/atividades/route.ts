import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { quemEh, podeGerirServicos } from '@/lib/avaliacoes/regua'
import { TIPOS_ATIVIDADE, VALOR_ATIVIDADE_PADRAO } from '@/lib/servicos/atividades'
import { agregarAtividades } from '@/lib/servicos/atividade-agg'

/* ============================================================
   A RÉGUA DE ATIVIDADES DE UM SETOR — quanto vale cada ação dos sistemas.

   A terceira metade da pontuação, ao lado do catálogo de serviços e da régua
   disciplinar. Cada setor define a sua (pedido do dono, 08/09/2026).

   ⚠️⚠️ O VOLUME É DA VIDA INTEIRA, não do período — como o catálogo de serviços.
   "Quanto o setor faz de chamado resolvido" é característica da fonte, não da
   janela que o gestor está olhando; recortar por período faria o peso do tipo
   parecer mudar quando ele troca o filtro.

   ⚠️ Só aparecem os tipos em que o SETOR TEM VOLUME. Mostrar as 18 linhas em
   todo setor encheria a tela de zeros — o Legal não abre chamado de motoboy.
   ============================================================ */

const JANELA_AMPLA = { de: '2000-01-01', ate: '2999-12-31' }

export type AtividadePontuada = {
  chave: string
  label: string
  sistema: string
  descricao: string
  /** Volume do setor na vida inteira — o contexto para ponderar. */
  volume: number
  /** Quantas pessoas do setor registraram esta atividade. */
  pessoas: number
  /** O valor por ocorrência, hoje. */
  pontos: number
  /** Está no padrão (1) ou o gestor mexeu? */
  ajustado: boolean
  ajustadoPor: string | null
  ajustadoEm: string | null
  pontosNaEpoca: number | null
  revisado: boolean
}

async function calcularCatalogo(departmentId: string) {
  const [pessoas, ajustes] = await Promise.all([
    /* ⚠️ SÓ ATIVOS — o mesmo recorte do cálculo do mês. Incluir inativos aqui
       faria o volume da régua contar quem NÃO pontua (o Augusto, do Legal,
       desligado), e o gestor ponderaria o peso por um número maior que o que
       entra na nota. Achado do crítico, 08/09/2026. */
    prisma.user.findMany({
      where: { departmentId, origin: { in: ['nexus', 'staff'] }, active: true },
      select: { id: true, nexusUserId: true, name: true },
    }),
    prisma.pontuacaoAtividade.findMany({ where: { departmentId } }),
  ])
  const ids = pessoas.map((p) => ({ personKey: p.nexusUserId ?? p.id, nexusUserId: p.nexusUserId, nome: p.name }))
  const agg = await agregarAtividades(ids, JANELA_AMPLA.de, JANELA_AMPLA.ate)

  // Volume e nº de pessoas por tipo, na vida inteira.
  const volume = new Map<string, number>()
  const pessoasPorTipo = new Map<string, number>()
  for (const m of agg.values()) {
    for (const [chave, v] of m) {
      if (!v) continue
      volume.set(chave, (volume.get(chave) ?? 0) + v)
      pessoasPorTipo.set(chave, (pessoasPorTipo.get(chave) ?? 0) + 1)
    }
  }

  const ajustePorChave = new Map(ajustes.map((a) => [a.atividade, a]))
  const autores = await prisma.user.findMany({
    where: { id: { in: [...new Set(ajustes.map((a) => a.ajustadoPor).filter((x): x is string => !!x))] } },
    select: { id: true, name: true },
  })
  const nomePorId = new Map(autores.map((a) => [a.id, a.name]))

  const atividades: AtividadePontuada[] = TIPOS_ATIVIDADE
    .filter((t) => (volume.get(t.chave) ?? 0) > 0)
    .map((t) => {
      const aj = ajustePorChave.get(t.chave)
      return {
        chave: t.chave, label: t.label, sistema: t.sistema, descricao: t.descricao,
        volume: volume.get(t.chave) ?? 0,
        pessoas: pessoasPorTipo.get(t.chave) ?? 0,
        pontos: aj?.pontos ?? VALOR_ATIVIDADE_PADRAO,
        ajustado: aj?.pontos != null,
        ajustadoPor: aj?.ajustadoPor ? (nomePorId.get(aj.ajustadoPor) ?? '—') : null,
        ajustadoEm: aj?.ajustadoEm ? aj.ajustadoEm.toISOString() : null,
        pontosNaEpoca: aj?.pontosNaEpoca ?? null,
        revisado: !!aj?.revisadoEm,
      }
    })
    .sort((a, b) => b.volume - a.volume)

  return { padrao: VALOR_ATIVIDADE_PADRAO, atividades }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  const uid = (session?.user as { id?: string } | undefined)?.id
  const quem = uid ? await quemEh(uid) : null
  if (!quem) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const departmentId = req.nextUrl.searchParams.get('departmentId') ?? ''
  if (!podeGerirServicos(quem, departmentId)) {
    return NextResponse.json({ error: 'Você não administra este setor.' }, { status: 403 })
  }
  return NextResponse.json(await calcularCatalogo(departmentId))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  const uid = (session?.user as { id?: string } | undefined)?.id
  const quem = uid ? await quemEh(uid) : null
  if (!quem) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null) as {
    departmentId?: string; atividade?: string
    campo?: 'pontos' | 'limpar' | 'revisar'
    valor?: number | null; pontosAtual?: number
  } | null
  const departmentId = body?.departmentId ?? ''
  const atividade = body?.atividade ?? ''
  if (!departmentId || !atividade) return NextResponse.json({ error: 'Falta o setor ou a atividade.' }, { status: 400 })
  if (!podeGerirServicos(quem, departmentId)) {
    return NextResponse.json({ error: 'Você não administra este setor.' }, { status: 403 })
  }
  if (!TIPOS_ATIVIDADE.some((t) => t.chave === atividade)) {
    return NextResponse.json({ error: 'Atividade desconhecida.' }, { status: 422 })
  }
  const agora = new Date()

  /* "Conferi, e está certo" — não muda valor, grava que alguém olhou. */
  if (body?.campo === 'revisar') {
    await prisma.pontuacaoAtividade.upsert({
      where: { departmentId_atividade: { departmentId, atividade } },
      create: { departmentId, atividade, revisadoPor: quem.id, revisadoEm: agora },
      update: { revisadoPor: quem.id, revisadoEm: agora },
    })
    return NextResponse.json({ ok: true, ...(await umaAtividade(departmentId, atividade)) })
  }

  /* Voltar ao padrão: apaga o valor mas MANTÉM a linha como revisão — voltar ao
     padrão é uma decisão, não um "ninguém olhou". */
  if (body?.campo === 'limpar' || body?.valor == null) {
    await prisma.pontuacaoAtividade.upsert({
      where: { departmentId_atividade: { departmentId, atividade } },
      create: { departmentId, atividade, revisadoPor: quem.id, revisadoEm: agora },
      update: { pontos: null, pontosNaEpoca: null, ajustadoPor: null, ajustadoEm: null, revisadoPor: quem.id, revisadoEm: agora },
    })
    return NextResponse.json({ ok: true, ...(await umaAtividade(departmentId, atividade)) })
  }

  const valor = Math.round(Number(body.valor))
  if (!Number.isFinite(valor) || valor < 0 || valor > 100000) {
    return NextResponse.json({ error: 'O valor tem de ser um número entre 0 e 100.000.' }, { status: 422 })
  }
  const dados = {
    pontos: valor, pontosNaEpoca: Math.round(Number(body.pontosAtual ?? VALOR_ATIVIDADE_PADRAO)),
    ajustadoPor: quem.id, ajustadoEm: agora, revisadoPor: quem.id, revisadoEm: agora,
  }
  await prisma.pontuacaoAtividade.upsert({
    where: { departmentId_atividade: { departmentId, atividade } },
    create: { departmentId, atividade, ...dados },
    update: dados,
  })
  return NextResponse.json({ ok: true, ...(await umaAtividade(departmentId, atividade)) })
}

async function umaAtividade(departmentId: string, atividade: string) {
  const cat = await calcularCatalogo(departmentId)
  return { atividade: cat.atividades.find((a) => a.chave === atividade) ?? null }
}
