/* ============================================================
   OS SISTEMAS DA RÉGUA DE ATIVIDADES — o título de cada grupo na tela.

   Pedido do dono (11/09/2026): "divida a lista pelos sistemas, colocando um
   título e as tarefas abaixo". O `sistema` casa com `TIPOS_ATIVIDADE.sistema`
   (`atividades.ts`); a ordem aqui é a ordem na tela. Pura, sem banco — a tela
   (cliente) importa.
   ============================================================ */

export type SistemaAtividade = { sistema: string; titulo: string; oque: string }

export const SISTEMAS_ATIVIDADE: SistemaAtividade[] = [
  { sistema: 'WhatsApp', titulo: 'WhatsApp', oque: 'Atendimento a clientes pelo WhatsApp da empresa (OneCode).' },
  { sistema: 'HelpDesk', titulo: 'HelpDesk', oque: 'Chamados de suporte ao T.I: quem pede ajuda e quem resolve.' },
  { sistema: 'Chat Interno', titulo: 'Chat Interno', oque: 'Pedidos entre setores feitos pelo Chat Interno: quem pede e quem atende.' },
  { sistema: 'ClassRoom', titulo: 'ClassRoom', oque: 'Treinamentos da casa: cursos e vídeo-aulas feitos, e cursos criados.' },
  { sistema: 'Consultoria', titulo: 'Consultoria Plus', oque: 'Dúvidas levadas à Consultoria, a conversa nos tickets e os estudos publicados.' },
  { sistema: 'CIDE', titulo: 'CIDE', oque: 'Cadastro das empresas clientes (documentos, sócios, acessos, eSocial).' },
  { sistema: 'Gerência', titulo: 'Gerência · mensageria', oque: 'Protocolos para a mensageria e os serviços de rua dos mensageiros.' },
]
