/* ============================================================
   OS SISTEMAS DA RÉGUA DE ATIVIDADES — o título de cada grupo na tela.

   Pedido do dono (11/09/2026): "divida a lista pelos sistemas, colocando um
   título e as tarefas abaixo". O `sistema` casa com `TIPOS_ATIVIDADE.sistema`
   (`atividades.ts`); a ordem aqui é a ordem na tela. Pura, sem banco — a tela
   (cliente) importa.
   ============================================================ */

/** `cor`: a faixa do título e a borda das tarefas do sistema (pedido do dono, 11/09/2026:
 *  "títulos centralizados e de uma cor para a linha, para ficar claro que dali para baixo é
 *  sobre aquele sistema"). */
export type SistemaAtividade = { sistema: string; titulo: string; oque: string; cor: string }

export const SISTEMAS_ATIVIDADE: SistemaAtividade[] = [
  { sistema: 'WhatsApp', titulo: 'WhatsApp', oque: 'Atendimento a clientes pelo WhatsApp da empresa (OneCode).', cor: '#25D366' },
  { sistema: 'HelpDesk', titulo: 'HelpDesk', oque: 'Chamados de suporte ao T.I: quem pede ajuda e quem resolve.', cor: '#2196c4' },
  { sistema: 'Chat Interno', titulo: 'Chat Interno', oque: 'Pedidos entre setores feitos pelo Chat Interno: quem pede e quem atende.', cor: '#7c5cf0' },
  { sistema: 'ClassRoom', titulo: 'ClassRoom', oque: 'Treinamentos da casa: cursos e vídeo-aulas feitos, e cursos criados.', cor: '#159b87' },
  { sistema: 'Consultoria', titulo: 'Consultoria Plus', oque: 'Dúvidas levadas à Consultoria, a conversa nos tickets e os estudos publicados.', cor: '#2f6fd6' },
  { sistema: 'CIDE', titulo: 'CIDE', oque: 'Cadastro das empresas clientes (documentos, sócios, acessos, eSocial).', cor: '#e0556b' },
  { sistema: 'Gerência', titulo: 'Gerência · mensageria', oque: 'Protocolos para a mensageria e os serviços de rua dos mensageiros.', cor: '#e0941a' },
]
