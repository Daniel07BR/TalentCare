import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { quemEh, podeGerirServicos } from '@/lib/avaliacoes/regua'
import { normalizarTarefa } from '@/lib/servicos/pontuacao'
/* ⚠️ O catálogo saiu daqui para `lib/servicos/catalogo.ts` em 08/09/2026: o
   cálculo mensal precisa exatamente do MESMO número que esta tela mostra, e a
   régua da casa mora em UM lugar — duas cópias divergiriam em silêncio, que é
   como o cron já promoveu alguém que o login rebaixava em seguida. */
import { calcularCatalogo, type TarefaPontuada } from '@/lib/servicos/catalogo'

export type { TarefaPontuada }

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
    departmentId?: string; tarefa?: string
    /** Qual campo a pessoa mexeu: muda o que salvar e o que limpar. */
    campo?: 'media' | 'pontos' | 'minimo' | 'maximo' | 'limpar' | 'revisar' | 'revisar_todos'
    valor?: number | null
    pontosAuto?: number
  } | null
  const departmentId = body?.departmentId ?? ''
  const tarefa = (body?.tarefa ?? '').trim()
  if (!departmentId || !tarefa) return NextResponse.json({ error: 'Falta o setor ou a tarefa.' }, { status: 400 })
  if (!podeGerirServicos(quem, departmentId)) {
    return NextResponse.json({ error: 'Você não administra este setor.' }, { status: 403 })
  }
  const tarefaNorm = normalizarTarefa(tarefa)
  const agora = new Date()

  /* ⚠️⚠️ A GRAVAÇÃO ALCANÇA TODAS AS GRAFIAS DO MESMO SERVIÇO. O catálogo agrupa
     por grafia normalizada (decisão do dono: "no TFE, considere o mesmo
     serviço"), então a tela mostra UMA linha — mas o banco continua tendo uma
     chave por grafia, e é do banco que os outros consumidores vão ler. Gravar
     só na canônica deixaria a outra grafia com a régua velha, viva e invisível:
     bastaria a planilha do mês que vem mudar qual grafia é a mais frequente
     para o valor do serviço saltar sozinho, sem ninguém ter mexido em nada.
     ⚠️ São as grafias que EXISTEM na planilha deste setor — nunca um `where`
     por `tarefaNorm` solto, que atravessaria setor. */
  const grafiasDoServico = [...new Set([
    tarefa,
    ...(await prisma.servicoDepto.findMany({
      where: { departmentId, status: 'concluida' }, select: { tarefa: true }, distinct: ['tarefa'],
    })).map((r) => r.tarefa).filter((t) => normalizarTarefa(t) === tarefaNorm),
  ])]
  /** Grava o mesmo em todas as grafias — a canônica e as irmãs. */
  const gravarEmTodas = async (create: Record<string, unknown>, update: Record<string, unknown>) => {
    for (const t of grafiasDoServico) {
      await prisma.pontuacaoTarefaAjuste.upsert({
        where: { departmentId_tarefa: { departmentId, tarefa: t } },
        create: { departmentId, tarefa: t, tarefaNorm, ...create },
        update,
      })
    }
  }
  /** Toda mudança de valor TAMBÉM revisa: quem digita o número olhou para ele. */
  const carimboDeAjuste = { ajustadoPor: quem.id, ajustadoEm: agora, revisadoPor: quem.id, revisadoEm: agora }

  /* ── "conferi, e está certo" ──────────────────────────────────────────────
     ⚠️⚠️ Não muda valor nenhum: grava que uma pessoa olhou. É o que separa
     "ninguém nunca viu este tipo" de "viram e decidiram manter o medido" — que
     no banco eram a MESMA ausência de linha. Sem esta porta, a lista de
     pendências nunca esvazia, e lista que nunca esvazia para de ser lida. */
  if (body?.campo === 'revisar') {
    await gravarEmTodas(
      { revisadoPor: quem.id, revisadoEm: agora },
      { revisadoPor: quem.id, revisadoEm: agora },
    )
    return NextResponse.json({ ok: true, ...(await umaTarefa(departmentId, tarefa, true)) })
  }

  /* ── confirmar TODOS os valores de uma vez ────────────────────────────────
     ⚠️⚠️ A saída para a mudança de régua. Ela move os 74 tipos no mesmo
     instante, e pedir 74 cliques para confirmar um único ato deliberado é o
     jeito mais rápido de ensinar a equipe a ignorar a lista de pendências.
     ⚠️ Não muda valor nenhum: grava que uma pessoa olhou e aceitou o que a
     régua nova produziu, com autor e data em cada linha. */
  if (body?.campo === 'revisar_todos') {
    const cat = await calcularCatalogo(departmentId)
    for (const t of cat.tarefas) {
      const norm = normalizarTarefa(t.tarefa)
      for (const g of [...new Set([t.tarefa, ...t.grafias])]) {
        await prisma.pontuacaoTarefaAjuste.upsert({
          where: { departmentId_tarefa: { departmentId, tarefa: g } },
          create: { departmentId, tarefa: g, tarefaNorm: norm, revisadoPor: quem.id, revisadoEm: agora, pontosNaRevisao: t.pontos },
          update: { revisadoPor: quem.id, revisadoEm: agora, pontosNaRevisao: t.pontos },
        })
      }
    }
    return NextResponse.json({ ok: true, revisados: cat.tarefas.length, recarregar: true })
  }

  /* `limpar` VOLTA ao medido — apaga os VALORES em vez de gravar o sugerido.
     Gravar o sugerido faria o ajuste "vazio" congelar aquele número, e ele
     deixaria de acompanhar a planilha na próxima importação.
     ⚠️⚠️ A linha SOBREVIVE, como revisão: voltar ao medido é uma decisão
     ("olhei e quero o que a planilha mede"), e apagar a linha inteira a
     transformaria de novo em "ninguém nunca olhou". */
  if (body?.campo === 'limpar') {
    await gravarEmTodas(
      { revisadoPor: quem.id, revisadoEm: agora },
      {
        mediaMinutos: null, tempoMinimo: null, tempoMaximo: null, pontos: null,
        pontosAutoNaEpoca: null, ajustadoPor: null, ajustadoEm: null,
        revisadoPor: quem.id, revisadoEm: agora,
      },
    )
    return NextResponse.json({ ok: true, voltouAoCalculado: true, ...(await umaTarefa(departmentId, tarefa, true)) })
  }
  /* Esvaziar UM limite tira só aquele limite — apagar o ajuste inteiro levaria
     junto o outro limite e a média, que a pessoa não pediu para mexer. */
  if (body?.valor == null && (body?.campo === 'minimo' || body?.campo === 'maximo')) {
    const campo = body.campo === 'minimo' ? { tempoMinimo: null } : { tempoMaximo: null }
    await gravarEmTodas(
      { ...campo, ...carimboDeAjuste },
      { ...campo, mediaMinutos: null, pontos: null, ...carimboDeAjuste },
    )
    return NextResponse.json({ ok: true, ...(await umaTarefa(departmentId, tarefa, true)) })
  }
  if (body?.valor == null) {
    return NextResponse.json({ error: 'Falta o valor.' }, { status: 400 })
  }

  const valor = Math.round(Number(body.valor))
  if (!Number.isFinite(valor) || valor < 0 || valor > 100000) {
    return NextResponse.json({ error: 'O valor tem de ser um número entre 0 e 100.000.' }, { status: 422 })
  }
  const pontosAutoNaEpoca = Math.round(Number(body.pontosAuto ?? 0)) || null
  /* ⚠️⚠️ MEXER NA MÉDIA OU NO MÍNIMO LIMPA O OVERRIDE DE PONTOS. Foi o pedido —
     "o campo pontos atualiza automaticamente" — e é o que faz a tela se
     comportar como a pessoa espera: se o número digitado antes continuasse
     preso, mudar a média não teria efeito nenhum.

     ⚠️ O MÍNIMO limpa TAMBÉM a média ajustada: ele existe para que o sistema
     recalcule a média sem os tempos impossíveis. Se a média digitada à mão
     ficasse por cima, definir o mínimo não mudaria nada — e a pessoa
     concluiria, com razão, que o campo não faz nada. */
  const dados =
    body.campo === 'media' ? { mediaMinutos: valor, pontos: null, pontosAutoNaEpoca, ...carimboDeAjuste }
    : body.campo === 'minimo' ? { tempoMinimo: valor, mediaMinutos: null, pontos: null, pontosAutoNaEpoca, ...carimboDeAjuste }
    : body.campo === 'maximo' ? { tempoMaximo: valor, mediaMinutos: null, pontos: null, pontosAutoNaEpoca, ...carimboDeAjuste }
    : { pontos: valor, pontosAutoNaEpoca, ...carimboDeAjuste }

  await gravarEmTodas(dados, dados)
  return NextResponse.json({ ok: true, ...(await umaTarefa(departmentId, tarefa, true)) })
}

/**
 * A linha recalculada, para a tela trocar só ela.
 *
 * ⚠️⚠️ `ancorar` grava, DEPOIS de recalcular, quanto o tipo passou a valer — é
 * o `pontosNaRevisao`. Precisa ser depois: o valor de um tipo é derivado da
 * média com os limites aplicados, e só existe quando a conta roda. Sem esta
 * âncora, "mudou desde que você conferiu" não teria com o que comparar e a
 * tela ficaria muda exatamente na hora em que o número se mexesse sozinho.
 */
async function umaTarefa(departmentId: string, tarefa: string, ancorar = false) {
  const cat = await calcularCatalogo(departmentId)
  const linha = cat.tarefas.find((t) => t.tarefa === tarefa) ?? null
  if (ancorar && linha) {
    /* Todas as grafias do serviço, pelo mesmo motivo de `gravarEmTodas`. */
    await prisma.pontuacaoTarefaAjuste.updateMany({
      where: { departmentId, tarefaNorm: normalizarTarefa(tarefa) },
      data: { pontosNaRevisao: linha.pontos },
    })
    linha.pontosNaRevisao = linha.pontos
    linha.mudouDesdeRevisao = false
  }
  return { tarefa: linha }
}
