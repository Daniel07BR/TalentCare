/** O setor que ganha o card "Atendimento da Recepção" (16/10/2026). Pelo NOME, como
 *  `isHiddenDept`: o id muda se o setor for recriado. Arquivo à parte para a tela poder
 *  importar sem levar a conta do servidor (`lib/recepcao.ts`). */
export const ehRecepcao = (nome: string | null | undefined) =>
  (nome ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim() === 'recepcao'
