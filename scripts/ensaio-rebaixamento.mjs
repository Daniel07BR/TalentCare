// ENSAIO do REBAIXAMENTO AUTOMÁTICO de ADMIN (18/09/2026), no caminho REAL —
// o `run-sync.mjs`, que é o que o cron roda.
//   node --env-file=.env scripts/ensaio-rebaixamento.mjs
//
// ⚠️⚠️ COMO ELE TESTA SEM MENTIR. Não dá para pedir ao Nexus que diga que o Yuri
// saiu do T.I só para o ensaio ver. Então o ensaio faz o contrário: planta um
// ISCA — marca como ADMIN, aqui no espelho, alguém que a origem diz estar em
// outro setor. É exatamente o estado de quem SAIU do T.I: papel de ontem,
// setor de hoje. O sync tem de rebaixar essa pessoa e deixar todo o resto em pé.
//
// ⚠️ A isca se desfaz sozinha: o próprio sync devolve o papel certo. Ainda assim
// há um `finally` — se o ensaio morrer no meio, ninguém fica ADMIN por acidente.
//
// ⚠️⚠️ E ele mede o FREIO, que é a metade que se esquece: com mais iscas do que
// o teto, o sync NÃO pode rebaixar ninguém. Um freio que nunca foi visto agir é
// uma promessa, não uma trava.
import { PrismaClient } from '@prisma/client'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const prisma = new PrismaClient()
const roda = promisify(execFile)

let falhas = 0
const confere = (oque, real, esperado) => {
  const ok = String(real) === String(esperado)
  if (!ok) falhas++
  console.log(`  ${ok ? '✓' : '✗'} ${oque}: ${real}${ok ? '' : ` (esperado ${esperado})`}`)
}

const sync = async () => {
  const { stdout } = await roda('node', ['--env-file=.env', 'run-sync.mjs'], { cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 })
  return JSON.parse(stdout.trim().split('\n').pop())
}

const papeis = async (ids) =>
  Object.fromEntries((await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, role: true } }))
    .map((u) => [u.name, u.role]))

// Quem PODE virar isca: ativo, do Nexus, fora do T.I e da Diretoria, sem ADMIN hoje.
const candidatos = await prisma.user.findMany({
  where: {
    active: true, origin: 'nexus', role: { not: 'ADMIN' },
    department: { name: { notIn: ['TI', 'Diretoria'] } },
  },
  select: { id: true, name: true, role: true, department: { select: { name: true } } },
  orderBy: { name: 'asc' },
  take: 5,
})
const admins = await prisma.user.findMany({
  where: { active: true, role: 'ADMIN' },
  select: { id: true, name: true, department: { select: { name: true } } },
  orderBy: { name: 'asc' },
})

console.log(`\nADMIN de verdade hoje: ${admins.length} — ${admins.map((a) => `${a.name}/${a.department?.name}`).join(', ')}`)
console.log(`Iscas disponíveis: ${candidatos.map((c) => `${c.name}/${c.department?.name}`).join(', ')}\n`)

const voltar = async (lista) => {
  for (const c of lista) await prisma.user.update({ where: { id: c.id }, data: { role: c.role } })
}

try {
  // ── 1. UMA isca: tem de ser rebaixada, e só ela ────────────────────────────
  const isca = candidatos[0]
  console.log(`1. UMA isca — ${isca.name} (${isca.department?.name}) marcada como ADMIN no espelho`)
  await prisma.user.update({ where: { id: isca.id }, data: { role: 'ADMIN' } })
  const r1 = await sync()
  const depois1 = await papeis([isca.id, ...admins.map((a) => a.id)])
  confere(`${isca.name} voltou para ${isca.role}`, depois1[isca.name], isca.role)
  confere('o sync anunciou o rebaixamento', (r1.rebaixados ?? []).length, 1)
  confere('nenhum freio', r1.freioRebaixa ?? 'sem freio', 'sem freio')
  for (const a of admins) confere(`${a.name} continua ADMIN`, depois1[a.name], 'ADMIN')

  // ── 2. QUATRO iscas: o freio segura tudo ───────────────────────────────────
  const quatro = candidatos.slice(0, 4)
  console.log(`\n2. QUATRO iscas (teto é 3) — ${quatro.map((c) => c.name).join(', ')}`)
  for (const c of quatro) await prisma.user.update({ where: { id: c.id }, data: { role: 'ADMIN' } })
  const r2 = await sync()
  const depois2 = await papeis(quatro.map((c) => c.id))
  confere('o freio agiu', r2.freioRebaixa ? 'segurou' : 'não segurou', 'segurou')
  confere('nada foi rebaixado', (r2.rebaixados ?? []).length, 0)
  for (const c of quatro) confere(`${c.name} seguiu ADMIN (o freio não rebaixa)`, depois2[c.name], 'ADMIN')
} finally {
  // ⚠️ Desfaz a mão do ensaio, sempre — inclusive o que o freio deixou de pé.
  await voltar(candidatos)
  const sobrou = await prisma.user.count({ where: { id: { in: candidatos.map((c) => c.id) }, role: 'ADMIN' } })
  console.log(`\nlimpeza: ${sobrou === 0 ? 'nenhuma isca ficou ADMIN' : `⚠️ ${sobrou} isca(s) ainda ADMIN — olhe isto`}`)
  if (sobrou !== 0) falhas++
}

console.log(`\n${falhas === 0 ? '✓ ENSAIO LIMPO' : `✗ ${falhas} AFIRMAÇÃO(ÕES) FALHARAM`}\n`)
await prisma.$disconnect()
process.exit(falhas === 0 ? 0 : 1)
