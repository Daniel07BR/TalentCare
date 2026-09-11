// ENSAIO dos CHAMADOS ENTRE SETORES clicáveis (11/09/2026). Não escreve nada.
//   node --env-file=.env scripts/ensaio-chamados-setor.mjs
//
// O cartão "Chamados entre setores" do relatório do setor sai do ESPELHO
// (`chat_dept_daily`); a janela que ele abre sai do Chat Interno, AO VIVO
// (`/api/integrations/talent-setor`, via `/api/chat-setor`). São duas contas da
// mesma pergunta — o jeito de a janela mentir é divergir do número em que se
// clicou. Para cada setor, em três janelas, confere que as cinco listas têm o
// tamanho das cinco colunas do espelho. E a porta: a Diretoria abre, o gestor
// abre o dele e recebe 403 no do vizinho.
//
// ⚠️ O espelho atualiza de hora em hora (cron :35); rodado logo depois de um
// chamado novo, o dia de hoje pode divergir em 1 — por isso as janelas fecham ONTEM.
import { PrismaClient } from '@prisma/client'
import { encode } from 'next-auth/jwt'

const prisma = new PrismaClient()
const BASE = 'http://127.0.0.1:8082'
const ontem = new Date(Date.now() - 86400_000 - 3 * 3600_000).toISOString().slice(0, 10) // dia de SP
const menos = (d, n) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() - n); return x.toISOString().slice(0, 10) }
const JANELAS = [['30 dias', menos(ontem, 29), ontem], ['agosto', '2026-08-01', '2026-08-31'], ['desde o início', '2026-01-01', ontem]]

const cookieDe = async (u) => encode({
  token: { sub: u.id, role: u.role, departmentName: null, checadoEm: Date.now() },
  secret: process.env.AUTH_SECRET, salt: 'authjs.session-token',
})
const bate = (path, token) => fetch(`${BASE}${path}`, { headers: { cookie: `authjs.session-token=${token}` }, redirect: 'manual' })

let falhas = 0, ok = 0
const conta = (cond, texto) => { if (cond) ok++; else { falhas++; console.log('   ❌ ' + texto) } }

const setores = await prisma.department.findMany({ where: { nexusDepartmentId: { not: null } }, select: { id: true, name: true, nexusDepartmentId: true } })
for (const [nome, de, ate] of JANELAS) {
  let comChamado = 0
  for (const s of setores) {
    const esp = await prisma.chatDeptDaily.aggregate({
      where: { nexusDepartmentId: s.nexusDepartmentId, day: { gte: de, lte: ate } },
      _sum: { pedidosAbertos: true, pedidosConcluidos: true, recebidosAbertos: true, recebidosConcluidos: true, recebidosCancelados: true },
    })
    const e = esp._sum
    const qs = new URLSearchParams({ nexusDepartmentId: s.nexusDepartmentId, fromDay: de, toDay: ate })
    const r = await fetch(`${process.env.CHAT_BASE_URL}/api/integrations/talent-setor?${qs}`, { headers: { 'x-api-key': process.env.CHAT_API_KEY } })
    if (!r.ok) { conta(false, `${s.name} ${nome}: Chat respondeu ${r.status}`); continue }
    const d = await r.json()
    const pares = [['pediu', e.pedidosAbertos], ['pediuConcluidos', e.pedidosConcluidos], ['recebeu', e.recebidosAbertos], ['concluiu', e.recebidosConcluidos], ['cancelados', e.recebidosCancelados]]
    if (pares.some(([, v]) => (v ?? 0) > 0) || pares.some(([k]) => d[k].length > 0)) comChamado++
    for (const [k, v] of pares) conta(d[k].length === (v ?? 0), `${s.name} · ${nome} · ${k}: lista ${d[k].length} × cartão ${v ?? 0}`)
    // Nenhum item fora da face: o setor tem de ser a origem (pediu) ou o destino (recebeu).
    for (const k of ['pediu', 'pediuConcluidos']) conta(d[k].every((t) => t.origem.nexusDepartmentId === s.nexusDepartmentId), `${s.name} · ${nome} · ${k} com origem de outro setor`)
    for (const k of ['recebeu', 'concluiu', 'cancelados']) conta(d[k].every((t) => t.destino.nexusDepartmentId === s.nexusDepartmentId), `${s.name} · ${nome} · ${k} com destino de outro setor`)
  }
  console.log(`── ${nome} (${de} a ${ate}): ${setores.length} setores, ${comChamado} com chamado`)
}

// A porta, com sessão de verdade.
const diretor = await prisma.user.findFirst({ where: { role: 'ADMIN', leftAt: null }, select: { id: true, role: true } })
const alvo = setores[0]
if (diretor) {
  const r = await bate(`/api/chat-setor?id=${alvo.id}&period=30d`, await cookieDe(diretor))
  conta(r.status === 200, `Diretoria em /api/chat-setor: HTTP ${r.status}`)
}
// ⚠️ Um GESTOR de verdade: o primeiro vínculo pode ser de um diretor, que abre tudo.
const gestorId = (await prisma.user.findFirst({ where: { role: 'GESTOR', leftAt: null, id: { in: (await prisma.setorAvaliador.findMany({ select: { userId: true } })).map((v) => v.userId) } }, select: { id: true } }))?.id
const vinc = gestorId ? await prisma.setorAvaliador.findFirst({ where: { userId: gestorId }, select: { userId: true, departmentId: true } }) : null
if (vinc) {
  const g = await prisma.user.findUnique({ where: { id: vinc.userId }, select: { id: true, role: true, departmentId: true } })
  const meus = new Set((await prisma.setorAvaliador.findMany({ where: { userId: g.id }, select: { departmentId: true } })).map((v) => v.departmentId))
  const alheio = setores.find((s) => !meus.has(s.id) && s.id !== g.departmentId)
  const tk = await cookieDe(g)
  conta((await bate(`/api/chat-setor?id=${vinc.departmentId}&period=30d`, tk)).status === 200, 'gestor no próprio setor: esperado 200')
  if (alheio) conta((await bate(`/api/chat-setor?id=${alheio.id}&period=30d`, tk)).status === 403, `gestor no setor alheio (${alheio.name}): esperado 403`)
}

console.log(`${falhas ? '❌' : '✅'} ${ok + falhas} conferências, ${falhas} divergências`)
await prisma.$disconnect()
process.exit(falhas ? 1 : 0)
