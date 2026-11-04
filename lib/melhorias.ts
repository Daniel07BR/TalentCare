import type { PrismaClient } from '@prisma/client'

/* ============================================================
   CHAMADOS ATENDIDOS (04/11/2026).

   Pedido do Daniel: o resumo do "Quem atendeu" do Quadro das Melhorias do Nexus no relatório do
   pessoal da T.I e da Programação. O espelho é `melhorias_daily` (`run-melhorias-sync.mjs`).

   Só quem é de um desses setores ganha o card, e só com número: quem não atendeu nada no período
   não vê um card zerado. ⚠️ Fora da régua de pontuação de propósito.
   ============================================================ */

export type Melhorias = { erros: number; melhorias: number; criacoes: number }

const SETORES = ['ti', 't.i', 'programacao']
const ehDoSetor = (nome: string | null | undefined) =>
  SETORES.includes((nome ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim())

export async function melhoriasDaPessoa(
  prisma: PrismaClient, nexusUserId: string | null, setor: string | null | undefined, fromDay: string, toDay: string,
): Promise<Melhorias | null> {
  if (!nexusUserId || !ehDoSetor(setor)) return null
  const { _sum: s } = await prisma.melhoriasDaily.aggregate({
    where: { nexusUserId, day: { gte: fromDay, lte: toDay } },
    _sum: { erros: true, melhorias: true, criacoes: true },
  })
  const c = { erros: s.erros ?? 0, melhorias: s.melhorias ?? 0, criacoes: s.criacoes ?? 0 }
  return c.erros + c.melhorias + c.criacoes > 0 ? c : null
}
