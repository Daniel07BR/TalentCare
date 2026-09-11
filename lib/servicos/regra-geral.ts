/* ============================================================
   A RÉGUA GERAL — a CONTA, pura (sem banco, sem React). 11/09/2026.

   Decisão do dono: a régua de pontuação é UMA para a casa inteira, editada em
   Configurações pelo dono e pela Diretoria. Mas com o PESO PROPORCIONAL que ele
   aprovou em 09/09/2026: a regra universal diz quanto uma falta custa em relação
   ao que o setor costuma pontuar, e daí saem os pontos de cada setor.

   ⚠️⚠️ É a MESMA fórmula que gerou a tabela de 09/09 (`scripts/propor-pesos.ts`,
   que agora importa daqui). A casa já pagou por ter duas contas do mesmo peso:
   a proposta, a aplicação e a tela saem desta função, e de nenhuma outra.

   Conferido contra a régua de hoje: Fiscal atraso 15 → advertência 23, mês
   limpo 30, suspensão 46, LGPD 45/90; Consultoria 4 → 6, 8, 12, 12/24.
   ============================================================ */

export type ParametrosGerais = {
  base: number
  fatorPorMinuto: number
  /** Quanto UM atraso custa, em fração da mediana de crédito do setor. */
  fracaoAtraso: number
  multAdvertencia: number
  multMesLimpo: number
  /** × a ADVERTÊNCIA, não o atraso. */
  multSuspensao: number
  multLgpdAdvertencia: number
  multLgpdSuspensao: number
  pontosAbonado: number
  pontosServico: number
}

/** O ponto de partida: a regra aprovada pelo dono em 09/09/2026 (Legal: atraso 50 ÷ mediana 700). */
export const PARAMETROS_DE_09_09: ParametrosGerais = {
  base: 0, fatorPorMinuto: 0.1, fracaoAtraso: 50 / 700,
  multAdvertencia: 1.5, multMesLimpo: 2, multSuspensao: 2, multLgpdAdvertencia: 3, multLgpdSuspensao: 6,
  pontosAbonado: 0, pontosServico: 0,
}

/** Os pontos de cada evento num setor, dada a mediana de crédito dele. */
export function pesosDoSetor(g: ParametrosGerais, mediana: number): Record<string, number> {
  /* ⚠️ Piso de 1: um atraso que custa 0 não é "leve", é inexistente — a régua
     passaria a dizer que atraso não importa naquele setor. */
  return pesosDoAtraso(g, Math.max(1, Math.round(g.fracaoAtraso * mediana)))
}

/** Dado quanto custa UM atraso no setor, os pontos de todos os eventos. */
export function pesosDoAtraso(g: ParametrosGerais, atraso: number): Record<string, number> {
  const advertencia = Math.round(atraso * g.multAdvertencia)
  return {
    atraso: -atraso,
    atraso_abonado: g.pontosAbonado,
    advertencia: -advertencia,
    mes_sem_ocorrencia: Math.round(atraso * g.multMesLimpo),
    suspensao: -Math.round(advertencia * g.multSuspensao),
    lgpd_advertencia: -Math.round(atraso * g.multLgpdAdvertencia),
    lgpd_suspensao: -Math.round(atraso * g.multLgpdSuspensao),
    servico_concluido: g.pontosServico,
  }
}

/** A mediana — de quem RECEBE nota, a mesma de `propor-pesos.ts`. */
export function mediana(xs: number[]): number {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}

/** A competência anterior (AAAA-MM). */
export function competenciaAnterior(c: string): string {
  const [a, m] = c.split('-').map(Number)
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`
}

/** Os limites do que se pode gravar — a tela e a rota validam pelos mesmos. */
export const LIMITES = {
  base: [0, 1000], fatorPorMinuto: [0, 10], fracaoAtraso: [0.001, 1],
  mult: [0, 50], pontos: [-1000, 1000],
} as const
