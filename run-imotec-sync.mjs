// Sync das ATIVIDADES NO IMOTEC (.73) → TalentCare (04/11/2026).
// Rode: node --env-file=.env run-imotec-sync.mjs
//
// Lê `GET /api/integrations/talent-atividades?from&to` e TROCA o histórico inteiro em `imotec_daily`, numa
// transação. São poucas linhas, e a regra de contar mora no Imotec: mudou lá, o passado acompanha aqui.
// ⚠️ FREIO: resposta vazia com espelho cheio é problema LÁ — não apaga nada.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = process.env.IMOTEC_BASE_URL
const KEY = process.env.IMOTEC_API_KEY
const INICIO = '2026-10-01'

const diaSP = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d)

async function main() {
  if (!BASE || !KEY) throw new Error('IMOTEC_BASE_URL/IMOTEC_API_KEY ausentes no .env')
  const to = diaSP(new Date())
  const res = await fetch(`${BASE}/api/integrations/talent-atividades?${new URLSearchParams({ from: INICIO, to })}`, { headers: { 'x-api-key': KEY } })
  if (!res.ok) throw new Error(`Imotec ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const linhas = (data.linhas ?? []).filter((r) => r.nexusUserId && r.dia && r.acao && r.n > 0).map((r) => ({
    nexusUserId: r.nexusUserId, day: r.dia, acao: String(r.acao).slice(0, 40), n: Math.round(Number(r.n)),
  }))
  const antes = await prisma.imotecDaily.count()
  if (linhas.length === 0 && antes > 0) {
    console.log(JSON.stringify({ freio: `fonte vazia e o espelho tem ${antes} linhas — nada trocado` }))
    return
  }
  await prisma.$transaction([
    prisma.imotecDaily.deleteMany({}),
    prisma.imotecDaily.createMany({ data: linhas }),
  ])
  console.log(JSON.stringify({ to, linhas: linhas.length, antes }))
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
