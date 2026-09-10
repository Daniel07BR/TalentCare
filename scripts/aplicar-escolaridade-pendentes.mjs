// Fecha as duas pendências de escolaridade de 10/09/2026, pelas ROTAS REAIS.
//   node --env-file=.env scripts/aplicar-escolaridade-pendentes.mjs [--gravar]
//
// ⚠️⚠️ CHAMA AS ROTAS, não replica a lógica delas. `education-link` faz coisas
// que um INSERT à mão não faria — entre elas apagar o vínculo ANTERIOR quando a
// linha estava presa a outra pessoa, e virar o `status` do staging para
// `applied`, que é o que tira a linha da lista "A revisar" da tela. Reescrever
// isso aqui seria uma segunda régua para a mesma operação.
//
// A sessão é forjada com o AUTH_SECRET porque as duas rotas exigem
// `isOwnerEmail` — a mesma técnica do ensaio ponta a ponta.
import { PrismaClient } from '@prisma/client'
import { encode } from 'next-auth/jwt'

const prisma = new PrismaClient()
const BASE = 'http://127.0.0.1:8082'
const GRAVAR = process.argv.includes('--gravar')

const owners = (process.env.TALENTCARE_ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean)
if (!owners.length) throw new Error('TALENTCARE_ADMIN_EMAILS vazio — as rotas exigem isOwnerEmail')
const dono = await prisma.user.findFirst({
  where: { email: { in: owners, mode: 'insensitive' } },
  select: { id: true, name: true, email: true, role: true, department: { select: { name: true } } },
})
if (!dono) throw new Error(`nenhum usuário com e-mail em ${owners.join(', ')}`)

const token = await encode({
  token: { sub: dono.id, email: dono.email, role: dono.role, departmentName: dono.department?.name ?? null, checadoEm: Date.now() },
  secret: process.env.AUTH_SECRET,
  salt: 'authjs.session-token',
})
const headers = { cookie: `authjs.session-token=${token}`, 'content-type': 'application/json' }

const post = async (rota, body) => {
  const r = await fetch(`${BASE}${rota}`, { method: 'POST', headers, body: JSON.stringify(body) })
  const t = await r.text()
  return { ok: r.ok, status: r.status, body: t.slice(0, 200) }
}

console.log(`sessão: ${dono.name} <${dono.email}>\n${GRAVAR ? 'GRAVANDO' : 'ENSAIO (nada será enviado)'}\n`)

/* ── 1. FABIANA RODRIGUES SOARES: vincular à pessoa CERTA ─────────────────
   A sugestão da tela apontava para "Fabiana Higa · Imóveis", que tem Superior
   (cursando) — aceitar rebaixaria a formação dela com o dado de outra pessoa.
   A Fabiana Rodrigues Soares de verdade existe (Limpeza, inativa) e foi
   cadastrada DEPOIS de o import rodar; por isso não era candidata na época. */
const linha = await prisma.educationStaging.findFirst({
  where: { nome: { contains: 'FABIANA RODRIGUES SOARES', mode: 'insensitive' } },
  select: { id: true, nome: true, level: true, status: true, confidence: true, matchedNexusId: true },
})
const certa = await prisma.user.findFirst({
  where: { email: { startsWith: 'fabiana.rodrigues.soares@' } },
  select: { nexusUserId: true, name: true, active: true, department: { select: { name: true } } },
})
if (!linha) console.log('  ⚠️ linha do staging não encontrada — pulo')
else if (!certa?.nexusUserId) console.log('  ⚠️ Fabiana Rodrigues Soares não encontrada por login — pulo')
else {
  console.log(`  vínculo: "${linha.nome}" (${linha.level}) → ${certa.name} · ${certa.department?.name}`
    + `${certa.active ? '' : ' [inativa — entra na ficha, não pontua]'}`)
  console.log(`           staging ${linha.status}/${linha.confidence} → applied (sai de "A revisar")`)
  if (GRAVAR) console.log('           →', JSON.stringify(await post('/api/admin/education-link',
    { stagingId: linha.id, nexusUserId: certa.nexusUserId })))
}

/* ── 2. BRUNA COSTA: Superior incompleto, curso EM ABERTO ─────────────────
   O RH informou "Superior Incompleto ? (Direito)". O dono decidiu registrar o
   NÍVEL e deixar o curso em branco — o que o sistema sabe entra, o que está sob
   dúvida não vira texto na ficha. `curso: ''` faz o `detail` sair nulo: a ficha
   mostra o nível e nenhuma frase inventada sobre o curso. */
const bruna = await prisma.user.findFirst({
  where: { email: { startsWith: 'bruna.costa@' } },
  select: { nexusUserId: true, name: true, department: { select: { name: true } } },
})
if (!bruna?.nexusUserId) console.log('\n  ⚠️ Bruna Costa não encontrada por login — pulo')
else {
  const items = [{ tipo: 'Superior', curso: '', cursando: true }]
  console.log(`\n  escolaridade: ${bruna.name} · ${bruna.department?.name} → Superior (cursando), curso em aberto`)
  if (GRAVAR) console.log('           →', JSON.stringify(await post('/api/admin/education-set',
    { nexusUserId: bruna.nexusUserId, items })))
}

if (!GRAVAR) console.log('\n(repita com --gravar para aplicar)')
await prisma.$disconnect()
