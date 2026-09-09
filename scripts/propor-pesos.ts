/* Propõe a metade DISCIPLINAR de cada setor, proporcional ao volume dele.
 *
 * ⚠️⚠️ POR QUE ISTO EXISTE. Os pesos do Legal (atraso −50, advertência −75, mês
 * limpo +100) foram calibrados contra o volume do Legal. Replicá-los como se
 * fossem "regra da casa" foi medido em 08/09/2026 e deu errado: **32 de 95
 * pessoas sairiam com nota NEGATIVA**, porque −50 é 7% da nota de quem soma 700
 * pontos de crédito e é a nota INTEIRA de quem soma 150. A REGRA é da casa
 * (advertência a partir do 2º atraso); o PESO não é — ele só significa alguma
 * coisa em relação ao que o setor produz e o sistema mede.
 *
 * A proposta mantém a proporção que o dono já calibrou no Legal:
 *   atraso = <fração do Legal> × mediana do crédito do setor
 *   advertência = 1,5 × atraso   ·   mês limpo = 2 × atraso
 *
 * ⚠️ A mediana é sobre quem RECEBE nota (fora chefia e fora quem não tem
 * crédito nenhum) — senão o setor cheio de gente que o sistema não mede puxa a
 * mediana para zero e a disciplina desaparece justamente onde ela é tudo o que
 * há.
 *
 * Sem `--gravar`, só imprime a tabela para o dono revisar.
 *
 * ⚠️⚠️ A APLICAÇÃO SAI DA MESMA CONTA QUE A PROPOSTA, de propósito. Um segundo
 * script que "aplicasse a tabela aprovada" divergiria do que a propôs no dia em
 * que um dos dois mudasse — e o que está em jogo é o peso do atraso na nota de
 * aumento de 95 pessoas.
 *
 * ⚠️ Corrige a régua VIGENTE no lugar, não cria versão nova: fora o Legal,
 * nenhum setor tem mês gravado com ela, e a trava de vigência existe para
 * proteger passado — aqui não há passado para proteger. (Mesmo argumento de
 * quando a base de 500 saiu.)
 *
 *   npx tsx scripts/propor-pesos.ts <AAAA-MM> [departmentIdModelo] [--gravar]
 */
import { prisma } from '../lib/db/prisma'
import { montar } from '../lib/servicos/calcular-mes'
import { competenciaValida } from '../lib/servicos/pontuacao'

const LEGAL = 'cmq6vajf5000nnw4i1tko93pz'

const mediana = (xs: number[]) => {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}

async function creditoDoSetor(id: string, comp: string) {
  const r = await montar(id, comp)
  if ('erro' in r) return { erro: r.erro as string }
  // crédito = serviços + atividades, SEM a metade disciplinar
  const vals = r.linhas.filter((l) => !l.semNota).map((l) => l.pontosDeServico + l.pontosDeAtividade)
  return { n: vals.length, mediana: mediana(vals), soma: vals.reduce((a, b) => a + b, 0) }
}

async function main() {
  /* ⚠️ As FLAGS saem antes dos posicionais. Sem isto, `propor-pesos 2026-08
     --gravar` lia "--gravar" como o id do setor modelo e morria em "Setor
     modelo sem régua" — falhando em voz alta, por sorte: se o modelo tivesse
     caído em algum default plausível, a tabela inteira teria sido gravada a
     partir da régua errada. */
  const posicionais = process.argv.slice(2).filter((a) => !a.startsWith('--'))
  const [comp, modeloId = LEGAL] = posicionais
  if (!competenciaValida(comp ?? '')) { console.error('Uso: npx tsx scripts/propor-pesos.ts <AAAA-MM>'); process.exit(1) }

  const modelo = await prisma.pontuacaoRegra.findFirst({
    where: { departmentId: modeloId }, orderBy: { vigenteDesde: 'desc' }, include: { itens: true },
  })
  if (!modelo) { console.error('Setor modelo sem régua.'); process.exit(1) }
  const atrasoModelo = Math.abs(modelo.itens.find((i) => i.evento === 'atraso')?.pontos ?? 0)
  const base = await creditoDoSetor(modeloId, comp)
  if ('erro' in base || !base.mediana) { console.error('Não deu para medir o modelo:', base); process.exit(1) }
  const fracao = atrasoModelo / base.mediana

  console.log(`\nMODELO (Legal), ${comp}: mediana de crédito ${base.mediana} · atraso ${atrasoModelo}`)
  console.log(`FRAÇÃO: um atraso custa ${(fracao * 100).toFixed(1)}% da mediana do setor\n`)
  const gravar = process.argv.includes('--gravar')
  console.log(gravar ? 'GRAVANDO\n' : 'ENSAIO (nada gravado)\n')
  console.log('setor'.padEnd(14), 'pontua'.padStart(7), 'mediana'.padStart(8), 'atraso'.padStart(7), 'advert'.padStart(7), 'mês limpo'.padStart(10), '  lgpd adv/susp')
  const semMediana: string[] = []

  const setores = await prisma.department.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
  for (const s of setores) {
    const c = await creditoDoSetor(s.id, comp)
    if ('erro' in c) { console.log(s.name.padEnd(14), '  —      (recusado)'); continue }
    if (c.n === 0) {
      console.log(s.name.padEnd(14), '      0', '       —', '   ninguém recebe nota neste mês')
      semMediana.push(s.name)
      continue
    }
    /* ⚠️ Piso de 1: um atraso que custa 0 não é "leve", é inexistente — e a
       régua passaria a dizer que atraso não importa naquele setor. */
    const atraso = Math.max(1, Math.round(fracao * c.mediana))
    /* ⚠️ Os pesos da LGPD derivam do MESMO atraso (3× advertência, 6× suspensão),
       como foram semeados. Mexer no atraso e deixar a falta grave para trás
       daria, no Contábil, atraso −5 ao lado de suspensão −300: a mesma escala
       em dois mundos. */
    const itens: Record<string, number> = {
      atraso: -atraso,
      atraso_abonado: 0,
      advertencia: -Math.round(atraso * 1.5),
      mes_sem_ocorrencia: atraso * 2,
      lgpd_advertencia: -(atraso * 3),
      lgpd_suspensao: -(atraso * 6),
    }
    console.log(
      s.name.padEnd(14), String(c.n).padStart(7), String(c.mediana).padStart(8),
      String(-atraso).padStart(7), String(itens.advertencia).padStart(7), String(itens.mes_sem_ocorrencia).padStart(10),
      `  ${itens.lgpd_advertencia}/${itens.lgpd_suspensao}`,
    )
    if (gravar) {
      const regua = await prisma.pontuacaoRegra.findFirst({
        where: { departmentId: s.id }, orderBy: { vigenteDesde: 'desc' }, select: { id: true },
      })
      if (!regua) { console.log('    (sem régua — pulo)'); continue }
      for (const [evento, pontos] of Object.entries(itens)) {
        await prisma.pontuacaoRegraItem.upsert({
          where: { regraId_evento: { regraId: regua.id, evento } },
          create: { regraId: regua.id, evento, pontos },
          update: { pontos },
        })
      }
    }
  }
  if (semMediana.length) {
    /* ⚠️⚠️ PENDÊNCIA VISÍVEL, não silêncio. Estes setores ficam com os pesos que
       a replicação copiou do Legal — errados para eles, e inertes só enquanto
       ninguém ali receber nota. No dia em que alguém do Marketing tiver
       atividade, a nota sai na escala do Legal sem ninguém ter decidido isso.
       Rode este script de novo quando isso acontecer. */
    console.log(`\n⚠️  SEM MEDIANA (ninguém recebe nota em ${comp}): ${semMediana.join(', ')}`)
    console.log('    Seguem com os pesos copiados do Legal. Rode de novo quando passarem a pontuar.')
  }
  console.log('')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
