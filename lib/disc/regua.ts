import 'server-only'
import { prisma } from '@/lib/db/prisma'
import type { Quem } from '@/lib/avaliacoes/regua'

/* ============================================================
   QUEM VÊ O DISC de quem — a régua, num lugar só.

   Decisão do dono (22/09/2026): "a visualização deve ser liberada apenas para
   Gestor, Diretoria e T.I". Colega não vê; o colaborador comum não vê nem o
   próprio (ele nem entra no sistema). A chefia vê e lança o dela.

   ⚠️⚠️ É MAIS FECHADA que a da ficha (`podeVer` de `lib/avaliacoes/regua.ts`),
   de propósito:
   1. O PRÓPRIO DISC só para quem tem chefia (GESTOR) — ver abaixo.
   2. A ficha abre o setor inteiro para quem tem vínculo nele; o DISC segue a
      HIERARQUIA do vínculo, a mesma da avaliação: o perfil do GESTOR do setor
      é da Diretoria, o do SUB-ENCARREGADO é do gestor. Sem isso, o sub leria
      "como cobrar" o próprio chefe.

   ⚠️ Registrar segue a mesma régua: quem lê o perfil de alguém é quem conduz
   essa pessoa, e é ele quem aplica o teste com ela.

   ⚠️ ADMIN = Diretoria + T.I (pelo SETOR, nunca por cargo; ver `lib/nexus.ts`).
   ============================================================ */

/** userId → 'gestor' | 'sub', dos vínculos de UM setor. */
export async function niveisDoSetor(departmentId: string | null): Promise<Map<string, string>> {
  if (!departmentId) return new Map()
  const v = await prisma.setorAvaliador.findMany({ where: { departmentId }, select: { userId: true, nivel: true } })
  return new Map(v.map((x) => [x.userId, x.nivel]))
}

export function podeVerDisc(
  quem: Quem,
  alvo: { id: string; departmentId: string | null },
  niveis: Map<string, string>,
): boolean {
  if (quem.role === 'ADMIN') return true
  /* ⚠️⚠️ O PRÓPRIO DISC: liberado desde 22/09/2026, tarde (pedido do dono: "os
     gestores devem conseguir incluir o próprio resultado do DISC, todos do
     sistema devem estar com essa opção" — o José Roberto lançou o da equipe e,
     na página dele, não havia como lançar o seu). A primeira versão fechava o
     próprio para todos.
     ⚠️ Só para quem ENTRA no sistema com chefia (GESTOR). O COLABORADOR fica de
     fora duas vezes: a porta (`proxy.ts`) não o deixa chegar a `/api/disc`, e
     esta linha também não — no dia em que o acesso abrir, a régua não muda
     sozinha. */
  if (alvo.id === quem.id) return quem.role === 'GESTOR'
  if (quem.escopo.tipo !== 'setor') return false
  if (!alvo.departmentId || !quem.escopo.avaliaDepartmentIds.includes(alvo.departmentId)) return false
  const nivelDoAlvo = niveis.get(alvo.id)
  if (nivelDoAlvo === 'gestor') return false // o topo do setor é da Diretoria
  if (nivelDoAlvo === 'sub') return niveis.get(quem.id) === 'gestor'
  return true
}

export const podeRegistrarDisc = podeVerDisc
