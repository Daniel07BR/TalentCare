/* ============================================================
   A CHAVE DA NOTA (04/11/2026).

   Pedido do Daniel: "vamos desativar até segunda ordem a nota de todo sistema TalentCare e computar apenas
   tarefas. Não apresente mais pontuação e nota no sistema; se um dia voltarmos a usar, eu peço para ativar".

   `false` esconde pontos, ranking, score e régua nas telas e no PDF. Nada é apagado: as tabelas, a régua e os meses
   gravados continuam no banco. Para religar, troque para `true` e publique.
   ⚠️ A avaliação mensal do gestor (`/avaliacoes`) e a nota que o CLIENTE dá no WhatsApp não passam por esta chave.
   ============================================================ */
export const NOTA_LIGADA = false
