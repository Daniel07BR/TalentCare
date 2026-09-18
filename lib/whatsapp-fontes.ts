/* ============================================================
   AS DUAS INSTÂNCIAS DO WHATSAPP — num arquivo só (18/09/2026).

   A casa atende por DOIS números de WhatsApp, e cada um é uma instância
   separada do OneCode:

     • `itamarathy` — o número do escritório (Pessoal, Fiscal, Contábil, Legal,
       Financeiro, Recepção…). É a fonte que o TalentCare lê desde o começo.
     • `imobiliaria` — o número da Imobiliária, cadastrado no Relatórios em
       17/09/2026 e puxado aqui desde 18/09, a pedido do dono ("funcionários da
       imobiliária têm os dados de whats vindo de outro número").

   ⚠️⚠️ A SEGUNDA INSTÂNCIA INTEIRA CHEGA COMO UM SETOR SÓ: `dept = "Imóveis"`.
   Quem resolve isso é o Relatórios, na rota `whatsapp-imob-overview-daily` —
   aqui nada muda de forma, e é de propósito: o espelho continua com a mesma
   chave (dept + dia), as mesmas telas e a mesma régua de acesso (o recorte por
   setor casa `dept` com o NOME do setor no Nexus, e "Imóveis" é um deles).
   O porquê, medido, está na rota de lá: 49% dos atendimentos da Imobiliária não
   têm fila, e as filas que ela tem se chamam "Financeiro", "Juridico", "SAC" —
   os mesmos nomes de setores da casa. A fila fina dela continua no painel da
   Imobiliária, no próprio Relatórios.

   ⚠️ A PESSOA é a mesma chave dos dois lados: o NOME. Por isso tudo o que soma
   POR PESSOA (ficha, pontuação, atividade, relatório do setor) junta as duas
   instâncias sem precisar saber que elas existem.
   ============================================================ */

export const FONTE_PADRAO = 'itamarathy'
export const FONTE_IMOB = 'imobiliaria'

/** O setor (como o Nexus o chama) que a instância da Imobiliária alimenta. */
export const SETOR_IMOB = 'Imóveis'

/* ⚠️⚠️ POR QUE A IMOBILIÁRIA COMEÇA EM 18/09/2026, E NÃO EM 2024 (medido em
   18/09/2026, no espelho do Relatórios, antes de ligar a fonte).

   O histórico dela existe desde 22/11/2024 — 670 atendimentos. Mas em **17/09**,
   o dia em que a instância foi conectada, **466 conversas antigas foram fechadas
   de uma vez**: criadas entre 12/2024 e 09/2026, fechadas todas no mesmo dia
   (Bárbara 294, Fabiana 128, Kaique 44), com tempo de atendimento MEDIANO de
   ~305 dias. De 18/09 em diante: zero finalizados.

   Quer dizer: na Imobiliária, "finalizar atendimento" não era hábito — o que há
   no passado é uma FAXINA, não trabalho de um dia. Puxar esse histórico daria à
   Bárbara 294 atendimentos finalizados num dia só, na tela que decide aumento, e
   um tempo médio de dez meses. O número existiria e não significaria nada.

   Então a fonte começa do dia seguinte à faxina, com o passado à vista de quem
   quiser conferir: o painel da Imobiliária, no próprio Relatórios, continua com
   os dois anos inteiros. Se o dono decidir trazer o passado assim mesmo, é uma
   linha — `run-whatsapp-sync.mjs --fonte imobiliaria --desde 2024-11-22` — e aí
   a faxina aparece como o que é, um pico de 17/09. */

/** Rota no Relatórios, watermark daqui, linha do snapshot e o PRIMEIRO DIA de
 *  cada instância (só vale quando ainda não há watermark; depois manda ele).
 *  Watermarks separados: se uma instância falhar, a outra não fica para trás —
 *  e a que falhou relê sozinha o que ficou, porque o watermark dela não andou. */
export const FONTES = {
  [FONTE_PADRAO]: {
    caminho: '/api/integrations/whatsapp-overview-daily',
    watermark: 'whatsapp',
    snapshotId: 1,
    inicio: null,
  },
  [FONTE_IMOB]: {
    caminho: '/api/integrations/whatsapp-imob-overview-daily',
    watermark: 'whatsapp_imob',
    snapshotId: 2,
    inicio: '2026-09-18',
  },
} as const

export type FonteWhatsapp = keyof typeof FONTES
