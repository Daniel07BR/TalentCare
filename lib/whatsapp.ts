import { prisma } from '@/lib/db/prisma'

// Espelho diário do WhatsApp/OneCode (Painel .70), modelo igual ao da rádio:
// pull incremental por (departamento, dia) a partir do watermark; upsert SET →
// idempotente. Filtros de período somam whatsapp_daily localmente.
const BASE = process.env.PAINEL_BASE_URL!
const KEY = process.env.PAINEL_API_KEY!
const SOURCE = 'whatsapp'

interface DailyRow {
  dept: string
  day: string
  abertos: number | string
  color: string | null
}

export interface WhatsappSyncResult {
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

export async function syncWhatsapp(): Promise<WhatsappSyncResult> {
  const now = new Date()
  const wm = await prisma.syncWatermark.findUnique({ where: { source: SOURCE } })
  const from = wm ? startOfDayMinusOne(wm.lastSyncedAt) : null
  const result: WhatsappSyncResult = { synced: 0, from: from ? from.toISOString() : null, to: now.toISOString(), errors: [] }

  const qs = new URLSearchParams({ to: now.toISOString() })
  if (from) qs.set('from', from.toISOString())
  const res = await fetch(`${BASE}/api/integrations/whatsapp-by-department-daily?${qs.toString()}`, {
    headers: { 'X-API-Key': KEY },
    cache: 'no-store',
  })
  if (!res.ok) {
    result.errors.push(`Painel API ${res.status}: ${await res.text()}`)
    return result
  }
  const data = (await res.json()) as { days: DailyRow[] }

  for (const r of data.days) {
    if (!r.dept || !r.day) continue
    const abertos = Number(r.abertos) || 0
    try {
      await prisma.whatsappDaily.upsert({
        where: { dept_day: { dept: r.dept, day: r.day } },
        create: { dept: r.dept, day: r.day, abertos, color: r.color ?? null },
        update: { abertos, color: r.color ?? null }, // SET → idempotente
      })
      result.synced++
    } catch (e) {
      result.errors.push(`${r.dept}/${r.day}: ${(e as Error).message}`)
    }
  }

  await prisma.syncWatermark.upsert({
    where: { source: SOURCE },
    create: { source: SOURCE, lastSyncedAt: now },
    update: { lastSyncedAt: now },
  })
  return result
}
