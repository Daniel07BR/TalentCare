import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { quemEh, podeGerirServicos } from '@/lib/avaliacoes/regua'

/* ============================================================
   OS TIPOS DE SERVIÇO DO SETOR, e quantos pontos cada um vale.

   A duração média de cada tipo sai da planilha INTEIRA — 18 meses e 5.227
   serviços concluídos no Legal —, e não do período selecionado. Isso é de
   propósito: "quanto tempo leva uma ABERTURA SIMPLES NACIONAL" é uma
   propriedade do serviço, não da janela que alguém está olhando. Recortar por
   período faria o peso da tarefa mudar quando o leitor troca o filtro.

   ⚠️⚠️ MÉDIA E MEDIANA VÃO AS DUAS, e a tela mostra as duas. Medido em
   04/09/2026: CERTIFICADO tem média 47 min e mediana 31, com um caso de 564
   min; SERVIÇOS INTERNOS - CLIENTE tem média 48 e mediana 24, com um de 597. A
   média é puxada por poucos casos longos, e é ela que vira ponto — quem define
   o peso precisa ver o quanto uma coisa está longe da outra.

   ⚠️⚠️ E A AMOSTRA. Dos 74 tipos, **16 aconteceram uma única vez** e 11 entre
   duas e quatro. A "média" de um tipo com uma ocorrência não é média: é aquele
   caso. A tela marca isso; sem a marca, um serviço que aconteceu uma vez e
   demorou 8 horas viraria o mais valioso do catálogo para sempre.
   ============================================================ */

export type TarefaPontuada = {
  tarefa: string
  amostras: number
  /** A média MEDIDA na planilha — nunca muda com o ajuste. */
  mediaMedida: number
  /** A média EM USO: a que a liderança escolheu, ou a medida. */
  mediaEmUso: number
  mediaAjustada: number | null
  medianaMinutos: number
  /** Quantas entraram na conta (têm tempo) e quantas vieram zeradas. */
  cronometradas: number
  zerados: number
  /** Os dois maiores e os dois menores tempos, com quem fez e quando — é o que
   *  explica um extremo: "9h24" sozinho não distingue tarefa longa de tarefa
   *  que travou num dia. */
  maiores: { minutos: number; quem: string }[]
  menores: { minutos: number; quem: string }[]
  /** O que a régua calcula: média em uso × fator. */
  pontosAuto: number
  /** O que vale hoje — o override direto, se houver. */
  pontos: number
  pontosAjustados: boolean
  ajustado: boolean
  ajustadoPor: string | null
  ajustadoEm: string | null
  /** Quanto o sistema sugeria quando a pessoa mudou — a prova de quem mudou o quê. */
  pontosAutoNaEpoca: number | null
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

  const [linhas, ajustes, regra, usuariosDoSetor] = await Promise.all([
    /* ⚠️ SÓ CONCLUÍDO. Um serviço "aberto" tem tempo PARCIAL — o relógio dele
       ainda está correndo —, e "desconsiderado" o próprio setor descartou.
       Misturar os três faria a média de cada tarefa cair sem que ninguém tivesse
       trabalhado mais rápido. */
    prisma.servicoDepto.findMany({
      where: { departmentId, status: 'concluida' },
      select: { tarefa: true, minutos: true, dia: true, nomeOrigem: true, personKey: true },
    }),
    prisma.pontuacaoTarefaAjuste.findMany({ where: { departmentId } }),
    prisma.pontuacaoRegra.findFirst({
      where: { departmentId }, orderBy: { vigenteDesde: 'desc' }, select: { fatorPorMinuto: true },
    }),
    prisma.user.findMany({
      where: { origin: { in: ['nexus', 'staff'] } },
      select: { id: true, nexusUserId: true, name: true },
    }),
  ])

  const fator = regra?.fatorPorMinuto ?? 0.5
  const autores = await prisma.user.findMany({
    where: { id: { in: [...new Set(ajustes.map((a) => a.ajustadoPor))] } },
    select: { id: true, name: true },
  })
  const nomePorId = new Map(autores.map((a) => [a.id, a.name]))
  const ajustePorTarefa = new Map(ajustes.map((a) => [a.tarefa, a]))

  /* ⚠️⚠️ TEMPO ZERO É "NÃO CRONOMETRADO", NÃO "INSTANTÂNEO" (confirmado pelo dono
     em 04/09/2026). São 138 dos 5.227 concluídos — 2,6% —, e eles estavam
     entrando na média puxando-a para BAIXO: um CERTIFICADO de 0 minuto barateava
     os outros 388. É a regra da casa outra vez, no mesmo dia e em mais uma
     roupa: ausência de medição não é medição de zero.

     ⚠️ O efeito é honestamente pequeno (CERTIFICADO 47 → 49 min, ABERTURA
     SIMPLES NACIONAL 28 → 30), e vale dizer isso em vez de vender o conserto
     como grande. O que importa é que a conta passa a descrever o que foi
     medido — e no dia em que um tipo vier com metade das linhas zerada, ela não
     vai desabar em silêncio. */
  const porTarefa = new Map<string, typeof linhas>()
  for (const l of linhas) {
    const arr = porTarefa.get(l.tarefa) ?? []
    arr.push(l)
    porTarefa.set(l.tarefa, arr)
  }

  const nomeDaChave = new Map(usuariosDoSetor.map((u) => [u.nexusUserId ?? u.id, u.name]))
  const brDia = (d: string) => d.split('-').reverse().join('/')
  /** Quem fez e quando — é o que explica um extremo. */
  const quemFez = (l: { personKey: string | null; nomeOrigem: string; dia: string }) =>
    `${(l.personKey && nomeDaChave.get(l.personKey)) || l.nomeOrigem} · ${brDia(l.dia)}`

  const tarefas: TarefaPontuada[] = [...porTarefa].map(([tarefa, todas]) => {
    const cronometradas = todas.filter((l) => l.minutos > 0)
    const zerados = todas.length - cronometradas.length
    /* Tipo em que NINGUÉM cronometrou nada: a média não existe. Devolver 0 aqui
       daria 1 ponto ao serviço e ninguém saberia por quê. */
    const base = cronometradas.length ? cronometradas : []
    const ordenado = [...base].sort((a, b) => a.minutos - b.minutos)
    const mediaMedida = base.length
      ? Math.round(base.reduce((a, l) => a + l.minutos, 0) / base.length)
      : 0
    const mediana = ordenado.length ? ordenado[Math.floor(ordenado.length / 2)].minutos : 0
    const aj = ajustePorTarefa.get(tarefa)
    /* A média EM USO é a que a liderança escolheu, quando escolheu. A medida
       continua viajando ao lado: trocar uma pela outra faria o sistema afirmar
       que mediu o que alguém decidiu. */
    const mediaEmUso = aj?.mediaMinutos ?? mediaMedida
    const pontosAuto = Math.max(1, Math.round(mediaEmUso * fator))
    return {
      tarefa,
      amostras: todas.length,
      /** Quantas entraram na conta — as cronometradas. */
      cronometradas: cronometradas.length,
      /** Quantas vieram sem tempo e ficaram FORA da média. */
      zerados,
      mediaMedida,
      mediaEmUso,
      mediaAjustada: aj?.mediaMinutos ?? null,
      medianaMinutos: mediana,
      /* ⚠️⚠️ OS EXTREMOS, que a média esconde. Estavam só no `title` do HTML —
         ou seja, existiam para quem passasse o mouse por cima e por acaso
         esperasse. Quem define o peso de um serviço precisa ver que o
         CERTIFICADO tem casos de 9h24 e casos de 1 minuto: é o que separa "esta
         tarefa é longa" de "esta tarefa travou um dia". */
      maiores: [...ordenado].reverse().slice(0, 2).map((l) => ({ minutos: l.minutos, quem: quemFez(l) })),
      menores: ordenado.slice(0, 2).map((l) => ({ minutos: l.minutos, quem: quemFez(l) })),
      pontosAuto,
      pontos: aj?.pontos ?? pontosAuto,
      pontosAjustados: aj?.pontos != null,
      ajustado: !!aj,
      ajustadoPor: aj ? (nomePorId.get(aj.ajustadoPor) ?? '—') : null,
      ajustadoEm: aj ? aj.ajustadoEm.toISOString() : null,
      pontosAutoNaEpoca: aj?.pontosAutoNaEpoca ?? null,
    }
  }).sort((a, b) => b.amostras - a.amostras)

  return NextResponse.json({
    fatorPorMinuto: fator,
    totalConcluidos: linhas.length,
    tarefas,
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  const uid = (session?.user as { id?: string } | undefined)?.id
  const quem = uid ? await quemEh(uid) : null
  if (!quem) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null) as {
    departmentId?: string; tarefa?: string
    /** Qual campo a pessoa mexeu: muda o que salvar e o que limpar. */
    campo?: 'media' | 'pontos' | 'limpar'
    valor?: number | null
    pontosAuto?: number
  } | null
  const departmentId = body?.departmentId ?? ''
  const tarefa = (body?.tarefa ?? '').trim()
  if (!departmentId || !tarefa) return NextResponse.json({ error: 'Falta o setor ou a tarefa.' }, { status: 400 })
  if (!podeGerirServicos(quem, departmentId)) {
    return NextResponse.json({ error: 'Você não administra este setor.' }, { status: 403 })
  }

  /* `limpar` VOLTA ao medido — apaga o ajuste em vez de gravar o valor sugerido.
     Gravar o sugerido faria o ajuste "vazio" congelar aquele número, e ele
     deixaria de acompanhar a planilha na próxima importação. */
  if (body?.campo === 'limpar' || body?.valor == null) {
    await prisma.pontuacaoTarefaAjuste.deleteMany({ where: { departmentId, tarefa } })
    return NextResponse.json({ ok: true, voltouAoCalculado: true })
  }

  const valor = Math.round(Number(body.valor))
  if (!Number.isFinite(valor) || valor < 0 || valor > 100000) {
    return NextResponse.json({ error: 'O valor tem de ser um número entre 0 e 100.000.' }, { status: 422 })
  }
  const pontosAutoNaEpoca = Math.round(Number(body.pontosAuto ?? 0)) || 0
  const eMedia = body.campo === 'media'

  /* ⚠️⚠️ MEXER NA MÉDIA LIMPA O OVERRIDE DE PONTOS. Foi o pedido — "o campo
     pontos atualiza automaticamente com a média editada" — e é o que faz a tela
     se comportar como a pessoa espera: se o número digitado antes continuasse
     preso, mudar a média não teria efeito nenhum. */
  const dados = eMedia
    ? { mediaMinutos: valor, pontos: null, pontosAutoNaEpoca, ajustadoPor: quem.id }
    : { pontos: valor, pontosAutoNaEpoca, ajustadoPor: quem.id }

  await prisma.pontuacaoTarefaAjuste.upsert({
    where: { departmentId_tarefa: { departmentId, tarefa } },
    create: { departmentId, tarefa, ...dados },
    update: dados,
  })
  return NextResponse.json({ ok: true })
}
