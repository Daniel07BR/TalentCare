/**
 * PERSONALIDADE — os textos (22/10/2026). ⚠️ CÓPIA de `apps/web/core/components/fluxo/entrevistas/personalidade-perfis.ts`
 * do FLUXO, que é gerado por `ferramentas/testes-do-candidato/montar.py` a partir de `personalidade.json`. O teste nasce
 * lá (a página da entrevista de emprego); mudou o texto lá, copie de novo para cá — as duas telas têm de dizer o mesmo.
 *
 * Teste da casa no modelo dos 16 tipos (E/I, S/N, T/F, J/P). NÃO é o 16Personalities: as perguntas, os nomes de tipo
 * e os textos de lá são da NERIS Analytics. Aqui a chefia lê também `atencao` e `comoLidar`, que o candidato não vê.
 */

export type LetraDaPersonalidade = "E" | "I" | "S" | "N" | "T" | "F" | "J" | "P";
export type EixoDaPersonalidade = {
  chave: string;
  nome: string;
  pergunta: string;
  polos: [LetraDaPersonalidade, LetraDaPersonalidade];
};
export type PoloDaPersonalidade = {
  nome: string;
  descricao: string;
  noTrabalho: string[];
  atencao: string[];
  comoLidar: string[];
};
export type TipoDaPersonalidade = { titulo: string; essencia: string; forcas: string[] };

export const EIXOS: EixoDaPersonalidade[] = [
  {
    chave: "energia",
    nome: "Energia",
    pergunta: "De onde vem a sua energia",
    polos: ["E", "I"],
  },
  {
    chave: "informacao",
    nome: "Informação",
    pergunta: "Como você absorve as informações",
    polos: ["S", "N"],
  },
  {
    chave: "decisao",
    nome: "Decisão",
    pergunta: "Como você toma decisões",
    polos: ["T", "F"],
  },
  {
    chave: "organizacao",
    nome: "Organização",
    pergunta: "Como você organiza o trabalho",
    polos: ["J", "P"],
  },
];

export const POLOS: Record<LetraDaPersonalidade, PoloDaPersonalidade> = {
  E: {
    nome: "Extrovertido",
    descricao: "Ganha energia na convivência: conversa, troca ideias e se anima com gente por perto.",
    noTrabalho: [
      "Faz contatos com facilidade.",
      "Rende bem em equipe e no atendimento.",
      "Mantém o grupo em movimento e a conversa fluindo.",
    ],
    atencao: [
      "Pode falar antes de ouvir: dê espaço também aos mais quietos.",
      "Rende menos em tarefa longa e isolada.",
    ],
    comoLidar: [
      "Dê momentos de troca e retorno frequente.",
      "Deixe-o pensar em voz alta antes de fechar a decisão.",
      "Envolva-o em atividades com contato com pessoas.",
    ],
  },
  I: {
    nome: "Introvertido",
    descricao: "Recarrega a energia no silêncio e pensa com calma antes de falar.",
    noTrabalho: ["Concentra-se por longos períodos.", "Escuta com atenção.", "Fala com cuidado e profundidade."],
    atencao: ["Pode guardar ideias boas se não for convidado a falar.", "Barulho e interrupções constantes cansam."],
    comoLidar: [
      "Mande a pauta antes da reunião.",
      "Pergunte diretamente a opinião dele.",
      "Dê tempo e espaço para concentração.",
    ],
  },
  S: {
    nome: "Prático",
    descricao: "Olha para os fatos, para o que é concreto e para o que já foi testado.",
    noTrabalho: [
      "É atento aos detalhes.",
      "Segue procedimentos com precisão.",
      "Resolve o problema de hoje com o que tem à mão.",
    ],
    atencao: [
      "Pode estranhar mudança sem explicação prática.",
      "Ideia muito abstrata, sem exemplo, perde a atenção dele.",
    ],
    comoLidar: [
      "Dê instruções claras e exemplos.",
      "Mostre o passo a passo e o resultado esperado.",
      "Explique o motivo concreto de cada mudança.",
    ],
  },
  N: {
    nome: "Intuitivo",
    descricao: "Enxerga possibilidades, padrões e o quadro geral.",
    noTrabalho: ["Traz ideias novas.", "Pensa no futuro e em como melhorar.", "Liga assuntos que parecem distantes."],
    atencao: ["Pode se desligar de detalhes e da rotina.", "Pode perder o interesse em tarefa muito repetitiva."],
    comoLidar: [
      "Explique o objetivo maior da tarefa.",
      "Deixe espaço para ele sugerir melhorias.",
      "Combine conferências para os detalhes.",
    ],
  },
  T: {
    nome: "Racional",
    descricao: "Decide pela lógica, pelos fatos e pela coerência.",
    noTrabalho: ["Analisa com objetividade.", "É direto e franco.", "Trata todos pela mesma regra."],
    atencao: ["Pode soar seco ao dar retorno.", "Pode deixar de lado o lado emocional da equipe."],
    comoLidar: [
      "Apresente argumentos e dados.",
      "Seja objetivo no retorno.",
      "Mostre o efeito nas pessoas como mais um fato a pesar.",
    ],
  },
  F: {
    nome: "Empático",
    descricao: "Decide levando em conta as pessoas e os valores envolvidos.",
    noTrabalho: [
      "Percebe como os colegas estão.",
      "Cria clima de cooperação.",
      "Reconhece e valoriza o trabalho dos outros.",
    ],
    atencao: ["Pode evitar conversas difíceis para não magoar.", "Crítica muito dura o abala."],
    comoLidar: [
      "Comece reconhecendo o que vai bem.",
      "Dê o retorno com respeito e em particular.",
      "Mostre como o trabalho dele ajuda as pessoas.",
    ],
  },
  J: {
    nome: "Organizado",
    descricao: "Gosta de plano, de ordem e de levar as coisas até o fim.",
    noTrabalho: ["Cumpre prazos.", "Organiza tarefas e prioridades.", "Gosta de decisões claras."],
    atencao: ["Mudança de última hora incomoda.", "Pode decidir rápido demais só para fechar o assunto."],
    comoLidar: [
      "Combine prazos e prioridades com clareza.",
      "Avise as mudanças com antecedência.",
      "Reconheça a organização e a entrega no prazo.",
    ],
  },
  P: {
    nome: "Flexível",
    descricao: "Adapta-se com facilidade e gosta de manter as opções abertas.",
    noTrabalho: ["Lida bem com imprevistos.", "Encontra saídas na hora.", "Traz leveza e criatividade."],
    atencao: ["Pode deixar para a última hora.", "Rotina muito rígida o desanima."],
    comoLidar: [
      "Defina etapas intermediárias, além do prazo final.",
      "Dê liberdade no jeito de fazer.",
      "Varie as tarefas quando der.",
    ],
  },
};

export const TIPOS: Record<string, TipoDaPersonalidade> = {
  ISTJ: {
    titulo: "Metódico",
    essencia: "Responsável e confiável, cumpre o que promete com organização e atenção aos fatos.",
    forcas: ["Responsabilidade", "Organização", "Atenção aos detalhes", "Constância"],
  },
  ISFJ: {
    titulo: "Cuidador",
    essencia: "Atencioso e leal, cuida das pessoas e das tarefas com dedicação.",
    forcas: ["Dedicação", "Lealdade", "Paciência", "Atenção a quem precisa"],
  },
  INFJ: {
    titulo: "Conselheiro",
    essencia: "Reservado e profundo, entende as pessoas e busca um propósito no que faz.",
    forcas: ["Empatia", "Visão de futuro", "Compromisso com valores", "Boa escuta"],
  },
  INTJ: {
    titulo: "Estrategista",
    essencia: "Independente e analítico, enxerga o longo prazo e planeja como chegar lá.",
    forcas: ["Pensamento estratégico", "Autonomia", "Visão do todo", "Determinação"],
  },
  ISTP: {
    titulo: "Solucionador",
    essencia: "Calmo e prático, entende como as coisas funcionam e resolve problemas na hora.",
    forcas: ["Raciocínio prático", "Calma sob pressão", "Habilidade técnica", "Objetividade"],
  },
  ISFP: {
    titulo: "Criativo",
    essencia: "Gentil e observador, traz sensibilidade e capricho a tudo o que faz.",
    forcas: ["Sensibilidade", "Capricho", "Adaptabilidade", "Harmonia"],
  },
  INFP: {
    titulo: "Idealista",
    essencia: "Sincero e imaginativo, age guiado pelos seus valores e pela vontade de ajudar.",
    forcas: ["Criatividade", "Autenticidade", "Empatia", "Dedicação"],
  },
  INTP: {
    titulo: "Pensador",
    essencia: "Curioso e lógico, gosta de entender a fundo e de encontrar soluções inteligentes.",
    forcas: ["Raciocínio lógico", "Curiosidade", "Originalidade", "Análise profunda"],
  },
  ESTP: {
    titulo: "Dinâmico",
    essencia: "Ativo e direto, gosta de ação, resolve na prática e se sai bem em situações novas.",
    forcas: ["Iniciativa", "Agilidade", "Senso prático", "Desenvoltura com pessoas"],
  },
  ESFP: {
    titulo: "Espontâneo",
    essencia: "Alegre e acolhedor, traz energia ao grupo e vive bem o presente.",
    forcas: ["Simpatia", "Entusiasmo", "Flexibilidade", "Trabalho em equipe"],
  },
  ENFP: {
    titulo: "Entusiasta",
    essencia: "Criativo e comunicativo, inspira as pessoas e vê possibilidades em tudo.",
    forcas: ["Criatividade", "Comunicação", "Otimismo", "Facilidade em motivar"],
  },
  ENTP: {
    titulo: "Visionário",
    essencia: "Rápido e engenhoso, gosta de ideias novas e de desafios que fazem pensar.",
    forcas: ["Inovação", "Argumentação", "Versatilidade", "Visão de oportunidades"],
  },
  ESTJ: {
    titulo: "Organizador",
    essencia: "Prático e decidido, organiza pessoas e processos para entregar resultados.",
    forcas: ["Liderança prática", "Organização", "Firmeza", "Cumprimento de prazos"],
  },
  ESFJ: {
    titulo: "Agregador",
    essencia: "Prestativo e sociável, cuida do grupo e mantém todos unidos.",
    forcas: ["Cooperação", "Cordialidade", "Senso de responsabilidade", "Cuidado com as pessoas"],
  },
  ENFJ: {
    titulo: "Inspirador",
    essencia: "Caloroso e motivador, desenvolve as pessoas e une o grupo em torno de um objetivo.",
    forcas: ["Liderança pelo exemplo", "Comunicação", "Empatia", "Capacidade de motivar"],
  },
  ENTJ: {
    titulo: "Condutor",
    essencia: "Decidido e estratégico, transforma objetivos em planos e conduz o grupo até o resultado.",
    forcas: ["Liderança", "Decisão", "Planejamento", "Foco em resultado"],
  },
};

export const NAO_E =
  "Este teste mostra preferências — de onde vem a energia, como a pessoa absorve informações, decide e se organiza. Não existe tipo melhor ou pior, e ele não mede inteligência nem competência.";

/** As % que o teste dá (10 frases por eixo, de -2 a +2: 50 + |soma| × 2,5). O servidor confere a mesma lista. */
export const PCT_POSSIVEIS = [50, 53, 55, 58, 60, 63, 65, 68, 70, 73, 75, 78, 80, 83, 85, 88, 90, 93, 95, 98, 100];
