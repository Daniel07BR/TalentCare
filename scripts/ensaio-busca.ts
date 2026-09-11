/* ENSAIO da BUSCA DO TOPO (11/09/2026). Não escreve nada.
 *
 *   npx --yes tsx@4 --env-file=.env --tsconfig scripts/tsconfig.json scripts/ensaio-busca.ts
 *
 * Com o dataset REAL da Diretoria (o mesmo que a tela recebe), confere que:
 *   - buscar o nome de CADA setor devolve aquele setor;
 *   - buscar o nome de CADA pessoa devolve aquela pessoa;
 *   - sem acento e fora de ordem também acha; lixo não acha nada.
 */
import { prisma } from '../lib/db/prisma'
import { getTalentData } from '../lib/data/source'
import { buscar, normBusca } from '../lib/ui/busca'

async function main() {
  const data = await getTalentData({ tipo: 'tudo' })
  let ok = 0, falhas = 0
  const erros: string[] = []
  const confere = (oque: string, cond: boolean) => { if (cond) ok++; else { falhas++; erros.push(oque) } }

  for (const d of data.departments) {
    const r = buscar(data, d.nome)
    confere(`setor "${d.nome}"`, r.some((x) => x.tipo === 'setor' && x.id === d.id))
  }
  /* A pessoa pelo nome inteiro. ⚠️ Homônimos: com mais de 8 pessoas de nome igual a
     lista corta — conferido que a pessoa está entre os resultados do nome exato. */
  for (const e of data.employees) {
    const r = buscar(data, e.nome)
    confere(`pessoa "${e.nome}"`, r.some((x) => x.tipo === 'pessoa' && x.id === e.id))
  }
  // Sem acento, fora de ordem, maiúsculas — e o que não existe.
  const comAcento = data.employees.find((e) => normBusca(e.nome) !== e.nome.toLowerCase())
  if (comAcento) confere(`sem acento: "${normBusca(comAcento.nome)}"`, buscar(data, normBusca(comAcento.nome)).some((x) => x.id === comAcento.id))
  const duas = data.employees.find((e) => e.nome.trim().split(/\s+/).length >= 2)
  if (duas) {
    const [a, ...resto] = duas.nome.trim().split(/\s+/)
    confere(`fora de ordem: "${resto[resto.length - 1]} ${a}"`, buscar(data, `${resto[resto.length - 1]} ${a}`.toUpperCase()).some((x) => x.id === duas.id))
  }
  confere('lixo não acha nada', buscar(data, 'zzqxw semnome').length === 0)
  confere('vazio não acha nada', buscar(data, '   ').length === 0)

  console.log(`${data.departments.length} setores e ${data.employees.length} pessoas no dataset da Diretoria`)
  if (erros.length) { console.log('❌', erros.slice(0, 20).join('\n   ')) }
  console.log(`${falhas ? '❌' : '✅'} ${ok + falhas} conferências, ${falhas} divergências`)
  await prisma.$disconnect()
  process.exit(falhas ? 1 : 0)
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(2) })
