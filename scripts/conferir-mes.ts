import { prisma } from '@/lib/db/prisma'
import { montar } from '@/lib/servicos/calcular-mes'

/* ============================================================
   O QUE ESTÁ GRAVADO ainda bate com o que a régua calcula HOJE?

     npx --yes tsx@4 --tsconfig scripts/tsconfig.json scripts/conferir-mes.ts <AAAA-MM>

   ⚠️⚠️ POR QUE ISTO EXISTE. A nota gravada é um retrato do dia em que se rodou
   `rodar-mes.ts`, e as fontes por baixo dela continuam se mexendo depois —
   legitimamente. Em 10/09/2026 duas coisas mexeram no mês de agosto que já
   estava gravado:

     · o backfill completo da Gerência (03:10) trouxe atividade que o sync
       incremental nunca traria, porque ele recorta pelo DIA DO EVENTO;
     · o histórico real de suspensões entrou, substituindo 8 advertências
       derivadas pelo ato assinado correspondente.

   Nenhuma das duas avisa ninguém. A nota simplesmente passa a estar velha, com
   cara de atual — e ela é o número que decide aumento.

   ⚠️ Este script NÃO grava. Ele diz de quem é a diferença e de quanto, para a
   regravação ser uma decisão e não um efeito colateral.
   ============================================================ */

const COMP = process.argv.find((a) => /^\d{4}-\d{2}$/.test(a))

async function main() {
  if (!COMP) { console.error('uso: conferir-mes.ts <AAAA-MM>'); process.exit(1) }

  const setores = await prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
  const gravadas = await prisma.pontuacaoMes.findMany({
    where: { competencia: COMP },
    select: { personKey: true, pontos: true, origem: true, departmentId: true },
  })
  const gravadoDe = new Map(gravadas.map((g) => [g.personKey, g]))
  const nomes = new Map(
    (await prisma.user.findMany({ select: { id: true, name: true, nexusUserId: true } }))
      .map((u) => [u.nexusUserId ?? u.id, u.name]),
  )

  let mudaram = 0, iguais = 0, novas = 0, somem = 0
  const linhas: string[] = []

  for (const s of setores) {
    const r = await montar(s.id, COMP)
    if ('erro' in r) { linhas.push(`${s.name.padEnd(14)} — recusado: ${r.erro}`); continue }
    const vistos = new Set<string>()
    for (const l of r.linhas) {
      vistos.add(l.personKey)
      const g = gravadoDe.get(l.personKey)
      /* ⚠️ O que o setor INFORMOU à mão não se compara com o cálculo: a régua
         não o sobrescreve (recusa nº 3), então uma diferença aqui é esperada e
         não é notícia. */
      if (g?.origem === 'informado') continue
      if (l.semNota) {
        if (g) { somem++; linhas.push(`  ${nomes.get(l.personKey) ?? l.personKey} (${s.name}): ${g.pontos} → — (${l.semNota})`) }
        continue
      }
      if (!g) { novas++; linhas.push(`  ${nomes.get(l.personKey) ?? l.personKey} (${s.name}): — → ${l.pontos}  NOVA`); continue }
      if (g.pontos !== l.pontos) {
        mudaram++
        const d = l.pontos - g.pontos
        linhas.push(`  ${(nomes.get(l.personKey) ?? l.personKey).padEnd(24)} ${s.name.padEnd(12)} ${String(g.pontos).padStart(6)} → ${String(l.pontos).padStart(6)}   (${d > 0 ? '+' : ''}${d})`)
      } else iguais++
    }
    /* Gravado para quem a régua nem lista mais (saiu do setor, virou chefia…). */
    for (const g of gravadas.filter((x) => x.departmentId === s.id && !vistos.has(x.personKey))) {
      if (g.origem === 'informado') continue
      somem++
      linhas.push(`  ${nomes.get(g.personKey) ?? g.personKey} (${s.name}): ${g.pontos} → não está mais na lista do setor`)
    }
  }

  console.log(`\nCONFERÊNCIA de ${COMP} — o gravado × o que a régua calcula agora\n`)
  console.log(`iguais: ${iguais} · MUDARAM: ${mudaram} · novas: ${novas} · deixam de ter nota: ${somem}\n`)
  for (const l of linhas) console.log(l)
  if (mudaram + novas + somem === 0) console.log('Tudo em dia — nada a regravar.')
  else console.log(`\n⚠️ Para aplicar: rodar-mes.ts <setor> ${COMP} --gravar (por setor).`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
