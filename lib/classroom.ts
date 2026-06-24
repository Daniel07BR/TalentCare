import { prisma } from '@/lib/db/prisma'

// Espelho diário do ClassRoom (.71), modelo igual ao da rádio/whatsapp: pull
// incremental por (usuário, dia) a partir do watermark; upsert SET → idempotente.
const BASE = process.env.CLASSROOM_BASE_URL!
const KEY = process.env.CLASSROOM_INTEGRATION_KEY!
const SOURCE = 'classroom'

interface DailyRow {
  nexusUserId: string
  day: string
  videos: number | string
  courses: number | string
  created: number | string
}

export interface ClassroomSyncResult {
  synced: number
  from: string | null
  to: string
  errors: string[]
}

function startOfDayMinusOne(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - 1)
  return x
}

export async function syncClassroom(): Promise<ClassroomSyncResult> {
  const now = new Date()
  const wm = await prisma.syncWatermark.findUnique({ where: { source: SOURCE } })
  const from = wm ? startOfDayMinusOne(wm.lastSyncedAt) : null
  const result: ClassroomSyncResult = { synced: 0, from: from ? from.toISOString() : null, to: now.toISOString(), errors: [] }

  const qs = new URLSearchParams({ to: now.toISOString() })
  if (from) qs.set('from', from.toISOString())
  const res = await fetch(`${BASE}/api/integrations/talent-metrics-daily?${qs.toString()}`, {
    headers: { 'x-integration-key': KEY },
    cache: 'no-store',
  })
  if (!res.ok) {
    result.errors.push(`ClassRoom API ${res.status}: ${await res.text()}`)
    return result
  }
  const data = (await res.json()) as { days: DailyRow[] }

  for (const r of data.days) {
    if (!r.nexusUserId || !r.day) continue
    const videos = Number(r.videos) || 0
    const courses = Number(r.courses) || 0
    const created = Number(r.created) || 0
    try {
      await prisma.classroomDaily.upsert({
        where: { nexusUserId_day: { nexusUserId: r.nexusUserId, day: r.day } },
        create: { nexusUserId: r.nexusUserId, day: r.day, videos, courses, created },
        update: { videos, courses, created }, // SET → idempotente
      })
      result.synced++
    } catch (e) {
      result.errors.push(`${r.nexusUserId}/${r.day}: ${(e as Error).message}`)
    }
  }

  await prisma.syncWatermark.upsert({
    where: { source: SOURCE },
    create: { source: SOURCE, lastSyncedAt: now },
    update: { lastSyncedAt: now },
  })
  return result
}
