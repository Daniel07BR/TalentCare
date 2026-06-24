// Sync incremental do espelho diário do ClassRoom → TalentCare (CLI p/ cron).
// Rode: node --env-file=.env run-classroom-sync.mjs
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = process.env.CLASSROOM_BASE_URL
const KEY = process.env.CLASSROOM_INTEGRATION_KEY
const SOURCE = 'classroom'

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
  const res = await fetch(`${BASE}/api/integrations/talent-metrics-daily?${qs.toString()}`, { headers: { 'x-integration-key': KEY } })
  if (!res.ok) throw new Error(`ClassRoom ${res.status}: ${await res.text()}`)
  const data = await res.json()

  let synced = 0
  for (const r of data.days) {
    if (!r.nexusUserId || !r.day) continue
    const videos = Number(r.videos) || 0
    const courses = Number(r.courses) || 0
    const created = Number(r.created) || 0
    await prisma.classroomDaily.upsert({
      where: { nexusUserId_day: { nexusUserId: r.nexusUserId, day: r.day } },
      create: { nexusUserId: r.nexusUserId, day: r.day, videos, courses, created },
      update: { videos, courses, created },
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
