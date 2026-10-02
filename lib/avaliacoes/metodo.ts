/* ============================================================
   O MÉTODO da avaliação mensal (02/10/2026) — e a RÉGUA ESCRITA de cada setor.

   Pedido do Daniel: um método reconhecido, que a Diretoria aprove e que se
   defenda numa conversa. A base é a escala ancorada em comportamento (BARS,
   Smith & Kendall, 1963): cada nível vem com o que ele SIGNIFICA no cargo, e
   não com um adjetivo. O exemplo que sustenta Abaixo e Acima segue o formato
   Situação → Comportamento → Impacto (SBI, Center for Creative Leadership).

   ⚠️⚠️ A régua do setor é o que torna a nota defensável: ninguém é avaliado por
   uma regra que não conhecia. Ela aparece nos botões de quem avalia, na página
   do avaliado e no PDF — os TRÊS leem daqui, e de nenhum outro lugar.

   ⚠️ Setor sem régua própria cai na genérica (as dicas de `NIVEIS`). A régua
   é escrita UMA vez por setor e vale para todos os meses.

   ⚠️ Arquivo sem `server-only`: a tela e o PDF importam os mesmos textos.
   ============================================================ */

import { CRITERIOS, NIVEIS } from './criterios'

export type NivelKey = 'abaixo' | 'parte' | 'atende' | 'acima'
/** critério → nível → o que aquele nível significa no setor. */
export type Regua = Record<string, Record<NivelKey, string>>

const norm = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

/* ⚠️ A RÉGUA DA T.I — rascunho de 02/10/2026, para o Daniel revisar. O setor é o
   piloto do método: três meses rodando antes de levar à Diretoria. */
const REGUA_TI: Regua = {
  entrega: {
    abaixo: 'Chamado parado além do prazo sem retorno, entrega refeita, ou problema que voltou porque a causa não foi resolvida.',
    parte: 'Resolveu o que chegou, mas com atraso ou retrabalho; precisou ser lembrado de pendências.',
    atende: 'Chamados e tarefas no prazo combinado; o que entregou funcionou e não voltou.',
    acima: 'Foi além do pedido: resolveu a causa, automatizou ou documentou algo que evita chamados futuros.',
  },
  atitude: {
    abaixo: 'Esperou ser cobrado, sabia de um problema e não avisou, ou descumpriu regra da casa (acesso, segurança, publicar fora do git).',
    parte: 'Age quando é cobrado; segue as regras na maior parte do tempo.',
    atende: 'Assume o que é dele, avisa antes quando vai atrasar e segue as regras.',
    acima: 'Viu o problema antes de virar chamado e resolveu ou levou uma proposta.',
  },
  equipe: {
    abaixo: 'Usuário ou colega ficou sem retorno; a informação ficou só com ele.',
    parte: 'Resolve, mas a forma de responder ou de explicar dificulta o entendimento ou o relacionamento com quem pediu.',
    atende: 'Dá retorno em linguagem simples e registra no chamado o que fez.',
    acima: 'Ensinou alguém ou deixou documentação que o time passou a usar.',
  },
}

/** Setor (nome normalizado, sem pontos nem espaços) → régua. */
const REGUAS: Record<string, { nome: string; regua: Regua }> = {
  ti: { nome: 'T.I', regua: REGUA_TI },
}

export type ReguaDoSetor = { propria: boolean; setor: string | null; regua: Regua }

/** A régua que vale para quem é do setor `nomeSetor` — a própria, ou a genérica. */
export function reguaDoSetor(nomeSetor: string | null | undefined): ReguaDoSetor {
  const achada = REGUAS[norm(nomeSetor)]
  if (achada) return { propria: true, setor: achada.nome, regua: achada.regua }
  const generica = Object.fromEntries(NIVEIS.map((n) => [n.key, n.dica])) as Record<NivelKey, string>
  return { propria: false, setor: null, regua: Object.fromEntries(CRITERIOS.map((c) => [c.key, generica])) }
}

/** O texto de UM nível de UM critério. */
export function significado(r: ReguaDoSetor, criterio: string, nivel: string): string {
  return r.regua[criterio]?.[nivel as NivelKey] ?? NIVEIS.find((n) => n.key === nivel)?.dica ?? ''
}

/* ── O texto do método — o mesmo na tela, na página do avaliado e no PDF ── */

export const METODO_RESUMO =
  'Todo mês, quem avalia o setor escolhe um nível em 3 pontos: Entrega, Atitude e Equipe e comunicação. ' +
  'Cada nível tem uma descrição do que ele significa no seu cargo, conhecida antes de o mês começar. ' +
  'Quando o nível é "Abaixo" ou "Acima", o avaliador escreve o exemplo que levou a ele.'

export const METODO_PONTOS = [
  { titulo: 'Critérios conhecidos antes', texto: 'Cada nível tem o que significa no seu setor. Ninguém é avaliado por uma regra que não conhecia.' },
  { titulo: 'Exemplo nos extremos', texto: '"Abaixo" e "Acima" sempre vêm com o fato que levou a eles: a situação, o que foi feito e o efeito.' },
  { titulo: 'Sistema e observação, lado a lado', texto: 'A ficha mostra o que os sistemas registraram; a avaliação mostra o que o avaliador observou. Quando discordam, há algo a conversar.' },
  { titulo: 'Você é ouvido', texto: 'Você lê, dá ciência e pode comentar. O comentário fica registrado junto da avaliação — não muda a nota, fica ao lado dela.' },
  { titulo: 'Nada se apaga', texto: 'Uma avaliação publicada só muda por correção com motivo, e a versão anterior continua registrada.' },
]

export const METODO_REFERENCIA =
  'Método: escala ancorada em comportamento (BARS), com feedback no formato Situação → Comportamento → Impacto (SBI).'

/* ── As perguntas SÓ DA GESTÃO ──────────────────────────────────────────────
   ⚠️⚠️ Ficam fora da página do avaliado e do PDF, de propósito: se o avaliador
   souber que a pessoa vai ler "corre risco: sim", ele suaviza a resposta e ela
   perde o valor. Perguntam o que o avaliador FARIA, e não o que ele acha — o
   formato da Deloitte (Buckingham & Goodall, HBR 2015), porque julgar a própria
   intenção varia menos de avaliador para avaliador do que julgar a pessoa. */
export const PERGUNTAS_GESTAO = [
  { key: 'querNaEquipe', texto: 'Eu quero esta pessoa na minha equipe.', serve: 'Mede retenção: se a resposta é "não", a nota alta não está contando a história toda.' },
  { key: 'prontoParaMais', texto: 'Está pronta para mais responsabilidade.', serve: 'Aponta quem pode crescer: base para promoção, treinamento ou nova função.' },
  { key: 'emRisco', texto: 'Corre risco de baixo desempenho.', serve: 'Alerta cedo: permite agir com conversa e apoio antes de virar problema.' },
] as const

/* O texto que abre o bloco da gestão na tela (02/10/2026 — pedido do Daniel:
   "descreva o que significa esse questionário, qual o método e a intenção"). */
export const GESTAO_EXPLICA = {
  oQueE: 'Três perguntas sobre o que VOCÊ faria com esta pessoa, e não sobre o que você acha dela. Elas não entram na nota e servem para as decisões da gestão: retenção, crescimento e acompanhamento.',
  metodo: 'Instantâneo de desempenho (Performance Snapshot) da Deloitte — Buckingham & Goodall, Harvard Business Review, 2015. Ele parte do estudo de Scullen, Mount & Goff (2000): mais da metade da variação de uma nota reflete o jeito de quem avalia, e não quem é avaliado. Perguntar pela sua própria intenção reduz esse efeito, porque você responde sobre o que conhece melhor: a sua decisão.',
  intencao: 'Separar o feedback (o que a pessoa lê e assina) das decisões de gestão (o que fazer com ela). Fica fora da página dela e do PDF de propósito: se o avaliador souber que a pessoa vai ler "corre risco: sim", ele suaviza a resposta, e ela perde o valor.',
}
export type GestaoKey = (typeof PERGUNTAS_GESTAO)[number]['key']
export type Gestao = Record<GestaoKey, boolean | null> & { anotacao: string | null }

/* ── A BASE CIENTÍFICA, com as fontes (02/10/2026) ──────────────────────────
   Pedido do Daniel: "deixar mais claro os métodos científicos usados para já
   quebrarmos resistências". Cada item diz a FONTE, o que a tela faz por causa
   dela e o que isso garante a quem é avaliado.
   ⚠️ Só entra aqui o que o sistema REALMENTE faz. Citar um estudo para uma
   regra que a tela não cumpre é o jeito mais rápido de perder a confiança que
   esta lista existe para ganhar. `soGestao` = o avaliado não vê o item (as
   perguntas de intenção ficam fora da página dele). */
export const BASE_CIENTIFICA: {
  metodo: string; fonte: string; naPratica: string; garante: string; soGestao?: boolean
}[] = [
  {
    metodo: 'Escala ancorada em comportamento (BARS)',
    fonte: 'Smith & Kendall, 1963 — Journal of Applied Psychology',
    naPratica: 'Cada nível descreve o que a pessoa faz no cargo, escrito antes do mês começar.',
    garante: 'O avaliador compara o que viu com o que está escrito, e não com a impressão dele.',
  },
  {
    metodo: 'Desempenho de tarefa e contextual',
    fonte: 'Borman & Motowidlo, 1993 — Personnel Selection in Organizations',
    naPratica: 'Entrega mede o resultado; Atitude e Equipe medem o jeito de trabalhar.',
    garante: 'Avalia o que se faz e como se faz. Personalidade não entra.',
  },
  {
    metodo: 'Feedback Situação → Comportamento → Impacto (SBI)',
    fonte: 'Center for Creative Leadership — Weitzel, 2000',
    naPratica: '"Abaixo" e "Acima" só se publicam com o fato que levou a eles.',
    garante: 'Nenhuma nota extrema sem um exemplo concreto que se possa conversar.',
  },
  {
    metodo: 'O nível em destaque, o número discreto',
    fonte: 'Kluger & DeNisi, 1996 — Psychological Bulletin (meta-análise)',
    naPratica: 'A página mostra o nome do nível e o exemplo; a média aparece pequena.',
    garante: 'A conversa fica no que fazer no próximo mês, e não na disputa por décimos.',
  },
  {
    metodo: 'Perguntas sobre o que o avaliador faria',
    fonte: 'Buckingham & Goodall, 2015 — Harvard Business Review (Deloitte); Scullen, Mount & Goff, 2000',
    naPratica: '"Quero na equipe", "pronto para mais", "corre risco" — só a gestão vê.',
    garante: 'Julgar a própria intenção varia menos de avaliador para avaliador do que julgar a pessoa.',
    soGestao: true,
  },
]

/** As fontes em uma linha, para o rodapé do PDF. */
export const FONTES_CURTAS = 'Smith & Kendall (1963); Borman & Motowidlo (1993); Weitzel / Center for Creative Leadership (2000); Kluger & DeNisi (1996).'
