/* Confere `lib/testes/codigo.ts` contra códigos decifrados pelo Fluxo (`codigo_dos_testes.py`).
   Rodar: npx tsx scripts/ensaio-codigo-dos-testes.ts */
import { decodificar } from '../lib/testes/codigo'

const casos: [string, unknown][] = [
  ['9EE2-Q9R7-0YJE-1Y5Q', { disc: { D: 25, I: 25, S: 19, C: 31 }, tipo: 'ISFP', pct: [88, 55, 50, 50],
    busca: { acertos: 34, erros: 0, omissoes: 6, percorrido: 171 }, conferencia: { acertos: 30, erros: 0 } }],
  ['87SP-0KWZ-BCSA-Y7GH', { disc: { D: 35, I: 35, S: 15, C: 15 }, tipo: 'INFP', pct: [50, 50, 50, 50],
    busca: { acertos: 40, erros: 0, omissoes: 0, percorrido: 180 }, conferencia: { acertos: 40, erros: 0 } }],
  ['9ee2 q9r7 0yje 1y5q', 'mesmo do primeiro'],
]
let ok = 0, falhas = 0
for (const [c, esperado] of casos) {
  const r = decodificar(c)
  const obtido = r.ok ? { disc: r.r.disc, tipo: r.r.tipo, pct: r.r.pct, busca: r.r.busca, conferencia: r.r.conferencia } : r.erro
  const alvo = esperado === 'mesmo do primeiro' ? casos[0][1] : esperado
  if (JSON.stringify(obtido) === JSON.stringify(alvo)) ok++
  else { falhas++; console.log('✗', c, obtido) }
}
for (const torto of ['9EE2-Q9R7-0YJE-1Y5R', '9EE2-Q9R7-0YJE', 'XXXX']) {
  if (decodificar(torto).ok) { falhas++; console.log('✗ aceitou', torto) } else ok++
}
console.log(`${ok} ok, ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
