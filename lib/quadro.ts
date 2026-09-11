/* ============================================================
   O QUADRO DE PESSOAS NUM DIA, e a ROTATIVIDADE DO PERÍODO (11/09/2026).

   ⚠️⚠️ DECISÃO DO DONO (11/09/2026), ao perguntar "pessoas na equipe,
   rotatividade, mulheres/homens, idade média não deveriam se adaptar ao período?":
   - pessoas, idade média, tempo de casa e mulheres/homens = RETRATO DO ÚLTIMO DIA
     do período (em "Agosto", quem estava em 31/08, com a idade e o tempo de casa
     que tinha naquele dia; em 30 dias ou "Atual", hoje);
   - rotatividade = A DO PERÍODO nas duas telas (setor e painel principal): saídas
     no período ÷ quadro médio do período (o do dia anterior ao início e o do
     último dia), SEM anualizar. Antes o setor usava 12 meses e o painel "saídas ÷
     quadro de hoje" — a mesma palavra com duas réguas.

   ⚠️ UM lugar só: a rota do setor (`/api/dept-metrics`, servidor) e o painel
   (`lib/mock/dashboard.ts`, navegador) importam daqui. Pura, sem banco.

   ⚠️ O que os dados sustentam (medido em 11/09/2026): os 95 ativos têm admissão e
   as 31 saídas têm data. Três limites: (1) quem saiu antes de out/2023 não está na
   base — janela anterior a isso conta menos gente; (2) 6 admissões são o carimbo da
   criação da conta no AD (memória `nexus-admissao-inventada-e-carimbo-ad`); (3) o
   setor é o de HOJE (quem trocou de setor conta no setor atual).
   ============================================================ */

/** Datas como 'AAAA-MM-DD' (o prefixo de um ISO serve). `null` = sem data. */
export type Passagem = { entrada: string | null; saida: string | null }

const dia10 = (s: string | null) => (s ? s.slice(0, 10) : null)

/** Estava na casa ao FIM do dia `dia`? Entrou até ele e não tinha saído até ele.
 *  ⚠️ Sem data de entrada conta como presente (não se sabe desde quando, mas está). */
export function noQuadroEm(p: Passagem, dia: string): boolean {
  const e = dia10(p.entrada), s = dia10(p.saida)
  return (!e || e <= dia) && (!s || s > dia)
}

/** O dia anterior (o quadro "no começo" do período é o do fim do dia anterior). */
export function diaAnterior(dia: string): string {
  const d = new Date(`${dia}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/** Idade completa em `dia`. `null` sem data de nascimento (e fora de 15–89: dado ruim). */
export function idadeEm(nascimento: string | null, dia: string): number | null {
  const n = dia10(nascimento)
  if (!n) return null
  const [ay, am, ad] = dia.split('-').map(Number), [by, bm, bd] = n.split('-').map(Number)
  const a = ay - by - (am < bm || (am === bm && ad < bd) ? 1 : 0)
  return a > 14 && a < 90 ? a : null
}

/** Meses de casa em `dia` (fracionário, como a média de antes). `null` sem admissão. */
export function mesesDeCasaEm(entrada: string | null, dia: string): number | null {
  const e = dia10(entrada)
  if (!e || e > dia) return null
  return (new Date(`${dia}T12:00:00Z`).getTime() - new Date(`${e}T12:00:00Z`).getTime()) / 2629800000
}

export type Rotatividade = {
  saidas: number
  /** Quem estava ao fim do dia anterior ao início. */
  quadroInicio: number
  /** Quem estava ao fim do último dia. */
  quadroFim: number
  quadroMedio: number
  /** % do período, 1 casa, SEM anualizar. */
  taxa: number
}

/** Saídas no período ÷ quadro médio do período. */
export function rotatividadeDoPeriodo(pessoas: Passagem[], fromDay: string, toDay: string): Rotatividade {
  const ini = diaAnterior(fromDay)
  const saidas = pessoas.filter((p) => { const s = dia10(p.saida); return !!s && s >= fromDay && s <= toDay }).length
  const quadroInicio = pessoas.filter((p) => noQuadroEm(p, ini)).length
  const quadroFim = pessoas.filter((p) => noQuadroEm(p, toDay)).length
  const quadroMedio = (quadroInicio + quadroFim) / 2
  return { saidas, quadroInicio, quadroFim, quadroMedio, taxa: quadroMedio > 0 ? Math.round((saidas / quadroMedio) * 1000) / 10 : 0 }
}

/** O último dia do período é hoje (ou depois)? Então o retrato é "hoje". */
export function ehHoje(toDay: string, hoje = new Date()): boolean {
  const h = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
  return toDay >= h
}
/** "hoje" ou "em 31/08/2026". */
export const rotuloDoRetrato = (toDay: string) => (ehHoje(toDay) ? 'hoje' : `em ${toDay.slice(8, 10)}/${toDay.slice(5, 7)}/${toDay.slice(0, 4)}`)
