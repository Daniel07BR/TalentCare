// Sync dos CHAMADOS ATENDIDOS (Nexus, .75) → TalentCare (04/11/2026).
// Rode: node --env-file=.env run-melhorias-sync.mjs
//
// Lê `GET /api/integrations/chamados/atendidos?from&to` e TROCA o histórico inteiro em
// `melhorias_daily`, numa transação: o Chat reenvia um chamado corrigido (outra classificação,
// outra pessoa), e upsert deixaria o número velho no dia que ficou vazio. São poucas linhas.
// ⚠️ FREIO: resposta vazia com espelho cheio é problema LÁ — não apaga nada.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = process.env.NEXUS_BASE_URL
const KEY = process.env.NEXUS_API_KEY
const INICIO = '2020-01-01'

const n = (v) => Math.max(0, Math.round(Number(v) || 0))
const diaSP = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d)

async function main() {
  if (!BASE || !KEY) throw new Error('NEXUS_BASE_URL/NEXUS_API_KEY ausentes no .env')
  const to = diaSP(new Date())
  const res = await fetch(`${BASE}/api/integrations/chamados/atendidos?${new URLSearchParams({ from: INICIO, to })}`, { headers: { 'X-API-Key': KEY } })
  if (!res.ok) throw new Error(`Nexus ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const linhas = (data.linhas ?? []).filter((r) => r.nexusUserId && r.dia).map((r) => ({
    nexusUserId: r.nexusUserId, day: r.dia, erros: n(r.erros), melhorias: n(r.melhorias), criacoes: n(r.criacoes),
  }))
  const antes = await prisma.melhoriasDaily.count()
  if (linhas.length === 0 && antes > 0) {
    console.log(JSON.stringify({ freio: `fonte vazia e o espelho tem ${antes} linhas — nada trocado` }))
    return
  }
  await prisma.$transaction([
    prisma.melhoriasDaily.deleteMany({}),
    prisma.melhoriasDaily.createMany({ data: linhas }),
  ])
  console.log(JSON.stringify({ to, linhas: linhas.length, antes }))
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
