/* ENSAIO do DISC (22/09/2026). NÃO grava nada.
 *
 *   npx --yes tsx@4 --env-file=.env --tsconfig scripts/tsconfig.json scripts/ensaio-disc.ts
 *
 * A régua do dono: o DISC individual é da chefia do setor, da Diretoria e do T.I.
 * O funcionário não vê o próprio, colega não vê.
 *
 * Confere, com a sessão de CADA pessoa com vínculo de chefia forjada contra o
 * serviço rodando (a porta e a régua juntas, não só a função):
 *   1. ninguém de fora do ADMIN lê o PRÓPRIO DISC (403);
 *   2. gestor/sub lê um colaborador do setor que chefia (200) e NÃO lê o de
 *      outro setor (403);
 *   3. sub-encarregado não lê o gestor do próprio setor (403);
 *   4. colaborador comum não lê ninguém, nem a si (403 ou barrado na porta);
 *   5. ADMIN lê qualquer um (200); `/api/disc/grupo` só ADMIN;
 *   6. POST com nota inválida é recusado (400) ANTES de gravar, e POST de quem
 *      não é da régua é recusado (403), também sem gravar.
 */
import { encode } from 'next-auth/jwt'
import { prisma } from '../lib/db/prisma'

export {}

const BASE = 'http://127.0.0.1:8082'
const cookie = async (u: { id: string; role: string; email?: string | null }) => `authjs.session-token=${await encode({
  token: { sub: u.id, role: u.role, email: u.email ?? undefined, checadoEm: Date.now() }, secret: process.env.AUTH_SECRET!, salt: 'authjs.session-token',
})}`
let ok = 0
const erros: string[] = []
const confere = (oque: string, obtido: number, esperado: number | number[]) => {
  const e = Array.isArray(esperado) ? esperado : [esperado]
  if (e.includes(obtido)) ok++
  else erros.push(`✗ ${oque}: deu ${obtido}, esperado ${e.join(' ou ')}`)
}
type U = { id: string; name: string; role: string; email: string; departmentId: string | null }
const req = async (u: U, path: string, init?: RequestInit) =>
  (await fetch(`${BASE}${path}`, { ...init, headers: { ...(init?.headers ?? {}), cookie: await cookie(u), 'Content-Type': 'application/json' }, redirect: 'manual' })).status

const antes = await prisma.discResultado.count()
const sel = { id: true, name: true, role: true, email: true, departmentId: true } as const
const equipe = { origin: { in: ['nexus', 'staff'] }, foraDoDiretorio: false, active: true }

const vinculos = await prisma.setorAvaliador.findMany({ select: { userId: true, departmentId: true, nivel: true } })
const chefes = await prisma.user.findMany({ where: { id: { in: [...new Set(vinculos.map((v) => v.userId))] }, role: { not: 'ADMIN' }, active: true }, select: sel })
const nivelEm = (uid: string, dep: string | null) => vinculos.find((v) => v.userId === uid && v.departmentId === dep)?.nivel

for (const c of chefes) {
  const meus = vinculos.filter((v) => v.userId === c.id).map((v) => v.departmentId)
  confere(`${c.name} lê o próprio`, await req(c, `/api/disc?id=${c.id}`), 403)

  // um colaborador comum de um setor que ele chefia
  const col = await prisma.user.findFirst({
    where: { ...equipe, departmentId: { in: meus }, id: { notIn: vinculos.map((v) => v.userId) } }, select: sel,
  })
  if (col) {
    confere(`${c.name} lê ${col.name} (do setor que chefia)`, await req(c, `/api/disc?id=${col.id}`), 200)
    confere(`${c.name} vê o cartão do setor`, await req(c, `/api/disc/setor?dept=${col.departmentId}`), 200)
  }
  // alguém de um setor que ele NÃO chefia
  const fora = await prisma.user.findFirst({ where: { ...equipe, departmentId: { notIn: meus, not: null } }, select: sel })
  if (fora) {
    confere(`${c.name} lê ${fora.name} (outro setor)`, await req(c, `/api/disc?id=${fora.id}`), 403)
    confere(`${c.name} abre o cartão de outro setor`, await req(c, `/api/disc/setor?dept=${fora.departmentId}`), 403)
    // POST válido de quem não é da régua: 403, sem gravar
    confere(`${c.name} registra em outro setor`, await req(c, '/api/disc', { method: 'POST', body: JSON.stringify({ id: fora.id, d: 10, i: 10, s: 10, c: 10, aplicadoEm: '2026-09-10' }) }), 403)
  }
  // sub-encarregado × gestor do mesmo setor
  for (const dep of meus) {
    if (nivelEm(c.id, dep) !== 'sub') continue
    const gestores = vinculos.filter((v) => v.departmentId === dep && v.nivel === 'gestor' && v.userId !== c.id)
    for (const g of gestores) {
      const gu = await prisma.user.findUnique({ where: { id: g.userId }, select: sel })
      if (gu?.departmentId === dep) confere(`${c.name} (sub) lê o gestor ${gu.name}`, await req(c, `/api/disc?id=${gu.id}`), 403)
    }
  }
  confere(`${c.name} abre o DISC da casa`, await req(c, '/api/disc/grupo'), 403)
}

// colaborador comum
const colabs = await prisma.user.findMany({ where: { ...equipe, role: 'COLABORADOR', id: { notIn: vinculos.map((v) => v.userId) } }, select: sel, take: 5 })
for (const u of colabs) {
  confere(`colaborador ${u.name} lê o próprio`, await req(u, `/api/disc?id=${u.id}`), [401, 403])
  const colega = await prisma.user.findFirst({ where: { ...equipe, departmentId: u.departmentId, id: { not: u.id } }, select: sel })
  if (colega) confere(`colaborador ${u.name} lê o colega ${colega.name}`, await req(u, `/api/disc?id=${colega.id}`), [401, 403])
}

// ADMIN (Diretoria/T.I)
const admins = await prisma.user.findMany({ where: { role: 'ADMIN', active: true }, select: sel, take: 3 })
const qualquer = await prisma.user.findFirst({ where: equipe, select: sel })
for (const a of admins) {
  if (qualquer) confere(`admin ${a.name} lê ${qualquer.name}`, await req(a, `/api/disc?id=${qualquer.id}`), 200)
  confere(`admin ${a.name} abre o DISC da casa`, await req(a, '/api/disc/grupo'), 200)
  if (qualquer) {
    confere(`admin: nota 101 recusada`, await req(a, '/api/disc', { method: 'POST', body: JSON.stringify({ id: qualquer.id, d: 101, i: 0, s: 0, c: 0, aplicadoEm: '2026-09-10' }) }), 400)
    confere(`admin: tudo zero recusado`, await req(a, '/api/disc', { method: 'POST', body: JSON.stringify({ id: qualquer.id, d: 0, i: 0, s: 0, c: 0, aplicadoEm: '2026-09-10' }) }), 400)
    confere(`admin: data no futuro recusada`, await req(a, '/api/disc', { method: 'POST', body: JSON.stringify({ id: qualquer.id, d: 1, i: 0, s: 0, c: 0, aplicadoEm: '2099-01-01' }) }), 400)
  }
}

const depois = await prisma.discResultado.count()
if (depois !== antes) erros.push(`✗ O ENSAIO GRAVOU: ${antes} → ${depois} linhas`)
console.log(`${chefes.length} chefes, ${colabs.length} colaboradores, ${admins.length} admins — ${ok} conferidos, ${erros.length} falhas`)
for (const e of erros) console.log(e)
await prisma.$disconnect()
process.exit(erros.length ? 1 : 0)
