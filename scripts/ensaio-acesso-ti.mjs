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

/* ⚠️⚠️ O `email` NÃO é enfeite no token forjado: `podeAdministrar` pergunta pelo
   e-mail da sessão, e sem ele até o DONO leva 307 na porta da Administração —
   um "falhou" que não é do sistema, é do ensaio. Foi o que a 1ª rodada
   devolveu. */
const cookieDe = async (u) =>
  encode({
    token: {
      sub: u.id, email: u.email, name: u.name,
      role: u.role, departmentName: u.department?.name ?? null, checadoEm: Date.now(),
    },
    secret: process.env.AUTH_SECRET,
    salt: 'authjs.session-token',
  })

// `redirect: 'manual'`: seguir o 307 do middleware esconderia a barreira medida.
const bate = async (path, token) =>
  fetch(`${BASE}${path}`, { headers: { cookie: `authjs.session-token=${token}` }, redirect: 'manual' })

/* ⚠️⚠️ A rota que ESCREVE tem de ser batida com POST e corpo VAZIO. Com GET ela
   devolve 405 antes de olhar a permissão (o método não existe), e 405 lido como
   "barrado" esconderia justamente o guarda que se quer medir — foi o que a 2ª
   rodada deste ensaio quase deu por bom. Corpo vazio: quem passa pela permissão
   cai no 400 do dado que falta, e nada é gravado.
   ⚠️ `cargo-set`, e não `sync-nexus`: esta não dispara efeito nenhum quando
   passa. */
const bateAdmin = async (token) => {
  const r = await fetch(`${BASE}/api/admin/cargo-set`, {
    method: 'POST', redirect: 'manual',
    headers: { cookie: `authjs.session-token=${token}`, 'content-type': 'application/json' },
    body: '{}',
  })
  return r.status === 403 ? 'barrada (403)' : `passou pela permissão (${r.status})`
}

/* ⚠️⚠️ A área de Administração NÃO é um endereço próprio: desde 11/09/2026 ela
   são as ABAS de `/configuracoes` (`/usuarios` é só um atalho antigo que
   responde 307 para TODO MUNDO, inclusive para o dono — a 1ª rodada deste ensaio
   leu esse 307 como "barrado" e acusou o dono de estar de fora). O que separa
   quem administra de quem não administra é a aba "Casar ponto" existir na
   página. */
const MARCA_ADMIN = 'Casar ponto'
const temAbasDeAdmin = async (token) => {
  const r = await bate('/configuracoes', token)
  if (r.status !== 200) return `não abriu (${r.status})`
  return (await r.text()).includes(MARCA_ADMIN) ? 'com as abas' : 'sem as abas'
}

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
  confere(u.name, '/configuracoes', (await bate('/configuracoes', t)).status, 200)
  confere(u.name, 'abas de Administração', await temAbasDeAdmin(t), 'com as abas')
  confere(u.name, 'rota de admin que escreve', await bateAdmin(t), 'passou pela permissão (400)')
}

console.log('\n2. A CONTRAPROVA: "Aux. de T.I" de outro setor continua de fora')
for (const u of auxes.slice(0, 3)) {
  const t = await cookieDe(u)
  confere(`${u.name} (${u.department?.name})`, 'role no banco ≠ ADMIN', u.role === 'ADMIN' ? 'ADMIN' : 'não-admin', 'não-admin')
  confere(`${u.name} (${u.department?.name})`, '/configuracoes NÃO abre', (await bate('/configuracoes', t)).status === 200 ? 'abriu' : 'barrado', 'barrado')
  confere(`${u.name} (${u.department?.name})`, 'rota de admin que escreve', await bateAdmin(t), 'barrada (403)')
}

/* ⚠️⚠️ A TERCEIRA metade, que é a que se esquece: a DIRETORIA não podia ganhar
   nada com esta mudança. Ela é ADMIN, vê a casa inteira e NÃO administra o
   sistema — se as abas de Administração aparecerem para ela, a liberação do T.I
   abriu uma porta que ninguém pediu. */
const diretoria = await prisma.user.findFirst({
  where: { active: true, role: 'ADMIN', department: { name: { contains: 'iretoria' } } },
  ...comSetor, orderBy: { name: 'asc' },
})
console.log('\n3. A DIRETORIA continua vendo tudo — MENOS a Administração')
if (!diretoria) {
  console.log('  (nenhuma conta da Diretoria ativa para medir)')
} else {
  const t = await cookieDe(diretoria)
  confere(diretoria.name, '/dashboard', (await bate('/dashboard', t)).status, 200)
  confere(diretoria.name, '/configuracoes', (await bate('/configuracoes', t)).status, 200)
  confere(diretoria.name, 'abas de Administração', await temAbasDeAdmin(t), 'sem as abas')
  confere(diretoria.name, 'rota de admin que escreve', await bateAdmin(t), 'barrada (403)')
}

console.log(`\n${falhas === 0 ? '✓ ENSAIO LIMPO' : `✗ ${falhas} AFIRMAÇÃO(ÕES) FALHARAM`}\n`)
await prisma.$disconnect()
process.exit(falhas === 0 ? 0 : 1)
