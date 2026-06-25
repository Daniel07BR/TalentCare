// Sync incremental do espelho diário do HelpDesk → TalentCare (CLI p/ cron).
// Rode: node --env-file=.env run-helpdesk-sync.mjs
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = process.env.HELPDESK_BASE_URL
const KEY = process.env.HELPDESK_API_KEY
const SOURCE = 'helpdesk'

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
  const res = await fetch(`${BASE}/api/integrations/helpdesk-daily?${qs.toString()}`, { headers: { 'X-API-Key': KEY } })
  if (!res.ok) throw new Error(`HelpDesk ${res.status}: ${await res.text()}`)
  const data = await res.json()

  let synced = 0
  for (const r of data.days) {
    if (!r.userId || !r.day) continue
    const opened = Number(r.opened) || 0
    const resolved = Number(r.resolved) || 0
    const resolvedSeconds = Math.round(Number(r.resolvedSeconds) || 0)
    await prisma.helpdeskDaily.upsert({
      where: { nexusUserId_day: { nexusUserId: r.userId, day: r.day } },
      create: { nexusUserId: r.userId, day: r.day, opened, resolved, resolvedSeconds },
      update: { opened, resolved, resolvedSeconds },
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
