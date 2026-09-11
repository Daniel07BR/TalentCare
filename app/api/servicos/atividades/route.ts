import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { quemEh, podeGerirServicos } from '@/lib/avaliacoes/regua'
import { TIPOS_ATIVIDADE } from '@/lib/servicos/atividades'
import { catalogoAtividades } from '@/lib/servicos/catalogo-atividades'

/* ============================================================
   A RÉGUA DE ATIVIDADES — média de minutos por tipo, e os pontos (média×fator).

   Espelha o catálogo de serviços. A conta mora em `catalogo-atividades.ts`,
   que a tela e o cálculo do mês compartilham. Onde o sistema mede o tempo
   (WhatsApp, HelpDesk, Chat), a média nasce da MEDIANA real; onde não, o
   gestor informa.
   ============================================================ */

async function catalogo(departmentId: string) {
  const c = await catalogoAtividades(departmentId, { comVolume: true })
  return { fator: c.fator, atividades: c.atividades }
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
  return NextResponse.json(await catalogo(departmentId))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  const uid = (session?.user as { id?: string } | undefined)?.id
  const quem = uid ? await quemEh(uid) : null
  if (!quem) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null) as {
    departmentId?: string; atividade?: string
    campo?: 'media' | 'pontos' | 'limpar' | 'revisar'
    valor?: number | null
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
  const carimbo = { ajustadoPor: quem.id, ajustadoEm: agora, revisadoPor: quem.id, revisadoEm: agora }

  /* "Conferi, e está certo" — não muda valor, grava que alguém olhou. */
  if (body?.campo === 'revisar') {
    await prisma.pontuacaoAtividade.upsert({
      where: { departmentId_atividade: { departmentId, atividade } },
      create: { departmentId, atividade, revisadoPor: quem.id, revisadoEm: agora },
      update: { revisadoPor: quem.id, revisadoEm: agora },
    })
    return NextResponse.json({ ok: true, ...(await uma(departmentId, atividade)) })
  }

  /* Voltar ao padrão: apaga o valor mas mantém a linha como revisão. */
  if (body?.campo === 'limpar' || body?.valor == null) {
    await prisma.pontuacaoAtividade.upsert({
      where: { departmentId_atividade: { departmentId, atividade } },
      create: { departmentId, atividade, revisadoPor: quem.id, revisadoEm: agora },
      update: { mediaMinutos: null, pontos: null, ajustadoPor: null, ajustadoEm: null, revisadoPor: quem.id, revisadoEm: agora },
    })
    return NextResponse.json({ ok: true, ...(await uma(departmentId, atividade)) })
  }

  /* ⚠️⚠️ Os pontos de uma atividade NÃO se digitam (11/09/2026, pedido do dono): saem
     sempre de média × ponto por minuto. Só a MÉDIA se informa. */
  if (body.campo === 'pontos') {
    return NextResponse.json({ error: 'Os pontos de cada atividade são calculados sozinhos, pelo tempo médio × o ponto por minuto da régua geral. Informe a média.' }, { status: 422 })
  }
  const valor = Math.round(Number(body.valor))
  if (!Number.isFinite(valor) || valor < 0 || valor > 100000) {
    return NextResponse.json({ error: 'O valor tem de ser um número entre 0 e 100.000.' }, { status: 422 })
  }
  /* ⚠️ Mexer na MÉDIA limpa o override de pontos (os pontos voltam a sair de
     média×fator) — o mesmo comportamento do catálogo de serviços. */
  const dados = { mediaMinutos: valor, pontos: null, ...carimbo }
  await prisma.pontuacaoAtividade.upsert({
    where: { departmentId_atividade: { departmentId, atividade } },
    create: { departmentId, atividade, ...dados },
    update: dados,
  })
  return NextResponse.json({ ok: true, ...(await uma(departmentId, atividade)) })
}

async function uma(departmentId: string, atividade: string) {
  const c = await catalogo(departmentId)
  return { atividade: c.atividades.find((a) => a.chave === atividade) ?? null }
}
