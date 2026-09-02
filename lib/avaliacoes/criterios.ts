/* ============================================================
   Os critérios da avaliação mensal. Lista FECHADA, aqui e em nenhum outro lugar.
   ⚠️ Mudar esta lista NÃO reescreve mês fechado: a média de cada avaliação é
   gravada na publicação (`Avaliacao.media`) e as notas ficam por critério. Um
   critério retirado daqui some das telas novas e continua no histórico.
   ============================================================ */

export type Criterio = {
  key: string
  label: string
  /** O que observar. Aparece embaixo do critério, no formulário. */
  desc: string
  /**
   * `false` = o critério aceita "não se aplica" com naturalidade e o formulário
   * já sugere isso. São os dois que matam a avaliação se forem obrigatórios:
   * Liderança para quem não lidera ninguém, e Melhoria num mês em que ninguém
   * melhorou nada — um 7 inventado para preencher campo entra na média como se
   * fosse observação.
   */
  sempre: boolean
}

export const CRITERIOS: Criterio[] = [
  { key: 'entrega', label: 'Entrega', sempre: true, desc: 'O que foi feito, no volume e na qualidade combinados para o cargo.' },
  { key: 'prazo', label: 'Prazo', sempre: true, desc: 'Cumpriu o que prometeu — e avisou a tempo quando não ia dar.' },
  { key: 'iniciativa', label: 'Iniciativa', sempre: true, desc: 'Resolve sem precisar ser mandado; traz o problema junto com uma saída.' },
  { key: 'equipe', label: 'Trabalho em equipe', sempre: true, desc: 'Ajuda, divide o que sabe, não deixa o colega parado esperando.' },
  { key: 'comunicacao', label: 'Comunicação', sempre: true, desc: 'Responde, informa antes de ser cobrado, escreve de um jeito que o outro entende.' },
  { key: 'conduta', label: 'Conduta', sempre: true, desc: 'Trata bem quem trabalha com ela e cumpre o combinado da casa.' },
  { key: 'melhoria', label: 'Melhoria e inovação', sempre: false, desc: 'Propôs ou fez algo que melhorou o trabalho. Mês sem isso não é demérito — marque "não se aplica".' },
  { key: 'lideranca', label: 'Liderança', sempre: false, desc: 'Só para quem conduz gente: desenvolve o time, dá retorno, decide.' },
]

export const CRITERIO_KEYS = CRITERIOS.map((c) => c.key)
export const criterioDe = (key: string) => CRITERIOS.find((c) => c.key === key)

/**
 * As ÂNCORAS da escala. Sem elas o 0–10 colapsa em "8 para todo mundo" dentro de
 * três meses, o gráfico vira uma reta e a avaliação deixa de decidir qualquer
 * coisa. Aparecem no formulário, ao lado dos botões.
 */
export const ANCORAS = [
  { ate: 4, label: 'Abaixo do esperado', color: 'var(--danger)' },
  { ate: 6, label: 'Atende em parte', color: 'var(--warning)' },
  { ate: 8, label: 'Atende — o esperado', color: 'var(--success)' },
  { ate: 10, label: 'Acima do esperado', color: 'var(--accent)' },
]

export const ancoraDe = (n: number) => ANCORAS.find((a) => n <= a.ate) ?? ANCORAS[ANCORAS.length - 1]

/**
 * ⚠️⚠️ Nota EXTREMA exige justificativa escrita (decisão do dono, 02/09/2026):
 * abaixo de 5 e acima de 8. É o freio mais barato contra a inflação de notas, e
 * é o que dá conteúdo à conversa de aumento seis meses depois — um 10 sem motivo
 * não prova nada, e um 3 sem motivo não se defende.
 *
 * ⚠️ A regra vale no SERVIDOR também, e não só no formulário: publicar é uma
 * rota, e uma rota que confia na tela não tem regra nenhuma.
 */
export const exigeJustificativa = (nota: number | null | undefined): boolean =>
  typeof nota === 'number' && (nota < 5 || nota > 8)

/** Média das notas que EXISTEM. Critério "não se aplica" sai da conta e o peso
 *  se redistribui sozinho — é a divisão pelo número de notas aplicáveis. */
export function mediaDe(notas: { nota: number | null }[]): number | null {
  const aplicaveis = notas.filter((n): n is { nota: number } => typeof n.nota === 'number')
  if (aplicaveis.length === 0) return null
  return Math.round((aplicaveis.reduce((a, n) => a + n.nota, 0) / aplicaveis.length) * 10) / 10
}

/** AAAA-MM da competência de um mês atrás (o mês fechado). */
export function competenciaAnterior(hoje = new Date()): string {
  const d = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** "agosto de 2026" a partir de "2026-08". */
export function competenciaLabel(c: string): string {
  const [a, m] = c.split('-').map(Number)
  if (!a || !m) return c
  return new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

/** Últimas N competências, da mais nova para a mais velha. */
export function competencias(n = 12, hoje = new Date()): string[] {
  const out: string[] = []
  for (let i = 1; i <= n; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

/** Primeiro e último dia da competência (Date local). */
export function limitesDaCompetencia(c: string): { inicio: Date; fim: Date } {
  const [a, m] = c.split('-').map(Number)
  return { inicio: new Date(a, m - 1, 1), fim: new Date(a, m, 0, 23, 59, 59, 999) }
}
