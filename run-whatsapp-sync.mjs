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
  const res = await fetch(`${BASE}/api/integrations/whatsapp-overview-daily?${qs.toString()}`, { headers: { 'X-API-Key': KEY } })
  if (!res.ok) throw new Error(`Painel ${res.status}: ${await res.text()}`)
  const data = await res.json()

  let days = 0
  for (const r of data.days) {
    if (!r.dept || !r.day) continue
    const abertos = Number(r.abertos) || 0
    const finalizados = Number(r.finalizados) || 0
    const handleSum = Number(r.handleSum) || 0
    await prisma.whatsappDaily.upsert({
      where: { dept_day: { dept: r.dept, day: r.day } },
      create: { dept: r.dept, day: r.day, abertos, finalizados, handleSum, color: r.color ?? null },
      update: { abertos, finalizados, handleSum, color: r.color ?? null },
    })
    days++
  }
  let att = 0
  for (const a of data.attendants) {
    if (!a.dept || !a.name || !a.day) continue
    const abertos = Number(a.abertos) || 0
    const finalizados = Number(a.finalizados) || 0
    const handleSum = Number(a.handleSum) || 0
    await prisma.whatsappAttendantDaily.upsert({
      where: { dept_name_day: { dept: a.dept, name: a.name, day: a.day } },
      create: { dept: a.dept, name: a.name, day: a.day, abertos, finalizados, handleSum },
      update: { abertos, finalizados, handleSum },
    })
    att++
  }
  await prisma.whatsappSnapshot.upsert({
    where: { id: 1 },
    create: { id: 1, pendingNow: data.snapshot.pendingNow, openNow: data.snapshot.openNow },
    update: { pendingNow: data.snapshot.pendingNow, openNow: data.snapshot.openNow },
  })
  await prisma.syncWatermark.upsert({
    where: { source: SOURCE },
    create: { source: SOURCE, lastSyncedAt: now },
    update: { lastSyncedAt: now },
  })
  console.log(JSON.stringify({ days, att, snapshot: data.snapshot, from: from ? from.toISOString() : null, to: now.toISOString() }))
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
