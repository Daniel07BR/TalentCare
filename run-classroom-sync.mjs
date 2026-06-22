// Sync das métricas do ClassRoom → TalentCare (CLI). Rode: node --env-file=.env run-classroom-sync.mjs
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = process.env.CLASSROOM_BASE_URL
const KEY = process.env.CLASSROOM_INTEGRATION_KEY

async function main() {
  const res = await fetch(`${BASE}/api/integrations/talent-metrics`, { headers: { 'x-integration-key': KEY } })
  if (!res.ok) throw new Error(`ClassRoom ${res.status}: ${await res.text()}`)
  const data = await res.json()
  let synced = 0
  for (const u of data.users) {
    if (!u.nexusUserId) continue
    await prisma.classroomStat.upsert({
      where: { nexusUserId: u.nexusUserId },
      create: { nexusUserId: u.nexusUserId, videosCompleted: u.videosCompleted, coursesCompleted: u.coursesCompleted, coursesCreated: u.coursesCreated },
      update: { videosCompleted: u.videosCompleted, coursesCompleted: u.coursesCompleted, coursesCreated: u.coursesCreated },
    })
    synced++
  }
  console.log(JSON.stringify({ synced, totals: data.totals }))
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
