/* ============================================================
   OS QUATRO PERFIS DISC — a NOSSA versão, para o dia a dia da liderança.

   Base: o material do treinamento "DISC — Liderança Itamarathy" (IN-Formação
   Mentoria e Assessoria, 09/2026), adaptado pelo dono (22/09/2026: "pode
   adaptar a documentação deles para o sistema, mas crie a nossa versão").

   ⚠️ O que mudou em relação ao material:
   - Ficou SÓ o trabalho. "Em casa" e "na relação conjugal" saíram: quem abre
     esta janela é o encarregado, e a pergunta dele é como liderar.
   - "loja" virou "setor" (o material é genérico; aqui é escritório).
   - "Como cobrar" NÃO existe no material — ele só diz que o erro é "cobrar todos
     da mesma forma". A seção foi montada a partir do que o material diz que
     trava e que funciona para cada perfil, e a tela avisa que é adaptação.

   ⚠️⚠️ As CORES são as do treinamento (D vermelho, I amarelo, S verde, C azul)
   — o dono pediu: "no treinamento ficamos muito nelas". Moram em
   `app/(app)/_visao/disc/disc.module.css`, não aqui, para o tema escuro poder
   ajustar o tom sem trocar a cor.

   Módulo PURO (sem servidor): a janela, os cartões e os ensaios usam o mesmo.
   ============================================================ */

export type Fator = 'D' | 'I' | 'S' | 'C'
export const FATORES: Fator[] = ['D', 'I', 'S', 'C']

export type Perfil = {
  fator: Fator
  nome: string
  /** O segundo nome que o treinamento usa. */
  apelido: string
  /** Em três palavras, o que move o perfil. */
  foco: string
  /** A frase que abre a janela. */
  essencia: string
  palavras: string[]
  /** Como ele trabalha, o que entrega, onde tropeça. */
  comoAge: string[]
  forcas: string[]
  atencao: string[]
  /** O que ele entrega quando está no lugar certo. */
  entrega: string
  /** "Gera performance" × "Trava o perfil". */
  motiva: string[]
  trava: string[]
  comoFalar: string[]
  /** Frases de reconhecimento — o que o material chama de "reconhecimento que impacta". */
  elogios: string[]
  /** Como elogiar, além das frases. */
  comoElogiar: string
  comoCobrar: string[]
  /** Uma frase modelo de cobrança, no tom que o perfil ouve. */
  cobrancaModelo: string
  pontosCegos: string[]
  /** A pergunta que o material propõe ao próprio perfil. */
  pergunta: string
  desenvolver: string[]
  /** O exercício da semana. */
  pratica: string
}

export const PERFIS: Record<Fator, Perfil> = {
  D: {
    fator: 'D',
    nome: 'Dominante',
    apelido: 'Executor',
    foco: 'Resultado, desafio e impacto',
    essencia:
      'Vai direto ao resultado. Decide rápido, assume o comando e não gosta de rodeio. Rende mais quando usa essa força com escuta: aí conquista respeito sem precisar impor.',
    palavras: ['Objetivo', 'Prático', 'Autoconfiante', 'Competitivo', 'Solucionador', 'Independente', 'Pró-ativo', 'Firme'],
    comoAge: [
      'Olha primeiro para a meta e para o prazo.',
      'Decide rápido e gosta de desafiar o "sempre foi assim".',
      'Quer autonomia e não suporta microgestão.',
      'Pode soar frio ou direto demais com a equipe.',
    ],
    forcas: [
      'Executa: tira as coisas do papel.',
      'Passa confiança pela clareza e pela determinação.',
      'Funciona sob pressão e com metas ambiciosas.',
    ],
    atencao: [
      'Impulsividade nas decisões.',
      'Pouca paciência com processo lento ou colega indeciso.',
      'Se não regular o tom, cria clima de medo ou competição.',
    ],
    entrega: 'Rapidez, assertividade e execução. É o perfil para metas curtas e decisões que não podem esperar.',
    motiva: ['Metas claras e ousadas', 'Autonomia para decidir', 'Desafios reais, não tarefas fáceis', 'Resultado medido'],
    trava: ['Microgestão', 'Conversa longa e emocional', 'Falta de liberdade', 'Decisão que demora'],
    comoFalar: [
      'Seja objetivo e vá direto ao ponto.',
      'Mostre o resultado, não o passo a passo.',
      'Evite rodeios e excesso de emoção.',
      'Use verbos de ação e metas concretas.',
    ],
    elogios: [
      'Você foi decisivo nesse resultado.',
      'Sua entrega mudou o jogo desta semana.',
      'O jeito como você resolveu isso evitou um problema maior.',
      'Confio em você para levar isso ao próximo nível.',
    ],
    comoElogiar: 'Elogie o RESULTADO e o impacto, curto e específico. Ele valoriza reconhecimento ligado a conquista, não a esforço.',
    comoCobrar: [
      'Cobre em particular, curto e com o fato na mesa: o que foi combinado, o que aconteceu.',
      'Fale do impacto no resultado, não do jeito dele de ser.',
      'Combine a meta e o prazo e deixe o COMO com ele: cobrar cada passo é microgestão, e microgestão trava o perfil.',
      'Se o problema foi o tom com a equipe, diga o efeito: "a equipe travou depois daquela conversa".',
    ],
    cobrancaModelo: '"Combinamos X até sexta e não saiu. O que trava e o que você precisa para fechar até quarta?"',
    pontosCegos: [
      'Atropela opiniões e escuta para responder, não para compreender.',
      'Foca tanto no resultado que esquece as pessoas.',
      'Tem dificuldade de desacelerar e de pedir ajuda.',
      'Pode querer controlar situações e pessoas.',
    ],
    pergunta: 'Minha necessidade de controle está me afastando das pessoas que eu quero influenciar?',
    desenvolver: [
      'Equilibrar ação com estratégia.',
      'Ouvir mais e envolver a equipe antes de decidir.',
      'Delegar com clareza e acompanhar por indicador.',
    ],
    pratica: 'Fazer uma reunião por semana ouvindo 80% e falando 20%.',
  },

  I: {
    fator: 'I',
    nome: 'Influente',
    apelido: 'Comunicador',
    foco: 'Visibilidade, pertencimento e energia',
    essencia:
      'Move as pessoas pela energia. Comunica, engaja e cria clima bom com facilidade. Rende mais quando junta entusiasmo com responsabilidade: aí conquista as pessoas E o resultado.',
    palavras: ['Comunicativo', 'Persuasivo', 'Otimista', 'Entusiasmado', 'Sociável', 'Participativo', 'Contagiante', 'Criativo'],
    comoAge: [
      'Fala bem, convence e inspira quem está em volta.',
      'Traz ideias novas e soluções criativas.',
      'Rende em ambiente com energia, liberdade e reconhecimento.',
      'Distrai-se com facilidade e pode perder prazo se ninguém acompanhar.',
    ],
    forcas: [
      'Engaja e motiva a equipe naturalmente.',
      'Constrói relacionamentos e rede com facilidade.',
      'É excelente no atendimento e na conversa com o cliente.',
    ],
    atencao: [
      'Tarefa repetitiva ou burocrática cansa rápido.',
      'Às vezes é mais emoção do que planejamento.',
      'Tende a prometer mais do que consegue entregar.',
    ],
    entrega: 'Inspiração, engajamento e energia. Mobiliza pessoas e cria uma cultura positiva no setor.',
    motiva: ['Ambiente positivo', 'Reconhecimento frequente', 'Interação com as pessoas', 'Sentir-se importante no grupo'],
    trava: ['Silêncio da liderança', 'Falta de retorno positivo', 'Isolamento', 'Ambiente frio'],
    comoFalar: [
      'Comece com empatia e entusiasmo.',
      'Use exemplos e histórias.',
      'Reconheça as ideias e as contribuições dele.',
      'Evite crítica seca ou tom frio.',
    ],
    elogios: [
      'Você traz energia para esta equipe.',
      'As pessoas se motivam com você.',
      'Seu jeito de atender faz diferença no clima do setor.',
      'Você tem um papel importante na energia deste time.',
    ],
    comoElogiar: 'Elogie com frequência e, quando couber, na frente do grupo. Para este perfil o silêncio da liderança soa como desaprovação.',
    comoCobrar: [
      'Abra reconhecendo o que ele faz bem, e aí traga o ponto. Crítica fria, sem vínculo, ele ouve como rejeição.',
      'Troque "você é desorganizado" por combinados concretos: três prioridades, prazo escrito, um ponto de conferência.',
      'Acompanhe de perto e com leveza (um check-in rápido), não com cobrança pública.',
      'Feche pedindo que ELE resuma o combinado: transforma a conversa em compromisso.',
    ],
    cobrancaModelo: '"Sua energia puxa o time, e é por isso que preciso de você fechando isso. Vamos definir juntos as 3 prioridades desta semana e o dia de cada uma?"',
    pontosCegos: [
      'Dispersa facilmente e fala mais do que ouve.',
      'Tem dificuldade com disciplina, rotina e tarefa repetitiva.',
      'Evita conversas difíceis e conflitos importantes.',
      'Pode depender demais da aprovação dos outros.',
    ],
    pergunta: 'Estou construindo minha autoestima ou só buscando aprovação?',
    desenvolver: [
      'Manter disciplina e foco nas entregas.',
      'Estruturar rotina e prazos claros.',
      'Transformar a energia social em ação produtiva.',
    ],
    pratica: 'Planejar três prioridades por dia, e fechá-las antes de abrir uma nova.',
  },

  S: {
    fator: 'S',
    nome: 'Estável',
    apelido: 'Planejador',
    foco: 'Segurança, confiança e constância',
    essencia:
      'É o pilar da equipe. Paciente, leal e constante, mantém o setor funcionando e o clima estável. Rende mais quando aprende a dizer o que sente sem medo de perder a paz.',
    palavras: ['Paciente', 'Calmo', 'Leal', 'Acolhedor', 'Metódico', 'Persistente', 'Tolerante', 'Cooperativo'],
    comoAge: [
      'Coopera, trabalha bem em equipe e mantém a calma sob pressão.',
      'Prefere processo claro e ritmo constante, sem surpresa.',
      'É confiável: todo mundo sabe que pode contar com ele.',
      'Resiste a mudança brusca e a liderança muito autoritária.',
    ],
    forcas: [
      'Mantém a estabilidade e a qualidade do trabalho.',
      'É leal à empresa e comprometido com o grupo.',
      'Passa confiança pela consistência.',
    ],
    atencao: [
      'Dificuldade em decidir rápido.',
      'Evita confrontos, mesmo os necessários.',
      'Tende a adiar mudanças importantes.',
    ],
    entrega: 'Confiabilidade, lealdade e consistência. Mantém a equipe unida e o clima estável.',
    motiva: ['Ambiente previsível', 'Clareza de funções', 'Respeito', 'Tempo para se adaptar', 'Relações estáveis'],
    trava: ['Pressão excessiva', 'Mudança brusca sem explicação', 'Conflito', 'Insegurança'],
    comoFalar: [
      'Fale com calma e gentileza.',
      'Dê tempo para ele processar a informação.',
      'Mostre segurança e empatia.',
      'Evite pressa, tom autoritário e mudança de última hora.',
    ],
    elogios: [
      'Sua constância mantém este setor funcionando.',
      'Posso contar com você em qualquer situação.',
      'Você traz estabilidade para o time.',
      'Sua presença dá segurança para a equipe.',
    ],
    comoElogiar: 'Elogie a constância e a confiabilidade, de forma sincera e em particular. Ele valoriza mais o "posso contar com você" do que o palco.',
    comoCobrar: [
      'Cobre em particular, com calma e sem pressa. Tom duro faz este perfil se fechar, e ele concorda sem concordar.',
      'Explique o PORQUÊ e o que muda. Mudança sem explicação é o que mais o trava.',
      'Pergunte o que ele precisa para se sentir seguro com a tarefa, e dê um prazo com tempo de adaptação.',
      'O silêncio dele não é desinteresse, é cautela. Peça a opinião diretamente, e retome depois.',
    ],
    cobrancaModelo: '"Quero te ajudar a fechar isso. O prazo é dia 30 porque o cliente depende disso. O que você precisa de mim para se sentir seguro com essa entrega?"',
    pontosCegos: [
      'Guarda o que sente para evitar conflito e acumula mágoa em silêncio.',
      'Tem dificuldade em dizer "não" e em colocar limites.',
      'Coloca a necessidade dos outros acima da dele.',
      'Busca segurança acima de crescimento e se acomoda.',
    ],
    pergunta: 'O que eu estou chamando de paz é, na verdade, medo de mudança?',
    desenvolver: [
      'Trabalhar a confiança em si e a assertividade.',
      'Lidar melhor com mudança e incerteza.',
      'Aprender a dizer "não" e a colocar limites saudáveis.',
    ],
    pratica: 'Dizer um "não" construtivo por semana.',
  },

  C: {
    fator: 'C',
    nome: 'Conforme',
    apelido: 'Analista',
    foco: 'Precisão, qualidade e excelência',
    essencia:
      'É a garantia de que nada passa errado. Analítico, organizado e exigente, eleva o padrão de tudo o que toca. Rende mais quando aceita que o "suficientemente bom" também é bom.',
    palavras: ['Preciso', 'Detalhista', 'Organizado', 'Criterioso', 'Técnico', 'Racional', 'Sistemático', 'Exigente'],
    comoAge: [
      'É analítico, detalhista e comprometido com a qualidade.',
      'Prefere trabalhar com dados, regras e processos definidos.',
      'Planeja antes de agir e evita risco desnecessário.',
      'Pode demorar para decidir por medo de errar ou de faltar informação.',
    ],
    forcas: [
      'Padrão altíssimo de qualidade e precisão.',
      'Confiável, ético e disciplinado.',
      'Planeja antes, e por isso erra pouco.',
    ],
    atencao: [
      'Perfeccionismo pode gerar lentidão ou ansiedade.',
      'Dificuldade em delegar e em improvisar.',
      'Pode ser visto como frio ou formal demais.',
    ],
    entrega: 'Precisão, qualidade e confiabilidade. É o perfil do planejamento e do controle.',
    motiva: ['Processos claros', 'Regras bem definidas', 'Padrão alto', 'Critério objetivo de avaliação'],
    trava: ['Improviso constante', 'Falta de padrão', 'Ambiguidade', 'Falta de lógica'],
    comoFalar: [
      'Seja lógico, estruturado e claro.',
      'Traga dados e evidências.',
      'Evite improviso e emoção exagerada.',
      'Respeite o tempo de análise e as normas.',
    ],
    elogios: [
      'Seu cuidado evitou erros importantes.',
      'A qualidade do seu trabalho sustenta o padrão do setor.',
      'Com você, nada passa despercebido.',
      'Seu padrão eleva o nível de toda a operação.',
    ],
    comoElogiar: 'Elogie a qualidade de forma específica: diga O QUE ficou bom e por quê. Elogio genérico ("ficou ótimo") ele desconfia.',
    comoCobrar: [
      'Traga o fato e o critério: o que era esperado, o que chegou, onde está a diferença. Sem critério objetivo, a cobrança soa injusta.',
      'Fale do trabalho, nunca da pessoa. Este perfil já se cobra muito, e crítica pessoal vira mais autocobrança, não mais entrega.',
      'Se o problema é demora, defina o "bom o bastante" e o prazo por escrito: "com 80% de certeza, entregue".',
      'Avise antes; não cobre de improviso nem na frente dos outros.',
    ],
    cobrancaModelo: '"O relatório ficou muito bem feito. O ponto é o prazo: precisamos dele na terça. Vamos combinar o que é essencial nesta versão e o que pode entrar depois?"',
    pontosCegos: [
      'Perfeccionismo e excesso de análise.',
      'Demora para decidir e sofre por antecipação.',
      'Tem dificuldade de delegar, porque acredita que fará melhor.',
      'Espera que o outro perceba detalhes que nunca foram ditos, e se fecha quando algo incomoda.',
    ],
    pergunta: 'Eu preciso mesmo de mais informação, ou estou evitando decidir?',
    desenvolver: [
      'Evitar a paralisia por análise.',
      'Ter confiança para agir mesmo sem 100% de certeza.',
      'Priorizar a entrega e o resultado, não só o processo.',
    ],
    pratica: 'Entregar um trabalho sem revisar mais de duas vezes.',
  },
}

/* ── Os PARES: onde dois perfis se estranham, e o que resolve ─────────────── */

export type Par = {
  chave: string
  diferenca: string
  atrito: string
  /** O que cada lado faz — a "solução prática" do material. */
  solucao: Partial<Record<Fator, string>>
  /** O resumo em três palavras do material ("D valida; I resume"). */
  chaveSolucao: string
}

/** A chave de um par em ordem canônica (D, I, S, C). */
export const chaveDoPar = (a: Fator, b: Fator) =>
  [a, b].sort((x, y) => FATORES.indexOf(x) - FATORES.indexOf(y)).join('')

export const PARES: Record<string, Par> = {
  DI: {
    chave: 'DI',
    diferenca: 'D quer resultado rápido; I quer conexão e leveza.',
    atrito: 'O D acha que o I "fala demais e faz de menos"; o I acha o D frio e impaciente, e sem validação desanima.',
    solucao: {
      D: 'Praticar paciência e validar ("boa ideia, gostei da sua energia").',
      I: 'Resumir a ideia pelo resultado ("isso traz mais clientes").',
    },
    chaveSolucao: 'D valida; I resume.',
  },
  DS: {
    chave: 'DS',
    diferenca: 'D é rápido e direto; S é calmo e cauteloso.',
    atrito: 'O D lê o silêncio do S como falta de compromisso, e é só medo de errar. O D fala alto, o S se cala.',
    solucao: {
      D: 'Ouvir e explicar o porquê das decisões.',
      S: 'Dizer o que precisa para se sentir seguro ("preciso revisar o plano antes").',
    },
    chaveSolucao: 'D explica; S comunica.',
  },
  DC: {
    chave: 'DC',
    diferenca: 'D quer velocidade; C quer precisão.',
    atrito: 'O D acha que o C "complica demais"; o C acha que o D "decide sem base". Tensão entre eficiência e excelência.',
    solucao: {
      D: 'Dar espaço para a análise antes da execução.',
      C: 'Apresentar os dados de forma breve ("em 3 pontos, os riscos são…").',
    },
    chaveSolucao: 'D dá espaço; C é breve.',
  },
  IS: {
    chave: 'IS',
    diferenca: 'I é espontâneo e criativo; S é reservado e previsível.',
    atrito: 'O I muda de ideia e interrompe; o S ouve, se cala e pode guardar mágoa, e o I nem percebe.',
    solucao: {
      I: 'Avisar das mudanças com antecedência.',
      S: 'Dizer o desconforto sem medo de desagradar ("preciso de mais clareza sobre isso").',
    },
    chaveSolucao: 'I avisa; S se expressa.',
  },
  IC: {
    chave: 'IC',
    diferenca: 'I é emocional e livre; C é racional e estruturado.',
    atrito: 'O I acha o C "engessado"; o C acha o I "desorganizado". Um se sente limitado, o outro exausto de corrigir.',
    solucao: {
      I: 'Respeitar processos e prazos.',
      C: 'Focar no propósito, e não só no padrão técnico.',
    },
    chaveSolucao: 'I estrutura; C flexibiliza.',
  },
  SC: {
    chave: 'SC',
    diferenca: 'Os dois são cautelosos, por motivos diferentes: o S evita conflito, o C evita erro.',
    atrito: 'A conversa é respeitosa, mas passiva. Diante de mudança os dois resistem, e os problemas se acumulam por falta de alguém que os exponha.',
    solucao: {
      S: 'Trazer a visão humana e ousar mais nas decisões.',
      C: 'Simplificar e agir com o suficiente, não com o perfeito.',
    },
    chaveSolucao: 'S ousa; C age com 80%.',
  },
}

/** O lembrete que abre a janela — o "erro que destrói performance" do material. */
export const LEMBRETE_DO_LIDER =
  'Elogiar, cobrar e corrigir todo mundo do mesmo jeito é o erro mais comum: o D fica impaciente, o I perde o foco, o S se fecha e o C se sobrecarrega.'

/** O que o DISC NÃO é — dito na tela, porque é o que evita o rótulo. */
export const O_QUE_NAO_E =
  'O DISC é uma foto do momento e mostra tendências, não quem a pessoa é. Não mede inteligência, competência técnica, valores nem saúde emocional, e nenhum perfil é melhor que outro.'
