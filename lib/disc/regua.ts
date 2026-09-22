import 'server-only'
import type { Quem } from '@/lib/avaliacoes/regua'

/* ============================================================
   QUEM VÊ O DISC de quem — a régua, num lugar só.

   Decisão do dono (22/09/2026): "a visualização deve ser liberada apenas para
   Gestor, Diretoria e T.I". Colega não vê; o colaborador comum não vê nem o
   próprio (ele nem entra no sistema). A chefia vê e lança o dela.

   ⚠️⚠️ É MAIS FECHADA que a da ficha (`podeVer` de `lib/avaliacoes/regua.ts`),
   de propósito:
   1. O PRÓPRIO DISC só para quem tem chefia (GESTOR) — ver abaixo.
   2. Quem tem VÍNCULO de chefia num setor (gestor OU sub-encarregado) vê e
      lança o DISC de TODOS daquele setor — inclusive o do gestor.
      ⚠️⚠️ A primeira versão seguia a hierarquia da avaliação (o DISC do gestor
      só para a Diretoria), e a Joice, sub do Legal, não conseguiu lançar o do
      Evandro (22/09/2026). O dono: "eles, assim como gestores, deveriam ter a
      liberação". O DISC não é nota sobre a carreira de ninguém; é o manual de
      convivência da equipe, e a chefia inteira aplica o teste junto.

   ⚠️ Registrar segue a mesma régua: quem lê o perfil de alguém é quem conduz
   essa pessoa, e é ele quem aplica o teste com ela.

   ⚠️ ADMIN = Diretoria + T.I (pelo SETOR, nunca por cargo; ver `lib/nexus.ts`).
   ============================================================ */

export function podeVerDisc(quem: Quem, alvo: { id: string; departmentId: string | null }): boolean {
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
  return !!alvo.departmentId && quem.escopo.avaliaDepartmentIds.includes(alvo.departmentId)
}

export const podeRegistrarDisc = podeVerDisc
