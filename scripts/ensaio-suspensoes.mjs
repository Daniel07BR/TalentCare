// ENSAIO ponta a ponta: a suspensão por atraso chegou às TELAS? Não escreve nada.
//   node --env-file=.env scripts/ensaio-suspensoes.mjs
//
// ⚠️⚠️ Conferir o banco prova que a carga entrou; não prova que a tela mostra.
// Este script forja o cookie do next-auth com o AUTH_SECRET e bate nas duas
// rotas que levam o dado ao navegador — o relatório do setor e a ficha —, no
// mês em que a suspensão existe. Foi assim que se descobriu, na entrega da área
// de Entregas, que uma célula imprimia o slug cru em vez da frase.
import { PrismaClient } from '@prisma/client'
import { encode } from 'next-auth/jwt'

const prisma = new PrismaClient()
const BASE = 'http://127.0.0.1:8082'
const FISCAL = 'cmq6vai6v0006nw4iueh1hqnm'
const JANELA = 'period=custom&from=2026-08-01&to=2026-08-31'

const quem = await prisma.user.findFirst({
  where: { role: 'ADMIN', active: true },
  select: { id: true, name: true, role: true, department: { select: { name: true } } },
})
const token = await encode({
  token: { sub: quem.id, role: quem.role, departmentName: quem.department?.name ?? null, checadoEm: Date.now() },
  secret: process.env.AUTH_SECRET,
  salt: 'authjs.session-token',
})
const cookie = { cookie: `authjs.session-token=${token}` }

console.log(`sessão: ${quem.name} (${quem.role}) · janela: agosto/2026\n`)

/* ⚠️ O DASHBOARD tem rota PRÓPRIA (`assiduidade-metrics`) e foi o consumidor que
   escapou da primeira varredura: o cartão dizia "Suspensões 0" em agosto/2026,
   mês com duas suspensões reais no Fiscal. Ele vem primeiro no ensaio por isso. */
const g = await (await fetch(`${BASE}/api/assiduidade-metrics?${JANELA}`, { headers: cookie })).json()
console.log('── DASHBOARD (casa inteira)')
console.log(`   cartão Suspensões: ${(g.lgpdSuspensoes ?? 0) + (g.suspensoesAtraso ?? 0)}`
  + `  (por atraso: ${g.suspensoesAtraso ?? '—'} · LGPD: ${g.lgpdSuspensoes ?? '—'} · advert. LGPD: ${g.lgpdAdvertencias ?? '—'})`)
for (const p of (g.byPerson ?? []).filter((p) => (p.suspensoesAtraso ?? 0) > 0)) {
  console.log(`   · ${p.personKey}  ${p.suspensoesAtraso} por atraso`)
}
console.log()

const d = await (await fetch(`${BASE}/api/dept-metrics?id=${FISCAL}&${JANELA}`, { headers: cookie })).json()
const a = d.assiduidade ?? {}
console.log('── RELATÓRIO DO SETOR (Fiscal)')
console.log(`   cartão Suspensões: ${(a.lgpdSuspensoes ?? 0) + (a.suspensoesAtraso ?? 0)}`
  + `  (por atraso: ${a.suspensoesAtraso ?? 0} · LGPD: ${a.lgpdSuspensoes ?? 0} · advert. LGPD: ${a.lgpdAdvertencias ?? 0})`)
console.log(`   advertências derivadas no mês: ${a.advertencias ?? '—'}`)
for (const p of (d.pessoas ?? []).filter((p) => (p.suspensoesAtraso ?? 0) > 0)) {
  console.log(`   · ${p.nome.padEnd(20)} ${p.suspensoesAtraso} por atraso · ${p.advertencias} advertências · pontuação ${p.pontuacao ?? "—"}`)
}

console.log('\n── FICHA de cada uma')
for (const p of (d.pessoas ?? []).filter((p) => (p.suspensoesAtraso ?? 0) > 0)) {
  const f = await (await fetch(`${BASE}/api/employee-metrics?id=${p.id}&${JANELA}`, { headers: cookie })).json()
  const s = f.assiduidade ?? {}
  console.log(`   ${p.nome}`)
  console.log(`      Conduta: atrasos ${s.atrasos} · advertências ${s.advertencias} · suspensões por atraso ${s.suspensoesAtraso ?? '—'} · LGPD ${s.suspensoes ?? '—'}`)
  const disc = (f.disciplina ?? []).filter((x) => x.data.startsWith('2026-08'))
  for (const x of disc) console.log(`      ${x.data}  [${x.tipo}]  ${x.motivo ?? ''}`)
}
await prisma.$disconnect()
