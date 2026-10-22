/* ============================================================
   O CÓDIGO DOS TESTES (22/10/2026) — a volta do código que a página do
   teste dá ao candidato no "Concluir" ("9EE2-Q9R7-0YJE-1Y5Q").

   ⚠️⚠️ PORTE de `apps/api/plane/fluxo/codigo_dos_testes.py` do FLUXO (a página
   faz a ida, em `ferramentas/testes-do-candidato/modelo.html`). Mudou lá — uma
   versão nova do código, uma prova com outro tamanho —, mude aqui também. O
   `scripts/ensaio-codigo-dos-testes.ts` confere este arquivo contra códigos
   decifrados pelo Fluxo.

   Pedido do Daniel: o gestor lança no TalentCare o código de quem refez o teste
   (o Yuri mandou o dele). É EMBARALHAMENTO, não criptografia: serve para o
   código não se ler de olho.

   Versão 1 (9 caracteres): DISC + personalidade. Versão 2 (16): + as duas provas
   de atenção (busca de números e conferência). Base 32 de Crockford + 1
   verificador Luhn mod 32; rede de Feistel de 4 voltas.
   ============================================================ */

const ALFABETO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const EIXOS = [['E', 'I'], ['S', 'N'], ['T', 'F'], ['J', 'P']] as const
const MAXIMO_DO_EIXO = 20
const PERS = 41n ** 4n

export const BUSCA_CELULAS = 180
export const BUSCA_ALVOS = 40
export const CONF_PARES = 40

const NAO_CONFERE = 'O código não confere — confira letra por letra com o que aparece na tela do teste.'

const A1 = [0x5bd1en, 0x3c6efn, 0x9e377n, 0x7f4a7n]
const B1 = [0x1b873n, 0x2c1b3n, 0x0d2b7n, 0x6a09en]
const A2 = [0x5deece66dn, 0x2545f4914n, 0x7f4a7c15n, 0x94d049bb1n]
const B2 = [0xbn, 0x3c6ef372fn, 0x1b873593n, 0xcc9e2d51n]

function f(x: bigint, k: number, a: bigint[], b: bigint[], bits: bigint, desloca: bigint) {
  const h = (x * a[k] + b[k]) & ((1n << bits) - 1n)
  return h ^ (h >> desloca)
}

function desembaralhar(v: bigint, bits: bigint, a: bigint[], b: bigint[], desloca: bigint) {
  const m = (1n << bits) - 1n
  let esq = v >> bits
  let dir = v & m
  for (let k = 3; k >= 0; k--) {
    const novoEsq = dir ^ f(esq, k, a, b, bits, desloca)
    dir = esq
    esq = novoEsq
  }
  return (esq << bits) | dir
}

function verificador(digitos: string) {
  let fator = 2
  let soma = 0
  for (const c of [...digitos].reverse()) {
    const a = fator * ALFABETO.indexOf(c)
    fator = fator === 2 ? 1 : 2
    soma += Math.floor(a / 32) + (a % 32)
  }
  return ALFABETO[(32 - (soma % 32)) % 32]
}

function valor(digitos: string) {
  let v = 0n
  for (const c of digitos) v = v * 32n + BigInt(ALFABETO.indexOf(c))
  return v
}

/** A % do lado que venceu: 50 + |soma| × 2,5, arredondada para cima no meio (o `Math.round` da página). */
export const pctDoEixo = (soma: number) => Math.floor(50 + (Math.abs(soma) * 50) / MAXIMO_DO_EIXO + 0.5)

/** Sem espaço, hífen e ponto, em maiúscula; O vira 0, I e L viram 1 (o que se confunde ao ditar). */
export const normalizar = (texto: string) =>
  String(texto ?? '').replace(/[\s.\-]/g, '').toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1')

const divmod = (n: bigint, d: bigint): [bigint, bigint] => [n / d, n % d]

export type Busca = { acertos: number; erros: number; omissoes: number; percorrido: number }
export type Conferencia = { acertos: number; erros: number }
export type ResultadoDoCodigo = {
  versao: 1 | 2
  codigo: string
  disc: { D: number; I: number; S: number; C: number }
  tipo: string
  pct: number[]
  busca: Busca | null
  conferencia: Conferencia | null
}

function discEPersonalidade(n: bigint) {
  const [idx, p0] = divmod(n, PERS)
  let pers = p0
  if (idx >= 31n ** 3n) return null
  const [d, resto] = divmod(idx, 31n * 31n)
  const [i, s] = divmod(resto, 31n)
  const disc = { D: Number(d) + 10, I: Number(i) + 10, S: Number(s) + 10, C: 0 }
  disc.C = 100 - disc.D - disc.I - disc.S
  if (disc.C < 10 || disc.C > 40) return null
  const somas: number[] = []
  for (let k = 0; k < 4; k++) {
    let a: bigint
    ;[pers, a] = divmod(pers, 41n)
    somas.push(Number(a) - MAXIMO_DO_EIXO)
  }
  somas.reverse()
  return { disc, somas }
}

export function decodificar(texto: string): { ok: true; r: ResultadoDoCodigo } | { ok: false; erro: string } {
  const t = normalizar(texto)
  if ((t.length !== 9 && t.length !== 16) || [...t].some((c) => !ALFABETO.includes(c)))
    return { ok: false, erro: 'O código tem 16 letras e números, como aparece na tela do teste (ex.: K7Q2-M9XA-3B8C-D4EF).' }
  if (verificador(t.slice(0, -1)) !== t.slice(-1)) return { ok: false, erro: NAO_CONFERE }
  const v = valor(t.slice(0, -1))
  let busca: Busca | null = null
  let conferencia: Conferencia | null = null
  let base: bigint
  let codigo: string
  let versao: 1 | 2
  if (t.length === 9) {
    const val = desembaralhar(v, 20n, A1, B1, 9n)
    if (val >> 37n !== 1n) return { ok: false, erro: NAO_CONFERE }
    base = val & ((1n << 37n) - 1n)
    codigo = `${t.slice(0, 3)}-${t.slice(3, 6)}-${t.slice(6)}`
    versao = 1
  } else {
    if (v >> 72n !== 2n) return { ok: false, erro: NAO_CONFERE }
    let n = desembaralhar(v & ((1n << 72n) - 1n), 36n, A2, B2, 13n)
    let cErros: bigint, cAcertos: bigint, percorrido: bigint, omissoes: bigint, bErros: bigint, bAcertos: bigint
    ;[n, cErros] = divmod(n, 41n)
    ;[n, cAcertos] = divmod(n, 41n)
    ;[n, percorrido] = divmod(n, 181n)
    ;[n, omissoes] = divmod(n, 41n)
    ;[n, bErros] = divmod(n, 64n)
    ;[base, bAcertos] = divmod(n, 41n)
    const b = { acertos: Number(bAcertos), erros: Number(bErros), omissoes: Number(omissoes), percorrido: Number(percorrido) }
    const c = { acertos: Number(cAcertos), erros: Number(cErros) }
    // o que a prova não pode dar: mais alvos que a grade tem, marcas além do trecho percorrido, pares a mais
    if (b.acertos + b.omissoes > BUSCA_ALVOS || b.percorrido > BUSCA_CELULAS || b.acertos + b.erros > b.percorrido
      || c.acertos + c.erros > CONF_PARES)
      return { ok: false, erro: NAO_CONFERE }
    busca = b
    conferencia = c
    codigo = [0, 4, 8, 12].map((i) => t.slice(i, i + 4)).join('-')
    versao = 2
  }
  const partes = discEPersonalidade(base)
  if (!partes) return { ok: false, erro: NAO_CONFERE }
  const tipo = EIXOS.map(([p1, p2], i) => (partes.somas[i] > 0 ? p1 : p2)).join('')
  return { ok: true, r: { versao, codigo, disc: partes.disc, tipo, pct: partes.somas.map(pctDoEixo), busca, conferencia } }
}
