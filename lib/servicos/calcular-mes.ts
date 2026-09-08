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
  /**
   * ⚠️⚠️ POR QUE ESTA PESSOA NÃO RECEBE NOTA (`null` = recebe).
   *
   * A régua já se recusava a dar o bônus de mês limpo a quem o PONTO não mede
   * (a ausência que elogia). Faltava a metade simétrica, e ela apareceu ao
   * rodar os outros setores em 08/09/2026: **32 de 95 pessoas sairiam com nota
   * NEGATIVA e 12 com zero**, porque a metade disciplinar pune todo mundo e a
   * de crédito só premia quem passa por sistema espelhado. Um zero gravado ali
   * não é "não produziu", é "não medimos" — e num painel que decide aumento o
   * zero acusa.
   *
   * - `sem-credito`: nenhuma atividade e nenhum serviço no mês. Não há de onde
   *   sair nota; o que sobraria seria assiduidade com outro nome.
   * - `chefia`: gestor, sub-encarregado, diretor. A pontuação mede EXECUÇÃO, e
   *   chefia não é avaliada por volume de execução — muito menos ranqueada
   *   contra a própria equipe. Decisão do dono, 08/09/2026.
   *   ⚠️ O motivo é a FUNÇÃO, não a falta de fonte: a Joice (sub do Legal) tem
   *   242 atividades e 8 serviços em agosto. Dizer "não passa por sistema
   *   espelhado" sobre ela seria falso na tela.
   */
  semNota: null | 'sem-credito' | 'chefia'
}

/** Cargos que não são pontuados por execução. */
const CARGOS_DE_CHEFIA = new Set(['Gestor', 'Sub-encarregado', 'Diretor', 'Administrador'])

/**
 * ⚠️⚠️ O MÊS PARCIAL (pedido do dono, 08/09/2026).
 *
 * As atividades dos sistemas do Nexus são apontadas AO VIVO; a planilha de
 * serviços do Legal sobe no FIM do mês. Enquanto o mês corre, a competência não
 * tinha linha em `pontuacao_mes` e a coluna do setor lia "— sem pontuação no
 * mês" para as oito pessoas — o trabalho já registrado não aparecia em lugar
 * nenhum até o mês fechar.
 *
 * O parcial mostra o que JÁ ACONTECEU, e por isso ele tem três travas:
 *
 * 1. **Não grava.** `gravarMes` nunca o pede. Um parcial gravado viraria, no
 *    mês seguinte, um mês fechado baixo — e ninguém saberia que faltava metade.
 * 2. **Sem o bônus de mês limpo** (em `calcular`): no dia 8 não se afirma que o
 *    mês foi impecável.
 * 3. **Diz até quando mediu**, e em DUAS pontas: a atividade é fresca (sync
 *    diário) e o ponto é import à MÃO, sem cron. As duas janelas não coincidem,
 *    e fingir uma só faria o atraso ainda não importado ler como "não houve".
 *
 * ⚠️ E ele NÃO é comparável com um mês fechado: faltam os dias que não
 * aconteceram e falta a planilha de serviços inteira. Quem exibe tem de dizer
 * isso — é a regra (b) da casa num calendário.
 */
export async function montar(
  departmentId: string,
  competencia: string,
  opts?: { parcial?: boolean; hoje?: string },
) {
  const de = `${competencia}-01`
  const fimDoMes = `${competencia}-31`
  const hoje = opts?.hoje ?? new Date().toISOString().slice(0, 10)
  /* Parcial só faz sentido no mês CORRENTE: num mês passado a janela inteira já
     aconteceu, e "parcial" ali seria só um mês fechado com nome errado. */
  const parcial = opts?.parcial === true && competencia === competenciaAtual()
  const ate = parcial ? (hoje < fimDoMes ? hoje : fimDoMes) : fimDoMes

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

  /* ⚠️⚠️ A JANELA FOI MEDIDA? Ver a recusa nº 1.
     No PARCIAL a exigência muda de forma, não de rigor: o mês fechado precisa
     estar medido INTEIRO (senão o bônus de mês limpo vai para dias que ninguém
     olhou); o parcial não dá bônus nenhum, então o que ele precisa é saber ATÉ
     ONDE o ponto chegou — e dizer. */
  const { roster, primeiroDia, ultimoDia } = cobertura
  if (!primeiroDia || !ultimoDia) {
    return { erro: 'O ponto ainda não foi importado — não há janela medida.' }
  }
  if (!parcial && (de < primeiroDia || ate > ultimoDia)) {
    return {
      erro: `O ponto não cobre ${competencia} inteiro (medido de ${primeiroDia} a ${ultimoDia}). `
        + 'Calcular assim daria o bônus de "mês sem ocorrência" a quem simplesmente não foi medido.',
    }
  }
  /* ⚠️⚠️ Mês aberto — ver a recusa nº 2. Continua valendo para o que se GRAVA;
     o parcial existe justamente para mostrar o mês aberto sem gravá-lo. */
  if (!parcial && competencia >= competenciaAtual()) {
    return { erro: `${competencia} ainda não fechou. Um mês pela metade tem menos serviço do que terá, e a nota sairia baixa por isso.` }
  }

  /* ⚠️⚠️ AS DUAS JANELAS DO PARCIAL. A atividade vem de sync diário (fresca até
     hoje); o ponto é import à mão, SEM CRON, e pode estar dias atrás. Usar a
     janela da atividade para a disciplina faria o atraso ainda não importado
     ler como "não houve atraso" — a ausência virando elogio pela porta do
     calendário. Então a disciplina para onde o ponto parou. */
  const disciplinaAte = parcial ? (ate < ultimoDia ? ate : ultimoDia) : ate
  /* O ponto não alcançou nem o começo do mês: não há disciplina medida para
     ninguém nesta janela. Todos pontuam só por serviço e atividade. */
  const semDisciplinaNaJanela = parcial && disciplinaAte < de

  const pontosPorTarefa = new Map(cat.tarefas.map((t) => [normalizarTarefa(t.tarefa), t.pontos]))

  const [pessoas, dias, discip, servicos, jaGravado] = await Promise.all([
    prisma.user.findMany({
      where: { departmentId, origin: { in: ['nexus', 'staff'] }, active: true },
      select: { id: true, nexusUserId: true, name: true, jobTitle: true },
    }),
    /* ⚠️ Disciplina até onde o PONTO mediu (ver `disciplinaAte`), não até hoje. */
    semDisciplinaNaJanela ? Promise.resolve([]) : prisma.assiduidadeDaily.findMany({
      where: { day: { gte: de, lte: disciplinaAte } },
      select: { personKey: true, atrasos: true, atrasosAbon: true },
    }),
    semDisciplinaNaJanela ? Promise.resolve([]) : prisma.disciplinaEvento.groupBy({
      by: ['personKey'], where: { tipo: 'advertencia', data: { gte: de, lte: disciplinaAte } }, _count: { _all: true },
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
    const semPonto = !roster.has(pk) || semDisciplinaNaJanela
    if (semPonto) semPontoNomes.push(p.name)
    const c = calcular(
      { base: regra.base, itens: regra.itens },
      {
        atrasos: o.a, atrasosAbonados: o.ab, advertencias: adv.get(pk) ?? 0,
        servicosConcluidos: s.n, pontosDeServico: s.pts,
        totalAtividades: totalAtiv, pontosDeAtividade: pontosAtiv,
      },
      { semDisciplina: semPonto, parcial },
    )
    /* ⚠️ A ordem importa: chefia primeiro. Um gestor SEM crédito sai por ser
       chefia, não por falta de fonte — e a tela diz o motivo certo. */
    const semNota: LinhaCalculo['semNota'] =
      CARGOS_DE_CHEFIA.has(p.jobTitle ?? '') ? 'chefia'
        : (totalAtiv === 0 && s.n === 0) ? 'sem-credito'
        : null
    linhas.push({
      semNota,
      personKey: pk, nome: p.name,
      atrasos: o.a, atrasosAbonados: o.ab, advertencias: adv.get(pk) ?? 0,
      servicosConcluidos: s.n, pontosDeServico: s.pts,
      totalAtividades: totalAtiv, pontosDeAtividade: pontosAtiv,
      semPonto,
      pontos: c.pontos, detalhe: c.detalhe,
      jaTem: gravado.get(pk) ? { pontos: gravado.get(pk)!.pontos, origem: gravado.get(pk)!.origem } : null,
    })
  }

  /* Quem não recebe nota vai para o FIM, não para o fundo do ranking: não é o
     último colocado, é quem não está na corrida. Mesma regra da lista do setor. */
  linhas.sort((a, b) => {
    if (!!a.semNota !== !!b.semNota) return a.semNota ? 1 : -1
    return b.pontos - a.pontos
  })
  return {
    competencia, regraId: regra.id, vigenteDesde: regra.vigenteDesde, base: regra.base,
    fatorPorMinuto: regra.fatorPorMinuto,
    /** O mês ainda não fechou: este número NÃO é comparável com um mês cheio. */
    parcial,
    /** Até que dia a atividade e os serviços foram somados. */
    ateDia: ate,
    /** Até que dia o PONTO mediu — pode ser antes, e a tela diz as duas. */
    disciplinaAteDia: semDisciplinaNaJanela ? null : disciplinaAte,
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
    /** Quem NÃO recebe nota, e por quê — ver `LinhaCalculo.semNota`. */
    semNota: linhas.filter((l) => l.semNota).map((l) => ({ nome: l.nome, motivo: l.semNota as string })),
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
  /* ⚠️⚠️ Quem não recebe nota NÃO é gravado — e o que já estiver gravado dele é
     APAGADO. Sem o apagamento, a regra nova só valeria para o futuro e os zeros
     e negativos da rodada anterior ficariam no banco, invisíveis e citáveis. */
  const apagar = r.linhas.filter((l) => l.semNota && l.jaTem && l.jaTem.origem !== 'informado')
  for (const l of apagar) {
    await prisma.pontuacaoMes.delete({
      where: { personKey_competencia: { personKey: l.personKey, competencia } },
    }).catch(() => {})
  }
  const gravar = r.linhas.filter((l) => !l.semNota && l.jaTem?.origem !== 'informado')
  for (const l of gravar) {
    await prisma.pontuacaoMes.upsert({
      where: { personKey_competencia: { personKey: l.personKey, competencia } },
      create: { departmentId, personKey: l.personKey, competencia, pontos: l.pontos, origem: 'calculado', regraId: r.regraId, detalhe: l.detalhe },
      update: { pontos: l.pontos, origem: 'calculado', regraId: r.regraId, detalhe: l.detalhe },
    })
  }
  return { ok: true as const, gravadas: gravar.length, apagadas: apagar.length, preservadas: r.informados.length, ...r }
}
