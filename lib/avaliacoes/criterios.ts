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

/* ⚠️⚠️ TRÊS CRITÉRIOS (decisão do Daniel, 01/10/2026: "enxugar só para poucas
   avaliações"). Eram oito; o que saiu foi FUNDIDO, não perdido — Prazo entrou em
   Entrega, Iniciativa e Conduta viraram Atitude, Comunicação foi para Equipe.
   Melhoria e Liderança saíram: eram os dois que pediam "não se aplica", e uma
   ficha com três perguntas que sempre se aplicam se responde inteira.
   Trocado antes da primeira avaliação gravada (0 em 01/10/2026). */
export const CRITERIOS: Criterio[] = [
  { key: 'entrega', label: 'Entrega', sempre: true, desc: 'Fez o combinado para o cargo, com qualidade e no prazo — e avisou a tempo quando não ia dar.' },
  { key: 'atitude', label: 'Atitude', sempre: true, desc: 'Resolve sem precisar ser mandado, traz o problema junto com uma saída e cumpre o combinado da casa.' },
  { key: 'equipe', label: 'Equipe e comunicação', sempre: true, desc: 'Ajuda e divide o que sabe; responde, informa antes de ser cobrado e se faz entender.' },
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
  /* ⚠️ Cor própria: `--accent` é o MESMO laranja de `--warning` no tema claro
     (#b9791a), e "Acima do esperado" saía da cor de "Atende em parte". */
  { ate: 10, label: 'Acima do esperado', color: 'var(--chart-3)' },
]

export const ancoraDe = (n: number) => ANCORAS.find((a) => n <= a.ate) ?? ANCORAS[ANCORAS.length - 1]

/**
 * ⚠️⚠️ OS QUATRO NÍVEIS que o avaliador escolhe (Daniel, 01/10/2026): um clique
 * num nome, e não onze botões de 0 a 10. A coluna continua `Int` 0–10: cada
 * nível grava um número DENTRO da faixa da âncora de mesmo nome, então média,
 * cor e gráfico das outras telas seguem valendo sem conversão.
 * ⚠️ 3 e 10 caem na regra da justificativa (< 5 ou > 8); 6 e 8 não — é
 * exatamente "Abaixo e Acima pedem uma linha explicando".
 */
export const NIVEIS = [
  { key: 'abaixo', nota: 3, label: 'Abaixo do esperado', curto: 'Abaixo', dica: 'Ficou devendo o combinado.' },
  { key: 'parte', nota: 6, label: 'Atende em parte', curto: 'Em parte', dica: 'Fez uma parte do que se espera.' },
  { key: 'atende', nota: 8, label: 'Atende — o esperado', curto: 'Atende', dica: 'Fez o que se espera do cargo.' },
  { key: 'acima', nota: 10, label: 'Acima do esperado', curto: 'Acima', dica: 'Foi além do que o cargo pede.' },
].map((n) => ({ ...n, color: ancoraDe(n.nota).color }))

/** O nível de uma nota gravada (inclusive as de 0–10 de antes dos níveis). */
export const nivelDe = (nota: number) => NIVEIS[ANCORAS.indexOf(ancoraDe(nota))]

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
