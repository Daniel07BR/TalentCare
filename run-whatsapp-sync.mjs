// Sync incremental do espelho diário do WhatsApp → TalentCare (CLI p/ cron).
// Rode: node --env-file=.env run-whatsapp-sync.mjs
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = process.env.PAINEL_BASE_URL
const KEY = process.env.PAINEL_API_KEY
const SOURCE = 'whatsapp'

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
  const res = await fetch(`${BASE}/api/integrations/whatsapp-by-department-daily?${qs.toString()}`, { headers: { 'X-API-Key': KEY } })
  if (!res.ok) throw new Error(`Painel ${res.status}: ${await res.text()}`)
  const data = await res.json()

  let synced = 0
  for (const r of data.days) {
    if (!r.dept || !r.day) continue
    const abertos = Number(r.abertos) || 0
    await prisma.whatsappDaily.upsert({
      where: { dept_day: { dept: r.dept, day: r.day } },
      create: { dept: r.dept, day: r.day, abertos, color: r.color ?? null },
      update: { abertos, color: r.color ?? null },
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
