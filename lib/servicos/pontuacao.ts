/* ============================================================
   A PONTUAÇÃO DO SETOR — os eventos que a régua conhece e a conta.

   O Legal estreou com: base **100**, atraso **−10**, advertência **−15**, e
   **+20** no mês sem nenhuma ocorrência. Cada setor define a sua.

   ⚠️⚠️ ESTE ARQUIVO NÃO TEM `server-only` de propósito: a mesma conta roda no
   servidor (para gravar) e na tela (para a pessoa ver o efeito enquanto mexe nos
   números da régua). Uma conta duplicada entre os dois lados é a régua em dois
   lugares, e é assim que o painel passa a mostrar um número e gravar outro.
   ============================================================ */

export type EventoPontuacao = {
  chave: string
  label: string
  /** O que ele conta, em português — vai para a tela ao lado do campo. */
  descricao: string
  /** Sugestão de sinal, só para o campo nascer com o valor plausível. */
  sugestao: number
}

/**
 * Os eventos que a régua sabe contar hoje.
 *
 * ⚠️ Lista FECHADA, e não texto livre: um evento que a conta não sabe medir
 * viraria uma linha na tela que nunca soma nada — e ninguém descobre que o
 * critério que ele configurou não vale, porque o número continua saindo.
 */
export const EVENTOS: EventoPontuacao[] = [
  { chave: 'atraso', label: 'Atraso', descricao: 'cada atraso NÃO abonado no mês', sugestao: -10 },
  { chave: 'atraso_abonado', label: 'Atraso abonado', descricao: 'cada atraso justificado — no Legal, o 1º do mês', sugestao: 0 },
  { chave: 'advertencia', label: 'Advertência', descricao: 'cada advertência registrada no mês', sugestao: -15 },
  { chave: 'mes_sem_ocorrencia', label: 'Mês sem ocorrência', descricao: 'bônus se não houve atraso nem advertência', sugestao: 20 },
  { chave: 'servico_concluido', label: 'Serviço concluído', descricao: 'cada serviço concluído na planilha do setor', sugestao: 0 },
]

export type Ocorrencias = {
  atrasos: number
  atrasosAbonados: number
  advertencias: number
  servicosConcluidos: number
}

export type Regra = {
  base: number
  itens: { evento: string; pontos: number }[]
}

export type Calculo = {
  pontos: number
  /** A conta aberta, linha a linha — é o que a pessoa confere. */
  parcelas: { label: string; quantidade: number; unitario: number; total: number }[]
  detalhe: string
}

/**
 * Aplica a régua às ocorrências de um mês.
 *
 * ⚠️⚠️ Devolve a CONTA ABERTA, não só o número. Uma pontuação que decide aumento
 * e chega como um inteiro solto não se discute — a pessoa não tem como saber se
 * são dois atrasos ou uma advertência, e o gestor não tem o que mostrar. A ficha
 * exibe `parcelas`.
 *
 * ⚠️ O bônus de mês limpo só entra quando NÃO houve atraso (abonado inclusive)
 * nem advertência: um atraso justificado não pune, mas também não é "mês sem
 * ocorrência" — senão o bônus premiaria quem se atrasou com justificativa.
 */
export function calcular(regra: Regra, oc: Ocorrencias): Calculo {
  const ponto = (chave: string) => regra.itens.find((i) => i.evento === chave)?.pontos ?? 0
  const parcelas: Calculo['parcelas'] = [
    { label: 'Base do mês', quantidade: 1, unitario: regra.base, total: regra.base },
  ]

  const linha = (chave: string, label: string, qtd: number) => {
    const u = ponto(chave)
    if (!qtd || !u) return
    parcelas.push({ label, quantidade: qtd, unitario: u, total: u * qtd })
  }
  linha('atraso', 'Atrasos', oc.atrasos)
  linha('atraso_abonado', 'Atrasos abonados', oc.atrasosAbonados)
  linha('advertencia', 'Advertências', oc.advertencias)
  linha('servico_concluido', 'Serviços concluídos', oc.servicosConcluidos)

  const limpo = oc.atrasos === 0 && oc.atrasosAbonados === 0 && oc.advertencias === 0
  const bonus = ponto('mes_sem_ocorrencia')
  if (limpo && bonus) {
    parcelas.push({ label: 'Mês sem ocorrência', quantidade: 1, unitario: bonus, total: bonus })
  }

  const pontos = parcelas.reduce((a, p) => a + p.total, 0)
  const detalhe = parcelas
    .map((p) => (p.quantidade > 1 ? `${p.label} ${p.quantidade}×${p.unitario}` : `${p.label} ${p.total >= 0 && p.label !== 'Base do mês' ? '+' : ''}${p.total}`))
    .join(' · ')
  return { pontos, parcelas, detalhe }
}

/** AAAA-MM do mês corrente. */
export function competenciaAtual(hoje = new Date()): string {
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
}

export const competenciaValida = (c: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(c)

/**
 * Qual versão da régua vale numa competência.
 *
 * ⚠️ A que tem a MAIOR `vigenteDesde` que ainda é `<=` à competência pedida.
 * Pegar simplesmente a última versão recalcularia o passado com o critério de
 * hoje — que é exatamente o que a vigência existe para impedir.
 */
export function regraDaCompetencia<T extends { vigenteDesde: string }>(versoes: T[], competencia: string): T | null {
  return versoes
    .filter((v) => v.vigenteDesde <= competencia)
    .sort((a, b) => b.vigenteDesde.localeCompare(a.vigenteDesde))[0] ?? null
}
