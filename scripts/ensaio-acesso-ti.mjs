// ENSAIO do ACESSO TOTAL DO T.I, com sessão DE VERDADE. Não escreve nada.
//   node --env-file=.env scripts/ensaio-acesso-ti.mjs
//
// ⚠️⚠️ POR QUE ELE EXISTE. O banco dizendo `role='ADMIN'` prova que o sync
// calculou o que se queria — não prova que a PESSOA entra na área de
// Administração, que é uma segunda régua (`podeAdministrar`, que consulta o
// setor no banco) sobre uma porta que já era só do dono.
//
// E ele mede a CONTRAPROVA, que aqui é o ponto: o cargo **"Aux. de T.I"** existe
// em 12 pessoas de outros setores (Financeiro, Legal, Fiscal, Imóveis, Contábil,
// Pessoal, Recepção). Uma régua escrita com `cargo.includes('T.I')` entregaria a
// elas o acervo disciplinar da casa inteira — foi o que já aconteceu no Nexus em
// 09/09/2026. Um ensaio que só olha quem DEVE entrar diria "passou" nos dois
// casos.
import { PrismaClient } from '@prisma/client'
import { encode } from 'next-auth/jwt'

const prisma = new PrismaClient()
const BASE = 'http://127.0.0.1:8082'

const cookieDe = async (u) =>
  encode({
    token: { sub: u.id, role: u.role, departmentName: u.department?.name ?? null, checadoEm: Date.now() },
    secret: process.env.AUTH_SECRET,
    salt: 'authjs.session-token',
  })

// `redirect: 'manual'`: seguir o 307 do middleware esconderia a barreira medida.
const bate = async (path, token) =>
  fetch(`${BASE}${path}`, { headers: { cookie: `authjs.session-token=${token}` }, redirect: 'manual' })

let falhas = 0
const confere = (quem, oque, real, esperado) => {
  const ok = real === esperado
  if (!ok) falhas++
  console.log(`  ${ok ? '✓' : '✗'} ${quem} · ${oque}: ${real}${ok ? '' : ` (esperado ${esperado})`}`)
}

const comSetor = { select: { id: true, name: true, email: true, role: true, jobTitle: true, department: { select: { name: true } } } }

const ti = await prisma.user.findMany({
  where: { active: true, department: { name: { in: ['TI', 'T.I', 'ti'] } } },
  ...comSetor, orderBy: { name: 'asc' },
})
// A contraprova: cargo com "T.I" dentro, em OUTRO setor.
const auxes = (await prisma.user.findMany({
  where: { active: true, jobTitle: { contains: 'T.I' } },
  ...comSetor, orderBy: { name: 'asc' },
})).filter((u) => (u.department?.name ?? '').toUpperCase() !== 'TI')

console.log(`\nSETOR T.I: ${ti.length} ${ti.length === 1 ? 'pessoa' : 'pessoas'} — ${ti.map((u) => `${u.name} (${u.role})`).join(', ')}`)
console.log(`CONTRAPROVA ("Aux. de T.I" fora do setor): ${auxes.length} — ${auxes.map((u) => `${u.name}/${u.department?.name}`).join(', ')}\n`)

console.log('1. O T.I entra em tudo')
for (const u of ti) {
  const t = await cookieDe(u)
  confere(u.name, 'role no banco', u.role, 'ADMIN')
  confere(u.name, '/dashboard (a casa inteira)', (await bate('/dashboard', t)).status, 200)
  confere(u.name, '/funcionarios', (await bate('/funcionarios', t)).status, 200)
  confere(u.name, '/usuarios (Administração)', (await bate('/usuarios', t)).status, 200)
  confere(u.name, '/configuracoes', (await bate('/configuracoes', t)).status, 200)
  // A rota que ESCREVE: sem corpo ela recusa por dado, não por permissão — o que
  // importa aqui é NÃO ser 403.
  const r = await bate('/api/admin/sync-nexus', t)
  confere(u.name, '/api/admin/sync-nexus ≠ 403', r.status === 403 ? 403 : 'liberada', 'liberada')
}

console.log('\n2. A CONTRAPROVA: "Aux. de T.I" de outro setor continua de fora')
for (const u of auxes.slice(0, 3)) {
  const t = await cookieDe(u)
  const adm = await bate('/usuarios', t)
  confere(`${u.name} (${u.department?.name})`, 'role no banco ≠ ADMIN', u.role === 'ADMIN' ? 'ADMIN' : 'não-admin', 'não-admin')
  confere(`${u.name} (${u.department?.name})`, '/usuarios NÃO abre', adm.status === 200 ? 200 : 'barrado', 'barrado')
  const api = await bate('/api/admin/sync-nexus', t)
  confere(`${u.name} (${u.department?.name})`, '/api/admin/* responde 403', api.status, 403)
}

console.log(`\n${falhas === 0 ? '✓ ENSAIO LIMPO' : `✗ ${falhas} AFIRMAÇÃO(ÕES) FALHARAM`}\n`)
await prisma.$disconnect()
process.exit(falhas === 0 ? 0 : 1)
