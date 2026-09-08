import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { quemEh, podeGerirServicos } from '@/lib/avaliacoes/regua'
import { calcularCatalogo } from '@/lib/servicos/catalogo'
import { calcular, competenciaAtual, competenciaValida, regraDaCompetencia, normalizarTarefa } from '@/lib/servicos/pontuacao'
import { coberturaDoPonto } from '@/lib/ponto-cobertura'

/* ============================================================
   RODAR A RÉGUA NUM MÊS, e gravar a pontuação como `calculado`.

   É o passo que faz o catálogo de tipos chegar ao gráfico da ficha. Até
   08/09/2026 os 15 meses do Legal eram todos `informado` — vieram na planilha,
   feitos à mão por um critério anterior — e a régua não produzia nada.

   ── AS QUATRO RECUSAS ─────────────────────────────────────────────────────

   ⚠️⚠️ 1. MÊS QUE O PONTO NÃO COBRE NÃO SE CALCULA. A régua dá **+100 de bônus
   ao mês sem ocorrência**, e quem não foi medido não teve ocorrência nenhuma —
   sairia com o bônus por um mês que ninguém olhou. É a regra da casa na sua
   forma mais cara: a ausência não acusa, ela ELOGIA, e elogio não levanta
   suspeita em ninguém. Medido em 08/09/2026, antes do dump novo: o ponto
   terminava em 25/06 e os serviços iam até 31/08 — julho e agosto teriam dado
   base + bônus para a equipe inteira.

   ⚠️⚠️ 2. MÊS ABERTO NÃO SE CALCULA. Um mês pela metade tem menos serviço do
   que terá, e a nota sai baixa por não ter acabado — que se lê como queda de
   desempenho. É o mesmo defeito do "dia PARCIAL apaga o dia cheio".

   ⚠️⚠️ 3. NÃO SE SOBRESCREVE O QUE O SETOR INFORMOU. Os 98 meses `informado`
   foram produzidos por outro critério e a pessoa já os leu; recalculá-los com a
   régua de hoje reescreveria o passado dela em silêncio. `origem` existe para
   separar os dois, e aqui é onde a separação é honrada.

   ⚠️ 4. SEM RÉGUA VIGENTE NAQUELE MÊS, NÃO HÁ CONTA. `regraDaCompetencia` pega a
   versão de maior `vigenteDesde` que ainda é `<=` à competência — pegar
   simplesmente a última recalcularia o passado com o critério de hoje.

   ⚠️ Duas fases, como a importação da planilha: sem `confirmar` a rota devolve
   o que ELA FARIA, pessoa por pessoa, e não escreve nada.
   ============================================================ */

type LinhaCalculo = {
  personKey: string
  nome: string
  atrasos: number
  atrasosAbonados: number
  advertencias: number
  servicosConcluidos: number
  pontosDeServico: number
  pontos: number
  detalhe: string
  /** Já existe valor gravado neste mês, e de que origem. */
  jaTem: { pontos: number; origem: string } | null
}

async function montar(departmentId: string, competencia: string) {
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
  const foraDoPonto: string[] = []
  for (const p of pessoas) {
    const pk = p.nexusUserId ?? p.id
    /* ⚠️⚠️ A PESSOA é medida? A outra metade da cobertura. Quem o ponto não
       alcança entraria com 0 atraso, 0 advertência e o bônus de mês limpo —
       ganhando da colega que é medida e chegou no horário. */
    if (!roster.has(pk)) { foraDoPonto.push(p.name); continue }
    const o = atr.get(pk) ?? { a: 0, ab: 0 }
    const s = serv.get(pk) ?? { n: 0, pts: 0 }
    const c = calcular(
      { base: regra.base, itens: regra.itens },
      { atrasos: o.a, atrasosAbonados: o.ab, advertencias: adv.get(pk) ?? 0, servicosConcluidos: s.n, pontosDeServico: s.pts },
    )
    linhas.push({
      personKey: pk, nome: p.name,
      atrasos: o.a, atrasosAbonados: o.ab, advertencias: adv.get(pk) ?? 0,
      servicosConcluidos: s.n, pontosDeServico: s.pts,
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
    /** Quem o ponto não mede — fica de fora, e a tela diz quem. */
    foraDoPonto,
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

export async function GET(req: NextRequest) {
  const session = await auth()
  const uid = (session?.user as { id?: string } | undefined)?.id
  const quem = uid ? await quemEh(uid) : null
  if (!quem) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const departmentId = req.nextUrl.searchParams.get('departmentId') ?? ''
  const competencia = req.nextUrl.searchParams.get('competencia') ?? ''
  if (!podeGerirServicos(quem, departmentId)) {
    return NextResponse.json({ error: 'Você não administra este setor.' }, { status: 403 })
  }
  if (!competenciaValida(competencia)) return NextResponse.json({ error: 'Competência inválida (use AAAA-MM).' }, { status: 422 })

  const r = await montar(departmentId, competencia)
  if ('erro' in r) return NextResponse.json({ error: r.erro }, { status: 422 })
  return NextResponse.json(r)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  const uid = (session?.user as { id?: string } | undefined)?.id
  const quem = uid ? await quemEh(uid) : null
  if (!quem) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null) as { departmentId?: string; competencia?: string } | null
  const departmentId = body?.departmentId ?? ''
  const competencia = body?.competencia ?? ''
  if (!podeGerirServicos(quem, departmentId)) {
    return NextResponse.json({ error: 'Você não administra este setor.' }, { status: 403 })
  }
  if (!competenciaValida(competencia)) return NextResponse.json({ error: 'Competência inválida (use AAAA-MM).' }, { status: 422 })

  const r = await montar(departmentId, competencia)
  if ('erro' in r) return NextResponse.json({ error: r.erro }, { status: 422 })

  /* ⚠️⚠️ Recusa nº 3, no ponto em que ela custa: quem tem valor INFORMADO fica
     como está. O `upsert` sem esta guarda reescreveria em silêncio o número que
     o setor produziu à mão e que a pessoa já leu. */
  const gravar = r.linhas.filter((l) => l.jaTem?.origem !== 'informado')
  for (const l of gravar) {
    await prisma.pontuacaoMes.upsert({
      where: { personKey_competencia: { personKey: l.personKey, competencia } },
      create: {
        departmentId, personKey: l.personKey, competencia,
        pontos: l.pontos, origem: 'calculado', regraId: r.regraId, detalhe: l.detalhe,
      },
      update: { pontos: l.pontos, origem: 'calculado', regraId: r.regraId, detalhe: l.detalhe },
    })
  }
  return NextResponse.json({ ok: true, gravadas: gravar.length, preservadas: r.informados.length, ...r })
}
