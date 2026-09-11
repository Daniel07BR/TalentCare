/* ============================================================
   A SÉRIE DO PERÍODO — a atividade dividida em pontos que obedecem ao filtro.

   ⚠️⚠️ Pedido do dono (11/09/2026): "o campo atividade não está reagindo
   conforme o período". A série era sempre os últimos meses FECHADOS, qualquer
   que fosse o filtro — em "7 dias" o gráfico mostrava um ano. Aqui a janela é a
   do filtro, e o tamanho do ponto acompanha o tamanho da janela:
     até 45 dias → por DIA · até 4 meses → por SEMANA · acima → por MÊS.
   (Uma semana em pontos mensais é um ponto só; um ano em pontos diários, 250
   pontos de ruído.)

   ⚠️ O ponto INCOMPLETO é marcado (`parcial`), e não escondido: o mês corrente
   no filtro "Ano", a última semana curta, o dia de hoje (o espelho sincroniza
   durante o dia). A tela o desenha diferente — a regra da série mensal antiga
   ("mês de 3 dias contra mês de 30 despenca −76%") vale aqui ponto a ponto.

   Pura: sem banco. Quem soma é a rota; aqui só se decide os baldes.
   ============================================================ */

export type Granularidade = 'dia' | 'semana' | 'mes'
export type Balde = { de: string; ate: string; rotulo: string; parcial: boolean }

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const d = (iso: string) => new Date(`${iso}T12:00:00Z`)
const iso = (x: Date) => x.toISOString().slice(0, 10)
const soma = (s: string, n: number) => { const x = d(s); x.setUTCDate(x.getUTCDate() + n); return iso(x) }
const ddmm = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`

export function diasEntre(de: string, ate: string): number {
  return Math.round((d(ate).getTime() - d(de).getTime()) / 86400_000) + 1
}

export function granularidadeDe(de: string, ate: string): Granularidade {
  const n = diasEntre(de, ate)
  return n <= 45 ? 'dia' : n <= 124 ? 'semana' : 'mes'
}

/** Os baldes que cobrem [de, ate], sem buraco — zero é valor, o eixo é tempo. */
export function baldes(de: string, ate: string, hoje: string): { granularidade: Granularidade; baldes: Balde[] } {
  const g = granularidadeDe(de, ate)
  const out: Balde[] = []
  if (g === 'dia') {
    for (let x = de; x <= ate; x = soma(x, 1)) out.push({ de: x, ate: x, rotulo: ddmm(x), parcial: x === hoje })
  } else if (g === 'semana') {
    // Semanas contadas a partir do 1º dia da janela: a última pode ser curta.
    for (let x = de; x <= ate; x = soma(x, 7)) {
      const fim = soma(x, 6) > ate ? ate : soma(x, 6)
      out.push({ de: x, ate: fim, rotulo: ddmm(x), parcial: diasEntre(x, fim) < 7 || fim >= hoje })
    }
  } else {
    for (let x = de; x <= ate;) {
      const [a, m] = x.split('-').map(Number)
      const ultimo = iso(new Date(Date.UTC(a, m, 0, 12)))
      const fim = ultimo > ate ? ate : ultimo
      // Mês que não começa no dia 1 (janela a partir do meio) ou não chega ao fim também é pedaço.
      out.push({ de: x, ate: fim, rotulo: `${MESES[m - 1]}/${String(a).slice(2)}`, parcial: !x.endsWith('-01') || fim !== ultimo || fim >= hoje })
      x = soma(ultimo, 1)
    }
  }
  return { granularidade: g, baldes: out }
}

/** A janela anterior de MESMO tamanho, colada no início desta. */
export function janelaAnterior(de: string, ate: string): { de: string; ate: string } {
  const n = diasEntre(de, ate)
  return { de: soma(de, -n), ate: soma(de, -1) }
}
