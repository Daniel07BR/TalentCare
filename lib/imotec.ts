import type { PrismaClient } from '@prisma/client'

/* ============================================================
   ATIVIDADES NO IMOTEC (04/11/2026).

   Pedido do Daniel: os indicadores do pessoal da Imóveis, com tudo o que fazem dentro do Imotec. O espelho é
   `imotec_daily` (`run-imotec-sync.mjs`), e a régua de contar mora no Imotec (`lib/atividades-da-equipe.ts` de lá).

   ⚠️ O Imotec só registra quem fez desde `INICIO_DO_REGISTRO`: antes disso é "não medido", nunca zero.
   ⚠️ Cada ação tem a sua unidade (a geração do mês cria 168 aluguéis num clique): não some uma com a outra.
   ⚠️ Só quem é da Imóveis ganha o card, e só com o que não está zerado.

   ENTRA NA NOTA (decisão do Daniel, 04/11/2026), só da Imóveis, pelo catálogo de `lib/servicos/atividades.ts`.
   ⚠️ A geração do mês e as vistorias valem UMA POR DIA: 167 aluguéis saem de um clique, e uma vistoria grava uma linha
   por item. É o mesmo cuidado do CIDE, que conta empresa e não linha da trilha.
   ⚠️ Anotação e correção de pagamento aparecem no card e não pontuam: a primeira é a mais fácil de subir, a segunda
   premiaria o erro. Índices e tabelas também não: são manutenção do sistema.
   ============================================================ */

export const INICIO_DO_REGISTRO = '2026-10-16'

export type Atividades = Record<string, number>
export type PessoaDoImotec = { id: string; nome: string; atividades: Atividades }
export type ImotecDoSetor = { total: Atividades; pessoas: PessoaDoImotec[] }

export const ehImoveis = (nome: string | null | undefined) =>
  (nome ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim() === 'imoveis'

const ACOES_DA_NOTA = [
  'pagamentos', 'alugueisGerados', 'lancamentos', 'cobrancas', 'alugueisAlterados', 'contratosNovos', 'contratosAlterados', 'reajustes',
  'imoveisNovos', 'imoveisAlterados', 'pessoasNovas', 'pessoasAlteradas', 'iptu', 'vistorias', 'leads',
]
const UMA_POR_DIA = new Set(['alugueisGerados', 'vistorias'])

/** O que pontua, por `nexusUserId` e ação, de quem é da Imóveis. `de`/`ate` vazios = a vida inteira. */
export async function atividadesDaNota(prisma: PrismaClient, nexusIds?: string[], de?: string, ate?: string): Promise<Map<string, Atividades>> {
  const linhas = await prisma.imotecDaily.findMany({
    where: {
      acao: { in: ACOES_DA_NOTA },
      ...(nexusIds ? { nexusUserId: { in: nexusIds } } : {}),
      ...(de && ate ? { day: { gte: de, lte: ate } } : {}),
    },
    select: { nexusUserId: true, acao: true, n: true },
  })
  const contas = await prisma.user.findMany({
    where: { nexusUserId: { in: [...new Set(linhas.map((l) => l.nexusUserId))] } },
    select: { nexusUserId: true, department: { select: { name: true } } },
  })
  const daImoveis = new Set(contas.filter((u) => ehImoveis(u.department?.name)).map((u) => u.nexusUserId))
  const saida = new Map<string, Atividades>()
  for (const l of linhas) {
    if (!daImoveis.has(l.nexusUserId)) continue
    const a = saida.get(l.nexusUserId) ?? {}
    a[l.acao] = (a[l.acao] ?? 0) + (UMA_POR_DIA.has(l.acao) ? 1 : l.n)
    saida.set(l.nexusUserId, a)
  }
  return saida
}

export const somaDaNota = (a: Atividades | undefined) => Object.values(a ?? {}).reduce((s, v) => s + v, 0)

export async function imotecDaPessoa(
  prisma: PrismaClient, nexusUserId: string | null, setor: string | null | undefined, fromDay: string, toDay: string,
): Promise<Atividades | null> {
  if (!nexusUserId || !ehImoveis(setor)) return null
  const linhas = await prisma.imotecDaily.groupBy({
    by: ['acao'], where: { nexusUserId, day: { gte: fromDay, lte: toDay } }, _sum: { n: true },
  })
  return linhas.length ? Object.fromEntries(linhas.map((l) => [l.acao, l._sum.n ?? 0])) : null
}

/** O card do setor: cada pessoa da Imóveis com atividade no período, e a soma delas. */
export async function imotecDoSetor(prisma: PrismaClient, deptId: string, fromDay: string, toDay: string): Promise<ImotecDoSetor | null> {
  const membros = await prisma.user.findMany({
    where: { departmentId: deptId, nexusUserId: { not: null } },
    select: { id: true, name: true, nexusUserId: true },
  })
  const linhas = await prisma.imotecDaily.groupBy({
    by: ['nexusUserId', 'acao'],
    where: { nexusUserId: { in: membros.map((u) => u.nexusUserId!) }, day: { gte: fromDay, lte: toDay } },
    _sum: { n: true },
  })
  if (!linhas.length) return null
  const total: Atividades = {}
  const pessoas = membros.map((u) => ({ id: u.id, nome: u.name, atividades: {} as Atividades }))
  const porConta = new Map(membros.map((u, i) => [u.nexusUserId!, pessoas[i]]))
  for (const l of linhas) {
    const v = l._sum.n ?? 0
    total[l.acao] = (total[l.acao] ?? 0) + v
    porConta.get(l.nexusUserId)!.atividades[l.acao] = v
  }
  return { total, pessoas: pessoas.filter((p) => Object.keys(p.atividades).length > 0).sort((a, b) => a.nome.localeCompare(b.nome)) }
}
