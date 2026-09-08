/* ============================================================
   O CATÁLOGO DE ATIVIDADES — o que cada ação dos sistemas do Nexus VALE.

   Pedido do dono (08/09/2026): a pontuação do mês passa a somar TRÊS metades —
   a disciplina, os serviços da planilha, e as atividades dos sistemas do Nexus.
   As duas primeiras já tinham régua; esta é a terceira.

   ⚠️⚠️ HOJE CADA ATIVIDADE VALE 1, IGUAL PARA TODAS. É o número "Atividade no
   período" que a lista do setor mostra (a Joice com 781): a soma crua de tudo,
   em que um chamado resolvido no HelpDesk pesa igual a um curso assistido. Esta
   régua existe para que isso deixe de ser um acidente e passe a ser uma
   escolha — cada tipo com o valor que o gestor do setor decidir.

   ⚠️⚠️ A LISTA ESPELHA `activityOf()` (lib/mock/data.ts) MENOS OS SERVIÇOS. O
   `activityOf` soma também `e.servicosConcluidos`; aqui NÃO — o serviço da
   planilha tem catálogo próprio (pontos por tipo, pesados por tempo), e
   contá-lo de novo como atividade seria pagar o mesmo serviço duas vezes na
   nota. Consequência a saber: a "Atividade no período" da lista do setor (que
   usa `activityOf`, com serviço) é MAIOR que a soma desta régua (sem serviço).
   As duas medem coisas de propósito diferentes — a lista, "o quanto a pessoa
   se mexeu"; a régua, "o quanto isso vale, fora o serviço que já é pago à
   parte". Fora os serviços, os campos batem um a um com `activityOf`.

   ⚠️⚠️ O QUE NÃO ENTRA continua não entrando, e pelos mesmos motivos gravados
   no `docs/FONTES.md`: mensagem de chat e escuta de rádio são VITRINE (a
   métrica mais fácil de subir, a que menos diz sobre entrega); km e jornada da
   Gerência são a MAGNITUDE dos mesmos serviços e abafariam o resto. Deixá-los
   fora da régua é a decisão da casa, não um esquecimento — por isso não estão
   aqui nem como linha de valor 0.
   ============================================================ */

import type { Prisma } from '@prisma/client'

/** De qual tabela-espelho o valor sai, e qual coluna somar. */
export type FonteAtividade =
  | { modelo: 'classroomDaily'; campos: (keyof Prisma.ClassroomDailySumAggregateOutputType)[] }
  | { modelo: 'helpdeskDaily'; campos: (keyof Prisma.HelpdeskDailySumAggregateOutputType)[] }
  | { modelo: 'cideDaily'; campos: (keyof Prisma.CideDailySumAggregateOutputType)[] }
  | { modelo: 'consultoriaDaily'; campos: (keyof Prisma.ConsultoriaDailySumAggregateOutputType)[] }
  | { modelo: 'gerenciaDaily'; campos: (keyof Prisma.GerenciaDailySumAggregateOutputType)[] }
  | { modelo: 'chatDaily'; campos: (keyof Prisma.ChatDailySumAggregateOutputType)[] }
  | { modelo: 'whatsappAttendantDaily'; campos: string[] } // casa por NOME, não por nexusUserId

export type TipoAtividade = {
  /** Chave estável — vai para o banco na régua. */
  chave: string
  /** O rótulo que o gestor lê. */
  label: string
  /** A fonte (sistema) a que pertence — agrupa a tela. */
  sistema: string
  /** O que ela conta, em português. */
  descricao: string
  fonte: FonteAtividade
}

/**
 * ⚠️ A ORDEM E OS CAMPOS batem com `activityOf()`. Se mexer num, mexa no outro
 * — senão o score (que soma isto) e a "atividade" da lista (que soma aquele)
 * passam a divergir em silêncio, e ninguém sabe qual acreditar.
 */
/* ⚠️ HELPDESK: só `resolved`, NÃO `resolved+formalized`. `activityOf()` e
   `/api/score-metrics` (o número "Atividade" que a lista do setor mostra) somam
   `opened + resolved`. Incluir `formalized` aqui faria o volume da régua ser
   MAIOR que o número que o gestor vê e pondera — ele multiplicaria o peso por
   uma coisa e leria outra. É a divergência que o crítico pegou em 08/09/2026. */
export const TIPOS_ATIVIDADE: TipoAtividade[] = [
  // ── ClassRoom ──
  { chave: 'cls_curso', label: 'Curso concluído', sistema: 'ClassRoom', descricao: 'cada curso que a pessoa concluiu', fonte: { modelo: 'classroomDaily', campos: ['courses'] } },
  { chave: 'cls_video', label: 'Vídeo assistido', sistema: 'ClassRoom', descricao: 'cada vídeo-aula assistido', fonte: { modelo: 'classroomDaily', campos: ['videos'] } },
  { chave: 'cls_criado', label: 'Curso criado', sistema: 'ClassRoom', descricao: 'cada curso que a pessoa criou (instrutor)', fonte: { modelo: 'classroomDaily', campos: ['created'] } },
  // ── HelpDesk ──
  { chave: 'hd_aberto', label: 'Chamado aberto', sistema: 'HelpDesk', descricao: 'cada chamado que a pessoa abriu', fonte: { modelo: 'helpdeskDaily', campos: ['opened'] } },
  { chave: 'hd_resolvido', label: 'Chamado resolvido', sistema: 'HelpDesk', descricao: 'cada chamado resolvido', fonte: { modelo: 'helpdeskDaily', campos: ['resolved'] } },
  // ── CIDE ──
  /* ⚠️⚠️ CONTA EMPRESAS TOCADAS, NÃO LINHAS DA TRILHA (08/09/2026).
     `cide_daily.atividades` é a trilha de auditoria do CIDE: salvar o cadastro
     de UMA empresa grava uma linha por campo mexido. Medido em agosto/2026,
     1.920 das 1.961 linhas com responsável humano (98%) são `origem =
     'SISTEMA'`, e a inflação NÃO é uniforme — 700 linhas em 73 empresas-dia
     (9,6×) contra 330 em 112 (2,9×). Pontuar por linha, a 15 min cada, dizia
     que uma pessoa trabalhou 43 HORAS num dia, e punha no topo do setor quem a
     trilha mais infla.
     ⚠️ A MÉDIA EM MINUTOS PRECISA SER REDECIDIDA pelo gestor: 15 min era o
     tempo de uma linha da trilha; agora a unidade é a empresa atendida. */
  { chave: 'cide_alteracao', label: 'Empresa atendida', sistema: 'CIDE', descricao: 'cada empresa cujo cadastro a pessoa mexeu no dia', fonte: { modelo: 'cideDaily', campos: ['empresas'] } },
  // ── Consultoria Plus ──
  { chave: 'cons_estudo', label: 'Estudo', sistema: 'Consultoria', descricao: 'cada estudo/parecer', fonte: { modelo: 'consultoriaDaily', campos: ['studies'] } },
  { chave: 'cons_ticket', label: 'Ticket', sistema: 'Consultoria', descricao: 'cada ticket atendido', fonte: { modelo: 'consultoriaDaily', campos: ['tickets'] } },
  { chave: 'cons_msg', label: 'Mensagem', sistema: 'Consultoria', descricao: 'cada mensagem de acompanhamento', fonte: { modelo: 'consultoriaDaily', campos: ['messages'] } },
  { chave: 'cons_comentario', label: 'Comentário', sistema: 'Consultoria', descricao: 'cada comentário', fonte: { modelo: 'consultoriaDaily', campos: ['comments'] } },
  // ── WhatsApp (Painel de Atendimento) ── casa por NOME
  { chave: 'wpp_finalizado', label: 'Atendimento finalizado', sistema: 'WhatsApp', descricao: 'cada atendimento que a pessoa finalizou', fonte: { modelo: 'whatsappAttendantDaily', campos: ['finalizados'] } },
  // ── Gerência (app motoboy) ──
  { chave: 'ger_servico', label: 'Serviço entregue', sistema: 'Gerência', descricao: 'cada serviço concluído na rua', fonte: { modelo: 'gerenciaDaily', campos: ['servicos'] } },
  { chave: 'ger_prot_aberto', label: 'Protocolo aberto', sistema: 'Gerência', descricao: 'cada protocolo que a pessoa abriu', fonte: { modelo: 'gerenciaDaily', campos: ['protAbertos'] } },
  { chave: 'ger_prot_aprovado', label: 'Protocolo aprovado', sistema: 'Gerência', descricao: 'cada protocolo aprovado', fonte: { modelo: 'gerenciaDaily', campos: ['protAprovados'] } },
  { chave: 'ger_serv_criado', label: 'Serviço criado', sistema: 'Gerência', descricao: 'cada serviço que a pessoa criou', fonte: { modelo: 'gerenciaDaily', campos: ['servCriados'] } },
  { chave: 'ger_data_alterada', label: 'Data alterada', sistema: 'Gerência', descricao: 'cada alteração de data de protocolo', fonte: { modelo: 'gerenciaDaily', campos: ['datasAlteradas'] } },
  // ── Chat Interno ── só CHAMADO (mensagem é vitrine, fica fora)
  { chave: 'chat_cham_aberto', label: 'Chamado aberto (Chat)', sistema: 'Chat Interno', descricao: 'cada chamado interno que a pessoa abriu', fonte: { modelo: 'chatDaily', campos: ['chamadosAbertos'] } },
  { chave: 'chat_cham_concluido', label: 'Chamado concluído (Chat)', sistema: 'Chat Interno', descricao: 'cada chamado interno que a pessoa concluiu', fonte: { modelo: 'chatDaily', campos: ['chamadosConcluidos'] } },
]

export const TIPO_ATIVIDADE_POR_CHAVE = new Map(TIPOS_ATIVIDADE.map((t) => [t.chave, t]))

/** O valor padrão de uma atividade sem régua definida: 1 — o que ela já vale
 *  hoje na contagem crua. ⚠️ É provisório, e a tela diz isso, pela mesma razão
 *  do fator de serviço: um padrão exibido como decisão é uma decisão que
 *  ninguém tomou. */
export const VALOR_ATIVIDADE_PADRAO = 1
