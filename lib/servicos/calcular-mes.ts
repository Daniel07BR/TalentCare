import 'server-only'
import { prisma } from '@/lib/db/prisma'
import { calcularCatalogo } from '@/lib/servicos/catalogo'
import { calcular, competenciaAtual, regraDaCompetencia, normalizarTarefa } from '@/lib/servicos/pontuacao'
import { coberturaDoPonto } from '@/lib/ponto-cobertura'
import { agregarAtividades } from '@/lib/servicos/atividade-agg'
import { TIPO_ATIVIDADE_POR_CHAVE } from '@/lib/servicos/atividades'
import { catalogoAtividades } from '@/lib/servicos/catalogo-atividades'

/* ============================================================
   RODAR A RÉGUA NUM MÊS — a conta e a gravação, num lugar só.

   ⚠️⚠️ EXTRAÍDA DA ROTA para ser A ÚNICA fonte da conta (08/09/2026). A rota
   `/api/servicos/pontuacao` (a tela) e o script `scripts/rodar-mes.ts` (a
   linha de comando) chamam ESTAS funções — a régua da casa mora em um lugar, e
   dois caminhos que computam a nota de aumento não podem divergir. Ver a lição
   de `lib/nexus.ts` × `run-sync.mjs`: lá a cópia é inevitável (node puro);
   aqui não é, então não se copia.

   AS QUATRO RECUSAS (mês sem ponto, mês aberto, informado, sem régua) e as três
   metades (disciplina + serviços + atividades) estão todas aqui.
   ============================================================ */

type LinhaCalculo = {
  personKey: string
  nome: string
  atrasos: number
  atrasosAbonados: number
  advertencias: number
  servicosConcluidos: number
  pontosDeServico: number
  totalAtividades: number
  pontosDeAtividade: number
  /** A pessoa não é medida pelo ponto: pontuou por serviço+atividade, sem a
   *  metade disciplinar (nem base, nem bônus). */
  semPonto: boolean
  pontos: number
  detalhe: string
  /** Já existe valor gravado neste mês, e de que origem. */
  jaTem: { pontos: number; origem: string } | null
}

export async function montar(departmentId: string, competencia: string) {
  const de = `${competencia}-01`
  const ate = `${competencia}-31`

  const [regras, cobertura, cat] = await Promise.all([
    prisma.pontuacaoRegra.findMany({
      where: { departmentId },
      select: { id: true, base: true, fatorPorMinuto: true, vigenteDesde: true, itens: { select: { evento: true, pontos: true } } },
    }),
    coberturaDoPonto(),
    calcularCatalogo(departmentId),
  ])

  const regra = regraDaCompetencia(regras, competencia)
  if (!regra) {
    return { erro: `Não há régua de pontuação vigente em ${competencia}. Crie a régua antes de calcular — sem ela não existe conta.` }
  }

  /* ⚠️⚠️ A JANELA FOI MEDIDA? Ver a recusa nº 1. */
  const { roster, primeiroDia, ultimoDia } = cobertura
  if (!primeiroDia || !ultimoDia || de < primeiroDia || ate > ultimoDia) {
    return {
      erro: `O ponto não cobre ${competencia} inteiro (medido de ${primeiroDia ?? '—'} a ${ultimoDia ?? '—'}). `
        + 'Calcular assim daria o bônus de "mês sem ocorrência" a quem simplesmente não foi medido.',
    }
  }
  /* ⚠️⚠️ Mês aberto — ver a recusa nº 2. */
  if (competencia >= competenciaAtual()) {
    return { erro: `${competencia} ainda não fechou. Um mês pela metade tem menos serviço do que terá, e a nota sairia baixa por isso.` }
  }

  const pontosPorTarefa = new Map(cat.tarefas.map((t) => [normalizarTarefa(t.tarefa), t.pontos]))

  const [pessoas, dias, discip, servicos, jaGravado] = await Promise.all([
    prisma.user.findMany({
      where: { departmentId, origin: { in: ['nexus', 'staff'] }, active: true },
      select: { id: true, nexusUserId: true, name: true },
    }),
    prisma.assiduidadeDaily.findMany({
      where: { day: { gte: de, lte: ate } },
      select: { personKey: true, atrasos: true, atrasosAbon: true },
    }),
    prisma.disciplinaEvento.groupBy({
      by: ['personKey'], where: { tipo: 'advertencia', data: { gte: de, lte: ate } }, _count: { _all: true },
    }),
    prisma.servicoDepto.findMany({
      where: { departmentId, status: 'concluida', dia: { gte: de, lte: ate }, personKey: { not: null } },
      select: { personKey: true, tarefa: true },
    }),
    prisma.pontuacaoMes.findMany({
      where: { departmentId, competencia }, select: { personKey: true, pontos: true, origem: true },
    }),
  ])

  /* A régua de atividades do setor + a conta das atividades no mês. `?? PADRÃO`
     porque a linha só existe quando o gestor mexeu — sem ela, a atividade vale
     o padrão (1), o que ela já vale na contagem crua de hoje. */
  const [catAtiv, aggAtiv] = await Promise.all([
    /* ⚠️ A MESMA conta da tela da régua: pontos = média×fator, mediana medida
       onde há. `catalogoAtividades` é a fonte única. */
    catalogoAtividades(departmentId),
    agregarAtividades(
      pessoas.map((p) => ({ personKey: p.nexusUserId ?? p.id, nexusUserId: p.nexusUserId, nome: p.name })),
      de, ate,
    ),
  ])
  const valorAtiv = (chave: string) => catAtiv.valorDe.get(chave) ?? 1
  /* "No padrão" = nenhuma média foi lançada à mão E não há mediana medida —
     tudo caindo no piso de 1. É quando o aviso da tela vale. */
  const algumaMediaDefinida = catAtiv.atividades.some((a) => a.mediaEmUso != null)

  const atr = new Map<string, { a: number; ab: number }>()
  for (const d of dias) {
    const v = atr.get(d.personKey) ?? { a: 0, ab: 0 }
    v.a += d.atrasos; v.ab += d.atrasosAbon
    atr.set(d.personKey, v)
  }
  const adv = new Map(discip.map((d) => [d.personKey, d._count._all]))
  const serv = new Map<string, { n: number; pts: number }>()
  for (const s of servicos) {
    if (!s.personKey) continue
    const v = serv.get(s.personKey) ?? { n: 0, pts: 0 }
    v.n++; v.pts += pontosPorTarefa.get(normalizarTarefa(s.tarefa)) ?? 0
    serv.set(s.personKey, v)
  }
  const gravado = new Map(jaGravado.map((p) => [p.personKey, p]))

  const linhas: LinhaCalculo[] = []
  const semPontoNomes: string[] = []
  for (const p of pessoas) {
    const pk = p.nexusUserId ?? p.id
    const o = atr.get(pk) ?? { a: 0, ab: 0 }
    const s = serv.get(pk) ?? { n: 0, pts: 0 }
    /* A terceira metade: soma cada atividade × o valor da régua do setor. */
    const mAtiv = aggAtiv.get(pk)
    let totalAtiv = 0, pontosAtiv = 0
    if (mAtiv) for (const [chave, qtd] of mAtiv) {
      if (!TIPO_ATIVIDADE_POR_CHAVE.has(chave)) continue
      totalAtiv += qtd; pontosAtiv += qtd * valorAtiv(chave)
    }

    /* ⚠️⚠️ QUEM O PONTO NÃO MEDE AINDA PONTUA — só sem a metade disciplinar. Ele
       fez serviço e atividade de verdade; zerá-lo seria apagar trabalho medido.
       O que ele NÃO leva é base nem bônus de mês limpo, que exigiriam afirmar
       que o mês dele foi impecável quando ninguém o mediu (a ausência-que-
       elogia). A tela diz "sem ponto" nessas linhas. */
    const semPonto = !roster.has(pk)
    if (semPonto) semPontoNomes.push(p.name)
    const c = calcular(
      { base: regra.base, itens: regra.itens },
      {
        atrasos: o.a, atrasosAbonados: o.ab, advertencias: adv.get(pk) ?? 0,
        servicosConcluidos: s.n, pontosDeServico: s.pts,
        totalAtividades: totalAtiv, pontosDeAtividade: pontosAtiv,
      },
      { semDisciplina: semPonto },
    )
    linhas.push({
      personKey: pk, nome: p.name,
      atrasos: o.a, atrasosAbonados: o.ab, advertencias: adv.get(pk) ?? 0,
      servicosConcluidos: s.n, pontosDeServico: s.pts,
      totalAtividades: totalAtiv, pontosDeAtividade: pontosAtiv,
      semPonto,
      pontos: c.pontos, detalhe: c.detalhe,
      jaTem: gravado.get(pk) ? { pontos: gravado.get(pk)!.pontos, origem: gravado.get(pk)!.origem } : null,
    })
  }

  linhas.sort((a, b) => b.pontos - a.pontos)
  return {
    competencia, regraId: regra.id, vigenteDesde: regra.vigenteDesde, base: regra.base,
    fatorPorMinuto: regra.fatorPorMinuto,
    /** ⚠️ Recusa nº 3: quem já tem valor informado não é recalculado. */
    informados: linhas.filter((l) => l.jaTem?.origem === 'informado').map((l) => l.nome),
    /** Quem o ponto não mede — NÃO fica de fora; pontua por serviço+atividade,
     *  sem a metade disciplinar. A tela diz quem. */
    foraDoPonto: semPontoNomes,
    /** ⚠️ Nenhum tipo de atividade teve o peso definido: todas contam pelo
     *  padrão (1). A nota está saindo com o peso que ninguém escolheu — a tela
     *  avisa antes de gravar. */
    atividadesNoPadrao: !algumaMediaDefinida
      && [...aggAtiv.values()].some((m) => [...m.values()].some((v) => v > 0)),
    /**
     * Quem não teve NENHUM serviço na planilha do mês.
     * ⚠️⚠️ A pergunta da casa outra vez: o que este número mostra para quem a
     * fonte não cobre? A metade de serviço só premia quem aparece na planilha,
     * e a metade disciplinar pune todo mundo — então o gestor, que não executa
     * serviço, fica na base e some do topo, enquanto quem executou muito sobe.
     * Medido em agosto/2026: o Evandro (gestor, 0 serviços, 1 atraso) dá 450 e
     * o Yago, com 19 serviços feitos, dá 269. Os dois números são corretos e
     * NÃO SÃO COMPARÁVEIS — colocá-los na mesma lista sem dizer isso é o tipo
     * de ranking que decide promoção pelo eixo errado.
     */
    semServico: linhas.filter((l) => l.servicosConcluidos === 0).map((l) => l.nome),
    linhas,
  }
}


/**
 * Grava a competência como `calculado`, respeitando a recusa nº 3 (não
 * sobrescreve o que o setor informou à mão). Devolve o resumo.
 */
export async function gravarMes(departmentId: string, competencia: string) {
  const r = await montar(departmentId, competencia)
  if ('erro' in r) return r
  const gravar = r.linhas.filter((l) => l.jaTem?.origem !== 'informado')
  for (const l of gravar) {
    await prisma.pontuacaoMes.upsert({
      where: { personKey_competencia: { personKey: l.personKey, competencia } },
      create: { departmentId, personKey: l.personKey, competencia, pontos: l.pontos, origem: 'calculado', regraId: r.regraId, detalhe: l.detalhe },
      update: { pontos: l.pontos, origem: 'calculado', regraId: r.regraId, detalhe: l.detalhe },
    })
  }
  return { ok: true as const, gravadas: gravar.length, preservadas: r.informados.length, ...r }
}
