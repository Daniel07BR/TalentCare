import { FATORES, PERFIS, type Fator } from './perfis'

/* ============================================================
   A CONTA do DISC — pura, a mesma no botão, na janela e nos cartões.

   ⚠️⚠️ EMPATE É RESULTADO, não erro (pedido do dono, 22/09/2026: "alguns
   tiveram notas iguais em dois quesitos… o botão tem que ter o nome dos dois").
   `predominantes` devolve TODOS os fatores com a maior nota, e ninguém aqui
   escolhe um deles por ordem alfabética: escolher seria dizer ao gestor que a
   pessoa é "Dominante" quando o teste disse "Dominante e Estável".
   ============================================================ */

export type Notas = Record<Fator, number>

export type Fatia = { fator: Fator; nota: number; pct: number }

/** As quatro notas com a fatia de cada uma no total, da MAIOR para a menor.
 *  Empate mantém a ordem D, I, S, C, só para a tela não trocar de lugar. */
export function fatias(n: Notas): Fatia[] {
  const soma = FATORES.reduce((a, f) => a + Math.max(0, n[f]), 0)
  const base = FATORES.map((f) => ({ fator: f, nota: n[f], pct: soma > 0 ? (Math.max(0, n[f]) / soma) * 100 : 0 }))
  return base.sort((a, b) => b.nota - a.nota || FATORES.indexOf(a.fator) - FATORES.indexOf(b.fator))
}

/** Os fatores com a MAIOR nota — um, ou mais de um quando empatam. */
export function predominantes(n: Notas): Fator[] {
  const max = Math.max(...FATORES.map((f) => n[f]))
  if (!(max > 0)) return []
  return FATORES.filter((f) => n[f] === max)
}

/** "Dominante", "Dominante e Estável", "Dominante, Influente e Estável". */
export function nomeDoPerfil(fs: Fator[]): string {
  const nomes = fs.map((f) => PERFIS[f].nome)
  if (nomes.length <= 1) return nomes[0] ?? '—'
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
}

/** A cor de um fator no CSS (as variáveis moram em `disc.module.css`). */
export const corDe = (f: Fator) => `var(--disc-${f})`
export const corSuaveDe = (f: Fator) => `var(--disc-${f}-soft)`
/** O texto que se lê SOBRE a cor cheia (branco no vermelho, escuro no amarelo). */
export const tintaSobre = (f: Fator) => `var(--disc-${f}-ink)`

/**
 * A FAIXA colorida na proporção das notas — o fundo do botão e a barra da
 * janela. Corte seco entre as cores (sem degradê): "42% vermelho" tem de se
 * ler como 42% vermelho, e um degradê esconde onde uma cor acaba.
 */
export function faixa(n: Notas, direcao = '90deg'): string {
  const fs = fatias(n).filter((x) => x.pct > 0)
  if (!fs.length) return 'var(--n-card-2)'
  let acc = 0
  const paradas = fs.map((x) => {
    const de = acc
    acc += x.pct
    return `${corDe(x.fator)} ${de.toFixed(2)}% ${acc.toFixed(2)}%`
  })
  return `linear-gradient(${direcao}, ${paradas.join(', ')})`
}

/** "D 42% · S 30% · C 16% · I 12%" — a dica do botão. */
export const resumoPct = (n: Notas) =>
  fatias(n).map((x) => `${x.fator} ${Math.round(x.pct)}%`).join(' · ')

/** Valida o que o gestor digitou: inteiro de 0 a 100, e pelo menos um acima de zero. */
export function validarNotas(v: Partial<Record<Fator, unknown>>): { ok: true; notas: Notas } | { ok: false; erro: string } {
  const notas = {} as Notas
  for (const f of FATORES) {
    const x = Number(v[f])
    if (!Number.isInteger(x) || x < 0 || x > 100) return { ok: false, erro: `A nota de ${PERFIS[f].nome} tem de ser um número inteiro de 0 a 100.` }
    notas[f] = x
  }
  if (!FATORES.some((f) => notas[f] > 0)) return { ok: false, erro: 'Informe pelo menos uma nota acima de zero.' }
  return { ok: true, notas }
}

/** `AAAA-MM-DD` → `DD/MM/AAAA`, sem passar por `Date` (que puxaria para UTC). */
export const diaBr = (iso: string) => {
  const [a, m, d] = iso.split('-')
  return a && m && d ? `${d}/${m}/${a}` : iso
}
