import { prisma } from '@/lib/db/prisma'

// Ingestão das métricas reais do ClassRoom (frente B, 1ª integração).
// Pull S2S: o TalentCare puxa por nexus_user_id e espelha em classroom_stats.
const BASE = process.env.CLASSROOM_BASE_URL!
const KEY = process.env.CLASSROOM_INTEGRATION_KEY!

interface ClassroomUser {
  nexusUserId: string
  videosCompleted: number
  coursesCompleted: number
  coursesCreated: number
}
interface ClassroomResponse {
  ok: boolean
  totals: { videosCompleted: number; coursesCompleted: number; coursesCreated: number; coursesTotal: number; videosTotal: number }
  users: ClassroomUser[]
}

export interface ClassroomSyncResult {
  synced: number
  totals: ClassroomResponse['totals'] | null
  errors: string[]
}

export async function syncClassroom(): Promise<ClassroomSyncResult> {
  const result: ClassroomSyncResult = { synced: 0, totals: null, errors: [] }
  const res = await fetch(`${BASE}/api/integrations/talent-metrics`, {
    headers: { 'x-integration-key': KEY },
    cache: 'no-store',
  })
  if (!res.ok) {
    result.errors.push(`ClassRoom API ${res.status}: ${await res.text()}`)
    return result
  }
  const data = (await res.json()) as ClassroomResponse
  result.totals = data.totals

  for (const u of data.users) {
    if (!u.nexusUserId) continue
    try {
      await prisma.classroomStat.upsert({
        where: { nexusUserId: u.nexusUserId },
        create: {
          nexusUserId: u.nexusUserId,
          videosCompleted: u.videosCompleted,
          coursesCompleted: u.coursesCompleted,
          coursesCreated: u.coursesCreated,
        },
        update: {
          videosCompleted: u.videosCompleted,
          coursesCompleted: u.coursesCompleted,
          coursesCreated: u.coursesCreated,
        },
      })
      result.synced++
    } catch (e) {
      result.errors.push(`${u.nexusUserId}: ${(e as Error).message}`)
    }
  }
  return result
}
