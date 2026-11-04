import type { PrismaClient } from '@prisma/client'

/* ============================================================
   ATIVIDADES NO IMOTEC (04/11/2026).

   Pedido do Daniel: os indicadores do pessoal da Imóveis, com tudo o que fazem dentro do Imotec. O espelho é
   `imotec_daily` (`run-imotec-sync.mjs`), e a régua de contar mora no Imotec (`lib/atividades-da-equipe.ts` de lá).

   ⚠️ O Imotec só registra quem fez desde `INICIO_DO_REGISTRO`: antes disso é "não medido", nunca zero.
   ⚠️ Cada ação tem a sua unidade (a geração do mês cria 168 aluguéis num clique): não some uma com a outra.
   ⚠️ Fora da régua de pontuação de propósito. Só quem é da Imóveis ganha o card, e só com o que não está zerado.
   ============================================================ */

export const INICIO_DO_REGISTRO = '2026-10-16'

export type Atividades = Record<string, number>
export type PessoaDoImotec = { id: string; nome: string; atividades: Atividades }
export type ImotecDoSetor = { total: Atividades; pessoas: PessoaDoImotec[] }

export const ehImoveis = (nome: string | null | undefined) =>
  (nome ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim() === 'imoveis'

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
