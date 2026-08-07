// Sync incremental do espelho diário da Gerência → TalentCare (CLI p/ cron).
// Rode: node --env-file=.env run-gerencia-sync.mjs
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = process.env.GERENCIA_BASE_URL
const KEY = process.env.GERENCIA_API_KEY
const SOURCE = 'gerencia'

function startOfDayMinusOne(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - 1)
  return x
}

const n = (v) => Number(v) || 0

async function main() {
  const now = new Date()
  const wm = await prisma.syncWatermark.findUnique({ where: { source: SOURCE } })
  const from = wm ? startOfDayMinusOne(wm.lastSyncedAt) : null

  const qs = new URLSearchParams({ to: now.toISOString() })
  if (from) qs.set('from', from.toISOString())
  const res = await fetch(`${BASE}/integrations/talent-daily?${qs.toString()}`, {
    headers: { 'X-API-Key': KEY },
  })
  if (!res.ok) throw new Error(`Gerencia ${res.status}: ${await res.text()}`)
  const data = await res.json()

  let synced = 0
  for (const r of data.days) {
    if (!r.userId || !r.day) continue
    const row = {
      servicos: n(r.servicos),
      km: n(r.km),
      viagens: n(r.viagens),
      jornadaMin: n(r.jornadaMin),
      protAbertos: n(r.protAbertos),
      protAprovados: n(r.protAprovados),
      servCriados: n(r.servCriados),
      reagendados: n(r.reagendados),
      cancelados: n(r.cancelados),
      datasAlteradas: n(r.datasAlteradas),
    }
    await prisma.gerenciaDaily.upsert({
      where: { nexusUserId_day: { nexusUserId: r.userId, day: r.day } },
      create: { nexusUserId: r.userId, day: r.day, ...row },
      update: row,
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
