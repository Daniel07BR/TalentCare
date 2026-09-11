/* ============================================================
   O RECORTE DO DATASET — quem o leitor alcança (pura, sem banco).

   ⚠️⚠️ Mora aqui, e não em `lib/data/source.ts`, porque DOIS lados fazem a
   mesma pergunta: o servidor, que tira do payload a disciplina de quem o leitor
   não alcança, e a BUSCA DO TOPO, no navegador, que não pode oferecer o que o
   leitor não consegue abrir (11/09/2026, a busca chegou ao gestor). O dataset
   do gestor traz a CASA INTEIRA (o recorte só zera ponto e disciplina de quem
   está fora — ⚠️ ver o aviso no `CHANGELOG` (25)), e uma busca que o varresse
   levaria a ficha de gente de outro setor até a porta, para a rota responder
   403. Duas cópias desta conta discordariam no dia em que uma mudasse.

   A régua é a de `lib/avaliacoes/regua.ts` (`podeVer`) e `lib/alcance.ts`: os
   setores que a pessoa AVALIA (vínculo gravado, nunca o setor em que ela
   senta) e ela mesma.
   ============================================================ */

export type Alcance =
  | { tipo: 'tudo' }
  | {
      tipo: 'recorte'; departmentIds: string[]; meuId: string
      /** O setor em que a pessoa SENTA. Não dá acesso ao dado de ninguém; só abre o
       *  relatório do setor, como a `/api/dept-metrics` já abre. */
      meuSetorId?: string | null
    }

/** A pessoa `id`, do setor `deptId`, está no alcance de quem lê? */
export function alcancaPessoa(alcance: Alcance, deptId: string | null, id: string): boolean {
  if (alcance.tipo === 'tudo') return true
  return id === alcance.meuId || (!!deptId && alcance.departmentIds.includes(deptId))
}

/** O relatório do setor `deptId` se abre para quem lê?
 *
 *  ⚠️ A régua da rota é `/api/dept-metrics` (`podeVerSetor`): os setores que a
 *  pessoa avalia OU o setor em que ela senta (achado do crítico, 11/09/2026 — sem
 *  o segundo, um gestor sem vínculo teria o chip do setor dele na barra e a
 *  busca o esconderia). Mexeu lá, mexa aqui. */
export function alcancaSetor(alcance: Alcance, deptId: string): boolean {
  return alcance.tipo === 'tudo' || alcance.departmentIds.includes(deptId) || deptId === alcance.meuSetorId
}
