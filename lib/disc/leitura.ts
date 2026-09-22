import 'server-only'
import { prisma } from '@/lib/db/prisma'
import type { Notas } from './calculo'

/* O resultado VIGENTE de cada pessoa — a aplicação mais recente de cada uma.
   Uma consulta só para o setor inteiro (ou a casa), sem N+1. */
export async function vigentes(userIds: string[]): Promise<Map<string, Notas & { aplicadoEm: string }>> {
  if (!userIds.length) return new Map()
  const linhas = await prisma.discResultado.findMany({
    where: { userId: { in: userIds } },
    orderBy: [{ aplicadoEm: 'desc' }, { criadoEm: 'desc' }],
    select: { userId: true, d: true, i: true, s: true, c: true, aplicadoEm: true },
  })
  const m = new Map<string, Notas & { aplicadoEm: string }>()
  for (const l of linhas) {
    if (!m.has(l.userId)) m.set(l.userId, { D: l.d, I: l.i, S: l.s, C: l.c, aplicadoEm: l.aplicadoEm })
  }
  return m
}

/** Quem conta como "gente do setor" hoje — o mesmo recorte do relatório do setor. */
export const filtroEquipe = { origin: { in: ['nexus', 'staff'] }, foraDoDiretorio: false, active: true }
