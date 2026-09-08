/* Roda a pontuação de um setor num mês, pela MESMA conta da tela.
 *
 * ⚠️ Ele NÃO reimplementa a régua: importa `montar`/`gravarMes` de
 * `lib/servicos/calcular-mes.ts`, as mesmas funções que a rota autenticada
 * usa. É por isso que rodar por aqui e rodar por "Ensaiar → Gravar" na tela dão
 * exatamente o mesmo número — a régua da casa mora em um lugar.
 *
 * Uso (na produção, onde o banco é local):
 *   npx tsx scripts/rodar-mes.ts <departmentId> <AAAA-MM>            (ENSAIO, não grava)
 *   npx tsx scripts/rodar-mes.ts <departmentId> <AAAA-MM> --gravar  (grava)
 */
import { montar, gravarMes } from '../lib/servicos/calcular-mes'
import { competenciaValida } from '../lib/servicos/pontuacao'
import { prisma } from '../lib/db/prisma'

async function main() {
  const [departmentId, competencia] = process.argv.slice(2)
  const gravar = process.argv.includes('--gravar')
  if (!departmentId || !competenciaValida(competencia ?? '')) {
    console.error('Uso: npx tsx scripts/rodar-mes.ts <departmentId> <AAAA-MM> [--gravar]')
    process.exit(1)
  }

  const setor = await prisma.department.findUnique({ where: { id: departmentId }, select: { name: true } })
  const r = gravar ? await gravarMes(departmentId, competencia) : await montar(departmentId, competencia)
  if ('erro' in r) { console.error('RECUSADO:', r.erro); process.exit(1) }

  console.log(`\n${gravar ? 'GRAVADO' : 'ENSAIO (nada gravado)'} — ${setor?.name ?? departmentId} · ${competencia}`)
  console.log(`Régua desde ${r.vigenteDesde} · base ${r.base} · ${r.fatorPorMinuto} pt/min`)
  if (r.atividadesNoPadrao) console.log('⚠️  ATIVIDADES NO PESO PADRÃO (1) — a nota está dominada por volume.')
  if (r.foraDoPonto.length) console.log(`Sem ponto (só serviço+atividade): ${r.foraDoPonto.join(', ')}`)
  if (r.informados.length) console.log(`Preservados (informados à mão): ${r.informados.join(', ')}`)
  console.log('')
  for (const l of r.linhas) {
    const flag = l.jaTem?.origem === 'informado' ? ' [informado — não recalculado]' : l.semPonto ? ' [sem ponto]' : ''
    console.log(`  ${String(l.pontos).padStart(6)}  ${l.nome}${flag}`)
    console.log(`          ${l.detalhe}`)
  }
  if (gravar) {
    const g = r as unknown as { gravadas: number; preservadas: number }
    console.log(`\n${g.gravadas} gravadas · ${g.preservadas} preservadas`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
