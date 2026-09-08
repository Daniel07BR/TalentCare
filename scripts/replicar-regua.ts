/* Replica a régua de pontuação de um setor MODELO nos demais setores.
 *
 * ⚠️⚠️ POR QUE REPLICAR, e não deixar cada gestor criar do zero: sem régua o
 * setor não pontua, e o `montar` recusa a competência inteira — a lista mostra
 * "— sem pontuação no mês" para todo mundo. Um ponto de partida comum é melhor
 * que a ausência, DESDE QUE ele seja um ponto de partida declarado: a metade
 * disciplinar (atraso, advertência, mês limpo) é regra da CASA, igual em todo
 * setor; e as durações das atividades são característica da ATIVIDADE, não do
 * setor (é o mesmo raciocínio da mediana medida house-wide).
 *
 * ⚠️ O que NÃO é house-wide é o catálogo de SERVIÇOS da planilha — ele nasce do
 * arquivo que cada setor sobe, e nenhum outro setor tem arquivo hoje.
 *
 * Uso (na produção, onde o banco é local):
 *   npx tsx scripts/replicar-regua.ts <departmentIdModelo> <AAAA-MM>            (ENSAIO)
 *   npx tsx scripts/replicar-regua.ts <departmentIdModelo> <AAAA-MM> --gravar
 */
import { prisma } from '../lib/db/prisma'
import { competenciaValida } from '../lib/servicos/pontuacao'

async function main() {
  const [modeloId, vigenteDesde] = process.argv.slice(2)
  const gravar = process.argv.includes('--gravar')
  if (!modeloId || !competenciaValida(vigenteDesde ?? '')) {
    console.error('Uso: npx tsx scripts/replicar-regua.ts <departmentIdModelo> <AAAA-MM> [--gravar]')
    process.exit(1)
  }

  const modelo = await prisma.pontuacaoRegra.findFirst({
    where: { departmentId: modeloId },
    orderBy: { vigenteDesde: 'desc' },
    include: { itens: true },
  })
  if (!modelo) { console.error('O setor modelo não tem régua.'); process.exit(1) }
  const pesos = await prisma.pontuacaoAtividade.findMany({ where: { departmentId: modeloId } })
  const nomeModelo = (await prisma.department.findUnique({ where: { id: modeloId }, select: { name: true } }))?.name

  /* Só setores ATIVOS e COM GENTE: criar régua para setor vazio enche a tela de
     configuração de linhas que ninguém vai olhar. */
  const setores = await prisma.department.findMany({
    where: { active: true, id: { not: modeloId } },
    select: { id: true, name: true, _count: { select: { users: true } } },
    orderBy: { name: 'asc' },
  })
  const comGente: { id: string; name: string }[] = []
  for (const s of setores) {
    const n = await prisma.user.count({ where: { departmentId: s.id, active: true, origin: { in: ['nexus', 'staff'] } } })
    if (n > 0) comGente.push({ id: s.id, name: s.name })
  }

  console.log(`\nMODELO: ${nomeModelo} · base ${modelo.base} · ${modelo.fatorPorMinuto} pt/min · vigente desde ${modelo.vigenteDesde}`)
  console.log(`  itens: ${modelo.itens.map((i) => `${i.evento} ${i.pontos}`).join(' · ')}`)
  console.log(`  pesos de atividade: ${pesos.length}`)
  console.log(`\n${gravar ? 'GRAVANDO' : 'ENSAIO (nada gravado)'} em ${comGente.length} setores, vigente desde ${vigenteDesde}:\n`)

  for (const s of comGente) {
    const jaTem = await prisma.pontuacaoRegra.findFirst({ where: { departmentId: s.id } })
    const jaPesos = await prisma.pontuacaoAtividade.count({ where: { departmentId: s.id } })
    if (jaTem) { console.log(`  ${s.name.padEnd(14)} JÁ TEM RÉGUA — não toco`); continue }
    console.log(`  ${s.name.padEnd(14)} régua nova${jaPesos ? '' : ` + ${pesos.length} pesos de atividade`}`)
    if (!gravar) continue

    await prisma.pontuacaoRegra.create({
      data: {
        departmentId: s.id, base: modelo.base, fatorPorMinuto: modelo.fatorPorMinuto,
        vigenteDesde, criadoPor: modelo.criadoPor,
        motivo: `Ponto de partida replicado do setor ${nomeModelo}. A metade disciplinar é regra da casa; `
          + 'as durações das atividades são característica da atividade. O gestor do setor ajusta.',
        itens: { create: modelo.itens.map((i) => ({ evento: i.evento, pontos: i.pontos })) },
      },
    })
    /* ⚠️ NÃO marca `revisadoPor`: quem replicou não conferiu o peso para ESTE
       setor. "Ninguém olhou" e "olhou e manteve" não podem virar a mesma coisa
       — é a regra que o catálogo de serviços já aprendeu. */
    if (jaPesos === 0) {
      await prisma.pontuacaoAtividade.createMany({
        data: pesos.map((p) => ({
          departmentId: s.id, atividade: p.atividade,
          mediaMinutos: p.mediaMinutos, pontos: p.pontos,
        })),
      })
    }
  }
  console.log('')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
