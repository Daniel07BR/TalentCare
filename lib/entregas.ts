/* ============================================================
   O SETOR ENTREGAS, num lugar só.

   ⚠️⚠️ O id mora AQUI e em nenhum outro lugar. A lição é da casa: o
   `PONTO_DEPT_IDS` da Gerência morava em dois arquivos e as duas listas
   divergiram — quem via o menu abria a tela vazia. Um id de setor cravado em
   duas telas é a mesma armadilha com outro nome.

   ⚠️ Por que um id fixo e não uma busca por nome: "Entregas" é um rótulo que o
   Nexus pode reescrever (já aconteceu com "T.I" × "Aux. de T.I"), e uma tela
   que se resolve por texto passa a apontar para outro setor sem erro nenhum.
   O id é imutável.

   ⚠️ Sem `server-only`, de propósito: o botão que leva à área mora no
   relatório de setor, que é componente de cliente. Um id de setor não é
   segredo, e uma segunda cópia "só para o cliente" seria a divergência que
   este arquivo existe para evitar.
   ============================================================ */

/** Setor Entregas no TalentCare. Duas pessoas ativas em 09/09/2026. */
export const ENTREGAS_DEPT_ID = 'cmqtlb519000cnwf9nvc1uzoe'
