import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { quemEh, podeGerirServicos } from '@/lib/avaliacoes/regua'
import { normalizarTarefa } from '@/lib/servicos/pontuacao'

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

   ── A DECISÃO QUE ATRAVESSA OS MESES (08/09/2026) ─────────────────────────

   O pedido do dono: "o pessoal do Legal já ajustou quanto vale cada serviço; o
   sistema tem de guardar isso para os próximos meses e apresentar para ajuste
   só os lançamentos novos".

   ⚠️⚠️ O VALOR CONTINUA ACOMPANHANDO A PLANILHA, e isso foi decidido, não
   herdado. Os limites de mínimo e máximo que o gestor pôs são uma REGRA, e
   regra se aplica a dado novo — congelar o número faria os 71 mínimos e 71
   máximos que o Legal acabou de configurar perderem efeito sobre tudo que
   entrar daqui para a frente. Medido antes de decidir: um mês a mais de
   planilha moveu **6 dos 72 tipos, todos em ±1 ponto**.

   ⚠️⚠️ MAS ACOMPANHAR SEM AVISAR SERIA MUDAR A NOTA DE ALGUÉM EM SILÊNCIO. Por
   isso a linha guarda `revisadoEm` e `pontosNaRevisao`: o catálogo sabe dizer
   o que **nunca foi olhado** e o que **mudou desde que foi olhado**.

   ⚠️⚠️ E "NUNCA OLHARAM" DEIXOU DE SER IGUAL A "OLHARAM E MANTIVERAM". Os dois
   eram a mesma ausência de linha no banco — a regra da casa na sua roupa desta
   semana: ausência de decisão não é decisão de manter. Sem o `revisar`, o tipo
   que a liderança conferiu e aprovou volta todo mês para a lista de
   pendências; e uma lista de pendências que nunca esvazia para de ser lida.
   ============================================================ */

export type TarefaPontuada = {
  tarefa: string
  amostras: number
  /**
   * A média das durações que SOBRARAM depois dos limites do gestor.
   * ⚠️ O nome engana e a documentação antiga mentia ("nunca muda com o
   * ajuste"): ela muda, sim — é a média do que o mínimo e o máximo deixaram
   * passar. Quem quer a medição crua é `mediaSemLimites`.
   */
  mediaMedida: number
  /**
   * A média de TODOS os serviços cronometrados, ignorando mínimo e máximo.
   * ⚠️⚠️ Existe porque "voltar ao medido" apaga os limites, e o botão prometia
   * o número COM eles. Medido em 08/09/2026: ALTERAÇÃO SIMPLES NACIONAL
   * anunciava "149 min → 75 pontos" e entregava 33 min → 17 pontos, porque os
   * limites tinham deixado 7 de 270 serviços. O botão dizia um número e fazia
   * outro, cinco vezes menor, na tela que define quanto o trabalho vale.
   */
  mediaSemLimites: number
  /**
   * Os limites não deixaram NENHUM serviço na média.
   * ⚠️⚠️ São 10 dos 74 tipos do Legal hoje. Sem esta marca, `mediaMedida` sai 0
   * e a tela afirma "o medido na planilha é 0 min" — quando o CANCELAMENTO tem
   * 33 min medidos em 78 serviços, todos fora dos limites de 120–240. É o
   * `null` virando 0 no lugar exato onde ele decide peso de trabalho.
   */
  semAmostraNaMedia: boolean
  /** A média EM USO: a que a liderança escolheu, ou a medida. */
  mediaEmUso: number
  mediaAjustada: number | null
  medianaMinutos: number
  /** Quantas entraram na conta, quantas vieram zeradas e quantas ficaram de
   *  fora por serem mais rápidas que o mínimo do gestor. */
  cronometradas: number
  zerados: number
  abaixoDoMinimo: number
  acimaDoMaximo: number
  /** Os limites que o gestor definiu, em minutos (`null` = não definiu). */
  tempoMinimo: number | null
  tempoMaximo: number | null
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

  /* ── a decisão que atravessa os meses ─────────────────────────────────── */
  /** Alguém já olhou este tipo e disse que o valor está certo? */
  revisado: boolean
  revisadoPor: string | null
  revisadoEm: string | null
  /** Quanto valia quando foi revisado — a âncora do "mudou desde então". */
  pontosNaRevisao: number | null
  /** O valor de hoje se afastou do que a pessoa conferiu. */
  mudouDesdeRevisao: boolean
  /**
   * A causa da mudança foi a RÉGUA, não a planilha.
   * ⚠️⚠️ As duas causas exigem reações diferentes e a tela precisa separá-las.
   * A planilha mexer no valor de um tipo é notícia: ninguém anunciou, e é
   * exatamente para isso que o aviso existe. A régua mudar move **todos** os
   * tipos ao mesmo tempo, por uma decisão que já tem autor, data e motivo
   * gravados — 74 alarmes individuais para um único ato deliberado não
   * informam nada e enterram o sinal que importa. Medido em 08/09/2026: o
   * Legal ganhou a primeira régua (fator 0,5 → 0,1) e os 74 tipos mudariam de
   * valor no mesmo instante.
   */
  mudouPelaRegua: boolean
  /** As OUTRAS grafias do mesmo tipo, SOMADAS nesta linha (caixa/acento/espaço). */
  grafias: string[]
  /** Havia mais de uma régua para o mesmo serviço; ficou a que dá mais pontos. */
  reguasEmDisputa: number
  /** De qual grafia veio a régua vencedora, quando não é a que nomeia a linha. */
  reguaDaGrafia: string | null
}

/** Os campos de VALOR de um ajuste — o que "voltar ao medido" desfaz. */
type ValoresDoAjuste = {
  mediaMinutos: number | null
  tempoMinimo: number | null
  tempoMaximo: number | null
  pontos: number | null
}
const mesmoValor = (a: ValoresDoAjuste, b: ValoresDoAjuste) =>
  a.mediaMinutos === b.mediaMinutos && a.tempoMinimo === b.tempoMinimo
  && a.tempoMaximo === b.tempoMaximo && a.pontos === b.pontos
const temValor = (a: ValoresDoAjuste) =>
  a.mediaMinutos != null || a.tempoMinimo != null || a.tempoMaximo != null || a.pontos != null

/**
 * Calcula o catálogo inteiro de um setor.
 *
 * ⚠️ Usada pelo GET e, depois de gravar, pelo POST — que devolve A LINHA já
 * recalculada. Antes a tela buscava as 74 de novo a cada tecla e entrava em
 * "carregando", o que apagava a tabela e fazia a pessoa perder o lugar. O
 * cálculo é o MESMO nos dois caminhos: duplicá-lo faria a linha devolvida
 * divergir da lista na próxima leitura.
 */
async function calcularCatalogo(departmentId: string) {
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
      where: { departmentId }, orderBy: { vigenteDesde: 'desc' },
      select: { fatorPorMinuto: true, criadoEm: true },
    }),
    prisma.user.findMany({
      where: { origin: { in: ['nexus', 'staff'] } },
      select: { id: true, nexusUserId: true, name: true },
    }),
  ])
  /* Quando entrou a última planilha — é o que decide se dá para saber quanto um
     tipo valia numa revisão antiga. Ver `ancorarOQueDaParaSaber`. */
  const ultimoLote = await prisma.importLote.findFirst({
    where: { departmentId }, orderBy: { enviadoEm: 'desc' }, select: { enviadoEm: true },
  })

  /* ⚠️⚠️ O FATOR PODE SER O PADRÃO DO CÓDIGO, NÃO UMA DECISÃO. O Legal não tem
     nenhuma versão de régua gravada, e a tela anunciava "cada tipo vale 0,5
     ponto por minuto" como fato — os 72 ajustes foram feitos olhando pontos
     derivados de um número que ninguém escolheu, e que é justamente a decisão
     ainda aberta com o dono. A tela passa a dizer de onde ele veio. */
  const fator = regra?.fatorPorMinuto ?? 0.5
  const fatorDecidido = regra != null
  const idsDeAutor = [...new Set(ajustes.flatMap((a) => [a.ajustadoPor, a.revisadoPor]).filter((x): x is string => !!x))]
  const autores = await prisma.user.findMany({ where: { id: { in: idsDeAutor } }, select: { id: true, name: true } })
  const nomePorId = new Map(autores.map((a) => [a.id, a.name]))

  /* ⚠️⚠️ A BUSCA TOLERANTE À GRAFIA. Tenta a grafia exata primeiro; só quando
     não acha é que cai na normalizada. É assim que a decisão sobrevive a uma
     maiúscula trocada no export do mês que vem — e é assim que ela NÃO mescla
     sozinha duas decisões que já existem e divergem (o caso das "Emitir/emitir
     boletos", com máximos 240 e 237): a tela mostra as duas e o Legal escolhe. */
  const porNorm = new Map<string, typeof ajustes>()
  for (const a of ajustes) {
    const k = a.tarefaNorm || normalizarTarefa(a.tarefa)
    porNorm.set(k, [...(porNorm.get(k) ?? []), a])
  }

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
  /* ⚠️⚠️ O AGRUPAMENTO É POR GRAFIA NORMALIZADA — decisão do dono em 08/09/2026:
     "no TFE, considere o mesmo serviço". Antes o catálogo agrupava pelo texto
     exato, e o mesmo serviço virava DUAS linhas: "TAXAS PREFEITURA (TFE/TFA)
     Emitir boletos" e "… emitir boletos", 5 concluídos cada, com réguas
     configuradas separadamente (máximos 240 e 237) e pontos diferentes (87 e
     84). Duas linhas plausíveis, nada acusando — e a amostra do serviço partida
     ao meio, o que importa num catálogo em que 29 tipos já têm menos de 5
     medições.

     Agrupado, o serviço tem UMA linha, UMA amostra (os 10) e UM valor. */
  const porTarefa = new Map<string, typeof linhas>()
  const grafiasPorNorm = new Map<string, Map<string, number>>()
  for (const l of linhas) {
    const k = normalizarTarefa(l.tarefa)
    porTarefa.set(k, [...(porTarefa.get(k) ?? []), l])
    const g = grafiasPorNorm.get(k) ?? new Map<string, number>()
    g.set(l.tarefa, (g.get(l.tarefa) ?? 0) + 1)
    grafiasPorNorm.set(k, g)
  }
  /** A grafia que nomeia o tipo: a mais frequente. Empate, a primeira A→Z. */
  const canonicaDe = (norm: string) =>
    [...(grafiasPorNorm.get(norm) ?? new Map<string, number>())]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))[0]?.[0] ?? norm

  const nomeDaChave = new Map(usuariosDoSetor.map((u) => [u.nexusUserId ?? u.id, u.name]))
  const brDia = (d: string) => d.split('-').reverse().join('/')
  /** Quem fez e quando — é o que explica um extremo. */
  const quemFez = (l: { personKey: string | null; nomeOrigem: string; dia: string }) =>
    `${(l.personKey && nomeDaChave.get(l.personKey)) || l.nomeOrigem} · ${brDia(l.dia)}`

  /** Aplica uma régua à amostra e devolve o que ela produz. Um lugar só: é a
   *  conta que decide o valor, e ela precisa ser a MESMA na hora de comparar
   *  duas réguas candidatas e na hora de exibir a vencedora. */
  const aplicar = (todas: typeof linhas, aj: (typeof ajustes)[number] | null) => {
    const minimo = aj?.tempoMinimo ?? null
    const maximo = aj?.tempoMaximo ?? null
    const comTempo = todas.filter((l) => l.minutos > 0)
    const dentroDoMinimo = minimo != null ? comTempo.filter((l) => l.minutos >= minimo) : comTempo
    const cronometradas = maximo != null ? dentroDoMinimo.filter((l) => l.minutos <= maximo) : dentroDoMinimo
    const mediaMedida = cronometradas.length
      ? Math.round(cronometradas.reduce((a, l) => a + l.minutos, 0) / cronometradas.length)
      : 0
    const mediaEmUso = aj?.mediaMinutos ?? mediaMedida
    const pontosAuto = Math.max(1, Math.round(mediaEmUso * fator))
    return { pontos: aj?.pontos ?? pontosAuto, pontosAuto, mediaMedida, mediaEmUso, cronometradas, comTempo, dentroDoMinimo }
  }

  const tarefas: TarefaPontuada[] = [...porTarefa].map(([norm, todas]) => {
    const tarefa = canonicaDe(norm)
    /* ⚠️⚠️ DUAS RÉGUAS PARA O MESMO SERVIÇO: FICA A QUE DÁ MAIS PONTOS (decisão
       do dono, 08/09/2026). O caso real são as duas grafias do TFE, com máximos
       240 e 237 — configuradas pela mesma equipe, no mesmo dia, para o mesmo
       serviço, e a diferença é um teto três minutos mais apertado. Escolher a
       mais generosa é o que o dono decidiu; o alternativo seria o sistema
       arbitrar qual das duas pessoas errou.
       ⚠️ A escolha fica VISÍVEL na linha (`reguasEmDisputa`, `reguaDaGrafia`):
       uma régua que ganha em silêncio é uma régua que ninguém revisa. */
    const candidatas = porNorm.get(norm) ?? []
    const aj0 = candidatas.length <= 1 ? (candidatas[0] ?? null)
      : [...candidatas].sort((a, b) => {
          const d = aplicar(todas, b).pontos - aplicar(todas, a).pontos
          if (d !== 0) return d
          return (b.ajustadoEm?.getTime() ?? 0) - (a.ajustadoEm?.getTime() ?? 0)
        })[0]

    const minimo = aj0?.tempoMinimo ?? null
    const maximo = aj0?.tempoMaximo ?? null
    const comTempo = todas.filter((l) => l.minutos > 0)
    const zerados = todas.length - comTempo.length
    /* ⚠️⚠️ ABAIXO DO MÍNIMO SAI DA MÉDIA — mas o serviço CONTINUA contando como
       feito. O gestor pediu para desconsiderar o tempo, não o trabalho: um
       certificado de 1 minuto foi entregue, o que não foi foi o cronômetro. */
    const dentroDoMinimo = minimo != null ? comTempo.filter((l) => l.minutos >= minimo) : comTempo
    const abaixoDoMinimo = comTempo.length - dentroDoMinimo.length
    /* ⚠️ O MÁXIMO é o espelho do mínimo e o incentivo é invertido: tira os
       lentos e DESCE a média. Juntos, os dois afinam o número nas duas
       direções — daí o rastro visível de quantos cada um removeu. */
    const cronometradas = maximo != null ? dentroDoMinimo.filter((l) => l.minutos <= maximo) : dentroDoMinimo
    const acimaDoMaximo = dentroDoMinimo.length - cronometradas.length
    /* Tipo em que NINGUÉM cronometrou nada: a média não existe. Devolver 0 aqui
       daria 1 ponto ao serviço e ninguém saberia por quê. */
    const base = cronometradas.length ? cronometradas : []
    const ordenado = [...base].sort((a, b) => a.minutos - b.minutos)
    const mediaMedida = base.length
      ? Math.round(base.reduce((a, l) => a + l.minutos, 0) / base.length)
      : 0
    /* A medição crua: todo mundo que teve cronômetro, sem os limites. É o que
       "voltar ao medido" realmente entrega, e por isso é o que o botão promete. */
    const mediaSemLimites = comTempo.length
      ? Math.round(comTempo.reduce((a, l) => a + l.minutos, 0) / comTempo.length)
      : 0
    const mediana = ordenado.length ? ordenado[Math.floor(ordenado.length / 2)].minutos : 0
    const aj = aj0
    /* A média EM USO é a que a liderança escolheu, quando escolheu. A medida
       continua viajando ao lado: trocar uma pela outra faria o sistema afirmar
       que mediu o que alguém decidiu. */
    const mediaEmUso = aj?.mediaMinutos ?? mediaMedida
    const pontosAuto = Math.max(1, Math.round(mediaEmUso * fator))
    const pontos = aj?.pontos ?? pontosAuto

    const outrasGrafias = [...(grafiasPorNorm.get(norm) ?? new Map<string, number>()).keys()].filter((g) => g !== tarefa)
    const valoresDe = (a: (typeof ajustes)[number] | null): ValoresDoAjuste => ({
      mediaMinutos: a?.mediaMinutos ?? null, tempoMinimo: a?.tempoMinimo ?? null,
      tempoMaximo: a?.tempoMaximo ?? null, pontos: a?.pontos ?? null,
    })
    /* Quantas réguas DIFERENTES existiam para este mesmo serviço. Uma só (ou
       nenhuma) não é disputa; duas iguais também não. */
    const distintas = candidatas.filter((c, i) =>
      candidatas.findIndex((o) => mesmoValor(valoresDe(o), valoresDe(c))) === i)
    const reguasEmDisputa = distintas.length > 1 ? distintas.length : 0

    return {
      tarefa,
      amostras: todas.length,
      /** Quantas entraram na conta — as cronometradas. */
      cronometradas: cronometradas.length,
      /** Quantas vieram sem tempo e ficaram FORA da média. */
      zerados,
      abaixoDoMinimo,
      acimaDoMaximo,
      tempoMinimo: minimo,
      tempoMaximo: maximo,
      mediaMedida,
      mediaSemLimites,
      semAmostraNaMedia: comTempo.length > 0 && cronometradas.length === 0,
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
      pontos,
      pontosAjustados: aj?.pontos != null,
      /* ⚠️ "Ajustado" é ter VALOR gravado, não ter linha. Uma linha que só
         registra "conferi e mantive" não tem o que desfazer — e o botão de
         voltar ao medido ficaria aceso sem nada para apagar. */
      ajustado: !!aj && temValor(valoresDe(aj)),
      ajustadoPor: aj?.ajustadoPor ? (nomePorId.get(aj.ajustadoPor) ?? '—') : null,
      ajustadoEm: aj?.ajustadoEm ? aj.ajustadoEm.toISOString() : null,
      pontosAutoNaEpoca: aj?.pontosAutoNaEpoca ?? null,

      revisado: !!aj?.revisadoEm,
      revisadoPor: aj?.revisadoPor ? (nomePorId.get(aj.revisadoPor) ?? '—') : null,
      revisadoEm: aj?.revisadoEm ? aj.revisadoEm.toISOString() : null,
      pontosNaRevisao: aj?.pontosNaRevisao ?? null,
      /* ⚠️⚠️ Só afirma que MUDOU quando há com o que comparar. `pontosNaRevisao`
         nulo é "não sei quanto valia" — e "não sei" não pode virar "mudou", que
         é a mesma inversão do null→0 com outra fantasia. */
      mudouDesdeRevisao: !!aj?.revisadoEm && aj.pontosNaRevisao != null && aj.pontosNaRevisao !== pontos,
      mudouPelaRegua: !!aj?.revisadoEm && aj.pontosNaRevisao != null && aj.pontosNaRevisao !== pontos
        && regra?.criadoEm != null && regra.criadoEm > aj.revisadoEm,
      grafias: outrasGrafias,
      reguasEmDisputa,
      reguaDaGrafia: aj0 && aj0.tarefa !== tarefa ? aj0.tarefa : null,
    }
  }).sort((a, b) => b.amostras - a.amostras)

  /* ⚠️⚠️ O QUE PODE TER MUDADO O VALOR: uma planilha nova OU uma régua nova.
     A primeira versão olhava só a importação — e o fator multiplica TODOS os
     pontos, então criar a régua muda o catálogo inteiro sem que arquivo nenhum
     entre. Ancorar por "revisou depois do último lote" gravaria, nesse caso, o
     valor JÁ mudado como se fosse o que a pessoa tinha conferido, apagando em
     silêncio exatamente a mudança que o aviso existe para mostrar. */
  const marcos = [ultimoLote?.enviadoEm, regra?.criadoEm].filter((d): d is Date => !!d)
  const ultimaMudanca = marcos.length ? new Date(Math.max(...marcos.map((d) => d.getTime()))) : null
  await ancorarOQueDaParaSaber(departmentId, ajustes, tarefas, ultimaMudanca)

  return {
    fatorPorMinuto: fator, fatorDecidido,
    /** Quando a régua em vigor foi gravada — a data que a tela mostra ao dizer
     *  "todos mudaram porque a régua mudou". */
    reguaCriadaEm: regra?.criadoEm?.toISOString() ?? null,
    totalConcluidos: linhas.length, tarefas,
  }
}

/**
 * Grava a âncora `pontosNaRevisao` das revisões antigas — mas SÓ das que dá
 * para saber.
 *
 * ⚠️⚠️ AS 72 DECISÕES DO LEGAL SÃO ANTERIORES A ESTE CAMPO, e sem âncora o
 * aviso de "mudou desde que você conferiu" nasceria mudo justamente para as
 * únicas linhas que já existem. A tentação é gravar o valor de hoje em todas —
 * e isso seria AFIRMAR que o tipo valia isto quando a pessoa o conferiu, sem
 * ter medido nada. Inventar procedência para número de gente de verdade é o
 * que a regra (d) da casa proíbe.
 *
 * ⚠️⚠️ A condição que torna a afirmação verdadeira: a revisão ser POSTERIOR a
 * tudo que pode ter mexido no valor — a última importação **e** a última
 * versão da régua (o fator multiplica o catálogo inteiro). Se nada disso veio
 * depois da revisão, o valor de hoje **é** o valor daquele dia. Foi o caso
 * conferido em 08/09/2026: um único lote em 04/09 11:07, nenhuma régua gravada
 * e as 72 decisões entre 04/09 19:41 e 08/09.
 *
 * Revisão anterior a uma importação fica sem âncora — e a tela então diz
 * "conferido em tal dia" sem afirmar variação nenhuma, que é a resposta certa
 * para "não sei".
 */
async function ancorarOQueDaParaSaber(
  departmentId: string,
  ajustes: { tarefa: string; revisadoEm: Date | null; pontosNaRevisao: number | null }[],
  tarefas: TarefaPontuada[],
  ultimaMudanca: Date | null,
) {
  /* ⚠️ Por grafia NORMALIZADA: o catálogo agrupa as grafias numa linha só, mas
     o banco guarda uma por grafia — casar pelo texto exato deixaria as irmãs
     sem âncora para sempre, mudas justamente onde o aviso importa. */
  const pontosDe = new Map(tarefas.map((t) => [normalizarTarefa(t.tarefa), t.pontos]))
  const alvo = ajustes.filter((a) =>
    a.revisadoEm != null && a.pontosNaRevisao == null && pontosDe.has(normalizarTarefa(a.tarefa))
    && (ultimaMudanca == null || a.revisadoEm > ultimaMudanca))
  if (!alvo.length) return
  await Promise.all(alvo.map((a) => prisma.pontuacaoTarefaAjuste.update({
    where: { departmentId_tarefa: { departmentId, tarefa: a.tarefa } },
    data: { pontosNaRevisao: pontosDe.get(normalizarTarefa(a.tarefa))! },
  })))
  const ancorados = new Set(alvo.map((a) => normalizarTarefa(a.tarefa)))
  for (const t of tarefas) {
    if (ancorados.has(normalizarTarefa(t.tarefa))) {
      t.pontosNaRevisao = pontosDe.get(normalizarTarefa(t.tarefa))!
      t.mudouDesdeRevisao = false
    }
  }
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
