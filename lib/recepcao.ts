import type { PrismaClient } from '@prisma/client'
import { isHiddenDept } from './hidden-depts'
import { ehRecepcao } from './recepcao-setor'

export { ehRecepcao }

/* ============================================================
   ATENDIMENTO DA RECEPÇÃO (16/10/2026).

   Pedido do Daniel: os indicadores da Recepção no TalentCare, no setor e na ficha,
   "só aparecendo, sem entrar na nota". Duas fontes:
   - Fluxo (`recepcao_daily` + `recepcao_area_daily`, `run-recepcao-sync.mjs`): ligações
     recebidas e feitas, visitas, delivery e contato em lote;
   - CIDE (`cide_daily.contatos_*`, `run-cide-sync.mjs`): os contatos das empresas que a
     Recepção atualiza.

   AS OUTRAS TAREFAS (29/10/2026): o Daniel conferiu se o TalentCare refletia TUDO o que a
   Recepção faz, e faltava o que não é atendimento — entrevistas (agendar, cadastrar, encerrar,
   lançar o código dos testes, acompanhar o dia), o Controle de faltas do VT e VR (o dia de uma
   pessoa conferido, não o clique), prestadores de serviço cadastrados e marcadores postos nos
   contatos do CIDE. Mesmo espelho, mesma rota do Fluxo; a régua de quem ganha o crédito mora lá
   (`plane/fluxo/talent_recepcao.py`).

   ⚠️⚠️ O TOTAL DO SETOR NÃO É A SOMA DAS PESSOAS. Uma visita com duas atendentes é uma
   visita para o setor e uma para cada atendente. O total vem de `recepcao_area_daily`
   (contado por registro no Fluxo); a parte de cada pessoa, de `recepcao_daily`.
   ⚠️ Fora da régua de pontuação de propósito: nada daqui entra em `lib/servicos/atividades.ts`.
   ============================================================ */


export type Contatos = { atualizados: number; editados: number; novos: number; removidos: number }
export type Numeros = {
  recebidas: number
  feitas: number
  naoRealizadas: number
  /** Média de pedido → ligação feita, em minutos. Nulo sem ligação feita. */
  esperaLigacaoMin: number | null
  visitas: number
  deliveries: number
  /** Média de pedido → Chegou, em minutos. */
  esperaDeliveryMin: number | null
  contatosEmLote: number
  /** Nulo = o CIDE não mediu (linha anterior a 16/10/2026 sem backfill), não zero. */
  contatos: Contatos | null
  /** As outras tarefas (29/10/2026). */
  entrevistas: Entrevistas
  /** Controle de faltas: dias de pessoas conferidos (um por pessoa, dia e dia de trabalho). */
  faltasConferidas: number
  prestadores: number
  marcadores: number
}
/** `total` = agendadas + cadastradas + encerradas: o que a Recepção resolveu de cada candidato.
 *  Testes e acompanhadas são do dia em que o candidato veio — à parte, um por candidato e dia. */
export type Entrevistas = { total: number; agendadas: number; cadastradas: number; encerradas: number; testes: number; acompanhadas: number }

type Soma = {
  recebidas: number; feitas: number; naoRealizadas: number; esperaLigacaoSeg: number; esperaLigacaoN: number
  visitas: number; deliveries: number; esperaDeliverySeg: number; esperaDeliveryN: number; contatosEmLote: number
  entrevistasAgendadas: number; entrevistasCadastradas: number; entrevistasEncerradas: number; entrevistasTestes: number
  entrevistasAcompanhadas: number; faltasConferidas: number; prestadores: number; marcadores: number
}
const ZERO: Soma = {
  recebidas: 0, feitas: 0, naoRealizadas: 0, esperaLigacaoSeg: 0, esperaLigacaoN: 0, visitas: 0, deliveries: 0, esperaDeliverySeg: 0, esperaDeliveryN: 0, contatosEmLote: 0,
  entrevistasAgendadas: 0, entrevistasCadastradas: 0, entrevistasEncerradas: 0, entrevistasTestes: 0, entrevistasAcompanhadas: 0, faltasConferidas: 0, prestadores: 0, marcadores: 0,
}
const CAMPOS = Object.keys(ZERO) as (keyof Soma)[]

const media = (seg: number, q: number) => (q > 0 ? Math.round(seg / q / 60) : null)

function numeros(s: Soma, contatos: Contatos | null): Numeros {
  return {
    recebidas: s.recebidas, feitas: s.feitas, naoRealizadas: s.naoRealizadas,
    esperaLigacaoMin: media(s.esperaLigacaoSeg, s.esperaLigacaoN),
    visitas: s.visitas, deliveries: s.deliveries,
    esperaDeliveryMin: media(s.esperaDeliverySeg, s.esperaDeliveryN),
    contatosEmLote: s.contatosEmLote, contatos,
    entrevistas: {
      total: s.entrevistasAgendadas + s.entrevistasCadastradas + s.entrevistasEncerradas,
      agendadas: s.entrevistasAgendadas, cadastradas: s.entrevistasCadastradas, encerradas: s.entrevistasEncerradas,
      testes: s.entrevistasTestes, acompanhadas: s.entrevistasAcompanhadas,
    },
    faltasConferidas: s.faltasConferidas, prestadores: s.prestadores, marcadores: s.marcadores,
  }
}

/** As outras tarefas somadas — só para saber se a pessoa fez alguma (nunca para mostrar: são coisas diferentes). */
export const temOutrasTarefas = (x: Numeros) =>
  x.entrevistas.total + x.entrevistas.testes + x.entrevistas.acompanhadas + x.faltasConferidas + x.prestadores + x.marcadores > 0

export const temAtendimento = (x: Numeros) =>
  x.recebidas + x.feitas + x.naoRealizadas + x.visitas + x.deliveries + x.contatosEmLote + (x.contatos?.atualizados ?? 0) > 0
  || temOutrasTarefas(x)

type LinhaContato = { nexusUserId: string; contatosEditados: number | null; contatosNovos: number | null; contatosRemovidos: number | null }

/** Contatos do CIDE por pessoa, no período. Pessoa sem nenhuma linha medida = nulo. */
async function contatosPorPessoa(prisma: PrismaClient, ids: string[], fromDay: string, toDay: string) {
  const mapa = new Map<string, Contatos>()
  if (!ids.length) return mapa
  const linhas: LinhaContato[] = await prisma.cideDaily.findMany({
    where: { nexusUserId: { in: ids }, day: { gte: fromDay, lte: toDay }, contatosEditados: { not: null } },
    select: { nexusUserId: true, contatosEditados: true, contatosNovos: true, contatosRemovidos: true },
  })
  for (const l of linhas) {
    const c = mapa.get(l.nexusUserId) ?? { atualizados: 0, editados: 0, novos: 0, removidos: 0 }
    c.editados += l.contatosEditados ?? 0
    c.novos += l.contatosNovos ?? 0
    c.removidos += l.contatosRemovidos ?? 0
    c.atualizados = c.editados + c.novos + c.removidos
    mapa.set(l.nexusUserId, c)
  }
  return mapa
}

function somaContatos(lista: (Contatos | undefined)[]): Contatos | null {
  const medidos = lista.filter((c): c is Contatos => !!c)
  if (!medidos.length) return null
  const t = { atualizados: 0, editados: 0, novos: 0, removidos: 0 }
  for (const c of medidos) { t.editados += c.editados; t.novos += c.novos; t.removidos += c.removidos }
  t.atualizados = t.editados + t.novos + t.removidos
  return t
}

async function totalDaArea(prisma: PrismaClient, fromDay: string, toDay: string) {
  const linhas = await prisma.recepcaoAreaDaily.groupBy({
    by: ['grupo', 'rotulo'], where: { day: { gte: fromDay, lte: toDay } }, _sum: { n: true },
  })
  const total: Soma = { ...ZERO }
  const grupos: Record<string, { rotulo: string; n: number }[]> = {}
  for (const l of linhas) {
    const v = l._sum.n ?? 0
    if (l.grupo === 'total') {
      if ((CAMPOS as string[]).includes(l.rotulo)) total[l.rotulo as keyof Soma] += v
    } else {
      ;(grupos[l.grupo] ??= []).push({ rotulo: l.rotulo, n: v })
    }
  }
  for (const g of Object.values(grupos)) g.sort((a, b) => b.n - a.n || a.rotulo.localeCompare(b.rotulo))
  return { total, grupos }
}

async function somaPorPessoa(prisma: PrismaClient, fromDay: string, toDay: string, ids?: string[]) {
  const linhas = await prisma.recepcaoDaily.groupBy({
    by: ['nexusUserId'],
    where: { day: { gte: fromDay, lte: toDay }, ...(ids ? { nexusUserId: { in: ids } } : {}) },
    _sum: Object.fromEntries(CAMPOS.map((c) => [c, true])) as Record<keyof Soma, true>,
  })
  return new Map(linhas.map((l) => {
    const s: Soma = { ...ZERO }
    for (const c of CAMPOS) s[c] = l._sum[c] ?? 0
    return [l.nexusUserId, s]
  }))
}

export type PessoaDaRecepcao = Numeros & {
  id: string; nome: string; hasAvatar: boolean
  /** O setor da pessoa quando NÃO é a Recepção (quem cobriu, quem registrou de outro setor). */
  deOutroSetor: string | null
}
export type AtendimentoDoSetor = {
  fromDay: string; toDay: string
  total: Numeros
  pessoas: PessoaDaRecepcao[]
  grupos: Record<string, { rotulo: string; n: number }[]>
  /** Até que dia o espelho do Fluxo tem dado (o sync é de hora em hora). */
  ate: string | null
}

/** O card do setor: total da área, cada pessoa e os recortes por setor. */
export async function atendimentoDoSetor(prisma: PrismaClient, deptId: string, fromDay: string, toDay: string): Promise<AtendimentoDoSetor> {
  const [area, porPessoa, membros, ultimo] = await Promise.all([
    totalDaArea(prisma, fromDay, toDay),
    somaPorPessoa(prisma, fromDay, toDay),
    prisma.user.findMany({ where: { departmentId: deptId, active: true, nexusUserId: { not: null } }, select: { nexusUserId: true } }),
    prisma.recepcaoAreaDaily.aggregate({ _max: { day: true } }),
  ])
  /* Quem entra: quem fez algo na Recepção no período + quem é do setor (contatos do CIDE).
     ⚠️ Contato mexido por gente de OUTRO setor que não atendeu na Recepção não conta aqui. */
  const ids = [...new Set([...porPessoa.keys(), ...membros.map((u) => u.nexusUserId!)])]
  const [users, contatos] = await Promise.all([
    prisma.user.findMany({
      where: { nexusUserId: { in: ids } },
      select: { id: true, nexusUserId: true, name: true, avatarUrl: true, department: { select: { id: true, name: true } } },
    }),
    contatosPorPessoa(prisma, ids, fromDay, toDay),
  ])
  const pessoas: PessoaDaRecepcao[] = []
  for (const u of users) {
    if (isHiddenDept(u.department?.name)) continue
    const x = numeros(porPessoa.get(u.nexusUserId!) ?? { ...ZERO }, contatos.get(u.nexusUserId!) ?? null)
    if (!temAtendimento(x)) continue
    pessoas.push({
      ...x, id: u.id, nome: u.name, hasAvatar: !!u.avatarUrl,
      deOutroSetor: u.department?.id === deptId ? null : (u.department?.name ?? 'outro setor'),
    })
  }
  const peso = (p: Numeros) => p.recebidas + p.feitas + p.naoRealizadas + p.visitas + p.deliveries + p.contatosEmLote
  pessoas.sort((a, b) => peso(b) - peso(a) || (b.contatos?.atualizados ?? 0) - (a.contatos?.atualizados ?? 0) || a.nome.localeCompare(b.nome))
  return {
    fromDay, toDay,
    total: numeros(area.total, somaContatos(pessoas.map((p) => p.contatos ?? undefined))),
    pessoas, grupos: area.grupos, ate: ultimo._max.day ?? null,
  }
}

export type AtendimentoDaPessoa = { meu: Numeros; setor: Numeros }

/** O card da ficha: o que a pessoa fez e o total da área no mesmo período (para "N% do setor").
 *  Nulo quando não há nada — e quem não é da Recepção nem atendeu nela não ganha o card. */
export async function atendimentoDaPessoa(
  prisma: PrismaClient, nexusUserId: string | null, ehDaRecepcao: boolean, fromDay: string, toDay: string,
): Promise<AtendimentoDaPessoa | null> {
  if (!nexusUserId) return null
  const porPessoa = await somaPorPessoa(prisma, fromDay, toDay, [nexusUserId])
  const soma = porPessoa.get(nexusUserId)
  if (!soma && !ehDaRecepcao) return null
  const contatos = await contatosPorPessoa(prisma, [nexusUserId], fromDay, toDay)
  const meu = numeros(soma ?? { ...ZERO }, contatos.get(nexusUserId) ?? null)
  if (!temAtendimento(meu)) return null
  /* O "do setor" da ficha é o MESMO total do card do setor — duas contas dariam 56% aqui e
     outra fatia lá. */
  const dept = (await prisma.department.findMany({ select: { id: true, name: true } })).find((d) => ehRecepcao(d.name))
  const setor = dept
    ? (await atendimentoDoSetor(prisma, dept.id, fromDay, toDay)).total
    : numeros((await totalDaArea(prisma, fromDay, toDay)).total, meu.contatos)
  return { meu, setor }
}
