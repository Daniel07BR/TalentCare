import { prisma } from '@/lib/db/prisma'

// Ingestão das métricas reais do CIDE (frente B), modelo ESPELHO DIÁRIO + sync
// INCREMENTAL idempotente (igual às demais fontes). Atividade = alterações
// registradas no CIDE, atribuídas por nexus_user_id × dia.
const BASE = process.env.CIDE_BASE_URL!
const KEY = process.env.CIDE_API_KEY!
const SOURCE = 'cide'

interface DailyRow {
  userId: string
  day: string // YYYY-MM-DD
  atividades: number | string
}

export interface CideSyncResult {
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

export async function syncCide(): Promise<CideSyncResult> {
  const now = new Date()
  const wm = await prisma.syncWatermark.findUnique({ where: { source: SOURCE } })
  const from = wm ? startOfDayMinusOne(wm.lastSyncedAt) : null
  const result: CideSyncResult = {
    synced: 0,
    from: from ? from.toISOString() : null,
    to: now.toISOString(),
    errors: [],
  }

  const qs = new URLSearchParams({ to: now.toISOString() })
  if (from) qs.set('from', from.toISOString())
  // CIDE autentica por X-API-Key (cg.api_consumers).
  const res = await fetch(`${BASE}/api/integrations/atividade-daily?${qs.toString()}`, {
    headers: { 'X-API-Key': KEY },
    cache: 'no-store',
  })
  if (!res.ok) {
    result.errors.push(`CIDE API ${res.status}: ${await res.text()}`)
    return result
  }
  const data = (await res.json()) as { days: DailyRow[] }

  for (const r of data.days) {
    if (!r.userId || !r.day) continue
    const atividades = Number(r.atividades) || 0
    try {
      await prisma.cideDaily.upsert({
        where: { nexusUserId_day: { nexusUserId: r.userId, day: r.day } },
        create: { nexusUserId: r.userId, day: r.day, atividades },
        update: { atividades }, // SET → idempotente
      })
      result.synced++
    } catch (e) {
      result.errors.push(`${r.userId}/${r.day}: ${(e as Error).message}`)
    }
  }

  await prisma.syncWatermark.upsert({
    where: { source: SOURCE },
    create: { source: SOURCE, lastSyncedAt: now },
    update: { lastSyncedAt: now },
  })
  return result
}
