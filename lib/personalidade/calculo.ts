import { EIXOS, POLOS, TIPOS, type LetraDaPersonalidade } from './perfis'

/* ============================================================
   A CONTA da PERSONALIDADE — pura, a mesma no botão, na janela e na rota.

   O resultado é o TIPO (4 letras, uma de cada par) e a % de CADA LETRA do tipo,
   na ordem: "INFP 58 · 70 · 65 · 60" quer dizer I 58%, N 70%, F 65%, P 60%.
   A letra é a que venceu o par, então a % vai de 50 a 100. Sem nenhuma % = só
   as letras (`pct` vazio): a pessoa tinha o tipo e não os números.

   ⚠️ A conferência daqui é MAIS FROUXA que a do Fluxo, de propósito. O Fluxo
   só aceita as 21 % que o teste da casa dá (é a pegada do número digitado
   errado no balcão). Aqui a chefia lança também o resultado que a equipe já
   tinha — e muita gente fez o 16Personalities, que dá qualquer número de 50 a
   100 e um sufixo (-A / -T) que o teste da casa não tem. O sufixo se ignora.
   ============================================================ */

export type ResultadoPersonalidade = { tipo: string; pct: number[] }

/** As cores das réguas — as mesmas do Fluxo e da página do teste (nenhuma é cor de DISC). */
export const COR_DO_EIXO: Record<string, string> = {
  energia: '#2563eb',
  informacao: '#9333ea',
  decisao: '#059669',
  organizacao: '#ea580c',
}

export const corDaLetra = (i: number) => COR_DO_EIXO[EIXOS[i]?.chave] ?? 'var(--n-text)'

/** "INFP-T", " infp " → "INFP". */
export const limparTipo = (t: string) => t.trim().toUpperCase().replace(/[-\s]?[AT]$/, '').slice(0, 4)

/** O nome do tipo no teste da casa ("Idealista"), ou o próprio tipo se as letras não fecham. */
export const tituloDoTipo = (tipo: string) => TIPOS[tipo]?.titulo ?? tipo

/** Lançado só com as letras, sem as porcentagens (pedido do Daniel, 22/10/2026: "talvez o pessoal não tenha
 *  exatamente a porcentagem"). */
export const soLetras = (p: ResultadoPersonalidade) => !p.pct || p.pct.length !== 4

/** "I 58% · N 70% · F 65% · P 60%" — ou "só as letras". */
export const linhaDaPersonalidade = (p: ResultadoPersonalidade) =>
  soLetras(p) ? 'só as letras, sem as porcentagens' : p.pct.map((x, i) => `${p.tipo[i]} ${x}%`).join(' · ')

export function validarPersonalidade(
  tipoBruto: unknown, pctBruto: unknown,
): { ok: true; r: ResultadoPersonalidade } | { ok: false; erro: string } {
  const tipo = limparTipo(String(tipoBruto ?? ''))
  if (tipo.length !== 4 || EIXOS.some((ex, i) => !ex.polos.includes(tipo[i] as LetraDaPersonalidade)))
    return { ok: false, erro: 'O tipo tem 4 letras, uma de cada par: E ou I, S ou N, T ou F, J ou P (ex.: INFP).' }
  // ⚠️ SÓ AS LETRAS vale (os quatro campos vazios): muita gente guardou só o tipo. Metade preenchida, não — aí
  // falta um número, e "esquecido" não pode virar "sem porcentagem" calado.
  const brutos: unknown[] = Array.isArray(pctBruto) ? pctBruto : []
  if (brutos.every((x) => String(x ?? '').trim() === '')) return { ok: true, r: { tipo, pct: [] } }
  if (brutos.length !== 4) return { ok: false, erro: 'Digite as quatro porcentagens, ou deixe as quatro em branco.' }
  const pct: number[] = []
  for (let i = 0; i < 4; i++) {
    const texto = String(brutos[i] ?? '').trim()
    // ⚠️ Campo vazio NÃO vira zero calado (a mesma regra do DISC).
    if (!/^\d{1,3}$/.test(texto))
      return { ok: false, erro: `Falta a porcentagem de ${tipo[i]} (${nomeDoPolo(tipo[i])}) — ou deixe as quatro em branco para salvar só as letras.` }
    const x = Number(texto)
    if (x < 50 || x > 100)
      return { ok: false, erro: `${tipo[i]} ${x}%: a letra do tipo é a que venceu o par, então a % vai de 50 a 100.` }
    pct.push(x)
  }
  return { ok: true, r: { tipo, pct } }
}

const nomeDoPolo = (l: string) => POLOS[l as LetraDaPersonalidade]?.nome ?? l
