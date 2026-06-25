// Sync incremental do espelho diário do Consultoria Plus → TalentCare (CLI p/ cron).
// Rode: node --env-file=.env run-consultoria-sync.mjs
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = process.env.CONSULTORIA_BASE_URL
const KEY = process.env.CONSULTORIA_API_KEY
const SOURCE = 'consultoria'

function startOfDayMinusOne(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - 1)
  return x
}

async function main() {
  const now = new Date()
  const wm = await prisma.syncWatermark.findUnique({ where: { source: SOURCE } })
  const from = wm ? startOfDayMinusOne(wm.lastSyncedAt) : null

  const qs = new URLSearchParams({ to: now.toISOString() })
  if (from) qs.set('from', from.toISOString())
  const res = await fetch(`${BASE}/api/integrations/consultoria-daily?${qs.toString()}`, { headers: { 'X-API-Key': KEY } })
  if (!res.ok) throw new Error(`Consultoria ${res.status}: ${await res.text()}`)
  const data = await res.json()

  let synced = 0
  for (const r of data.days) {
    if (!r.userId || !r.day) continue
    const studies = Number(r.studies) || 0
    const tickets = Number(r.tickets) || 0
    const messages = Number(r.messages) || 0
    const comments = Number(r.comments) || 0
    await prisma.consultoriaDaily.upsert({
      where: { nexusUserId_day: { nexusUserId: r.userId, day: r.day } },
      create: { nexusUserId: r.userId, day: r.day, studies, tickets, messages, comments },
      update: { studies, tickets, messages, comments },
    })
    synced++
  }
  await prisma.syncWatermark.upsert({
    where: { source: SOURCE },
    create: { source: SOURCE, lastSyncedAt: now },
    update: { lastSyncedAt: now },
  })
  console.log(JSON.stringify({ synced, from: from ? from.toISOString() : null, to: now.toISOString() }))
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
