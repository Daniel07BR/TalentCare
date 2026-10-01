/* ============================================================
   BAIXA EM LOTE no Acessórias — a regra, num lugar só (01/10/2026).

   Decisão do dono: o lote CONTA no volume, mas a tela AVISA. O caso que a criou:
   a Luana Silva deu 94 baixas em 01/09/2026, todas "Ent. atrasada" — faxina de
   prazo velho, que no número solto lia "94 entregas" e a punha em 1º lugar.

   ⚠️ O critério é MEU, não regra da casa, e o dono pode mudar os dois números:
   um dia é LOTE quando a mesma pessoa deu ao menos `MINIMO` baixas nele E ao
   menos `FRACAO_ATRASADA` delas o Acessórias marcou como entregues com atraso.

   ⚠️⚠️ "Atrasada" é a marcação do ACESSÓRIAS (`status` ~ "atrasad"), a mesma que
   o coletor grava em `acessorias_daily.entregas_atrasadas`. Não recalcular pela
   data aqui: seria uma segunda régua para o mesmo número.
   ============================================================ */

export const LOTE_MINIMO = 20
export const LOTE_FRACAO_ATRASADA = 0.8

export const ehLote = (entregas: number, atrasadas: number) =>
  entregas >= LOTE_MINIMO && atrasadas >= entregas * LOTE_FRACAO_ATRASADA

export type Lote = { dia: string; entregas: number }

export const textoDoLote = (lotes: Lote[]) =>
  lotes.length === 1
    ? `inclui baixa em lote: ${lotes[0].entregas} em ${lotes[0].dia.split('-').reverse().slice(0, 2).join('/')}`
    : `inclui ${lotes.length} baixas em lote (${lotes.reduce((a, l) => a + l.entregas, 0)} entregas)`
