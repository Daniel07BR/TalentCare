/* Semeia os dois eventos de FALTA GRAVE (LGPD) nas réguas que ainda não os têm.
 *
 * ⚠️⚠️ POR QUE PRECISA SEMEAR. `EVENTOS` é uma lista fechada no código, mas o
 * PESO de cada evento é uma linha por setor em `pontuacao_regra_item`. Evento
 * sem linha vale 0 — e um evento que a conta conhece e nunca soma nada é
 * exatamente o defeito que o comentário de `EVENTOS` existe para impedir: a
 * suspensão apareceria na tela da régua, o gestor a leria como ativa, e ela
 * não descontaria um ponto.
 *
 * O valor nasce PROPORCIONAL ao atraso já configurado naquele setor
 * (advertência LGPD = 3× o atraso · suspensão = 6×), pela mesma razão de
 * `propor-pesos.ts`: o peso só significa alguma coisa em relação ao que o setor
 * produz. No Legal (atraso −50) dá −150 e −300.
 *
 *   npx tsx scripts/semear-lgpd.ts            (ENSAIO)
 *   npx tsx scripts/semear-lgpd.ts --gravar
 */
import { prisma } from '../lib/db/prisma'

const MULT = { lgpd_advertencia: 3, lgpd_suspensao: 6 } as const

async function main() {
  const gravar = process.argv.includes('--gravar')
  const reguas = await prisma.pontuacaoRegra.findMany({
    include: { itens: true, },
    orderBy: { vigenteDesde: 'asc' },
  })
  const nomes = new Map(
    (await prisma.department.findMany({ select: { id: true, name: true } })).map((d) => [d.id, d.name]),
  )

  console.log(`\n${gravar ? 'GRAVANDO' : 'ENSAIO (nada gravado)'} — eventos de falta grave (LGPD)\n`)
  for (const r of reguas) {
    const nome = nomes.get(r.departmentId) ?? r.departmentId
    const atraso = Math.abs(r.itens.find((i) => i.evento === 'atraso')?.pontos ?? 0)
    if (!atraso) { console.log(`  ${nome.padEnd(14)} sem peso de atraso — pulo (não há de onde derivar)`); continue }
    for (const [evento, mult] of Object.entries(MULT)) {
      if (r.itens.some((i) => i.evento === evento)) { console.log(`  ${nome.padEnd(14)} ${evento} já existe`); continue }
      const pontos = -(atraso * mult)
      console.log(`  ${nome.padEnd(14)} ${evento.padEnd(18)} ${String(pontos).padStart(6)}`)
      if (gravar) {
        await prisma.pontuacaoRegraItem.create({ data: { regraId: r.id, evento, pontos } })
      }
    }
  }
  console.log('')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
