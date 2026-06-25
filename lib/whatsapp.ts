import { prisma } from '@/lib/db/prisma'

// Espelho diário do WhatsApp/OneCode (Painel .70). Pull incremental por dia a
// partir do watermark; upsert SET → idempotente. Popula: whatsapp_daily (abertos/
// finalizados/handleSum/cor por dept×dia), whatsapp_attendant_daily (abertos por
// atendente×dia) e whatsapp_snapshot (pendingNow/openNow "agora").
const BASE = process.env.PAINEL_BASE_URL!
const KEY = process.env.PAINEL_API_KEY!
const SOURCE = 'whatsapp'

interface DayRow { dept: string; day: string; abertos: number | string; finalizados: number | string; handleSum: number | string; color: string | null }
interface AttRow { dept: string; name: string; day: string; abertos: number | string }
interface Overview { days: DayRow[]; attendants: AttRow[]; snapshot: { pendingNow: number; openNow: number } }

export interface WhatsappSyncResult {
  syncedDays: number
  syncedAtt: number
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
  const result: WhatsappSyncResult = { syncedDays: 0, syncedAtt: 0, from: from ? from.toISOString() : null, to: now.toISOString(), errors: [] }

  const qs = new URLSearchParams({ to: now.toISOString() })
  if (from) qs.set('from', from.toISOString())
  const res = await fetch(`${BASE}/api/integrations/whatsapp-overview-daily?${qs.toString()}`, {
    headers: { 'X-API-Key': KEY },
    cache: 'no-store',
  })
  if (!res.ok) {
    result.errors.push(`Painel API ${res.status}: ${await res.text()}`)
    return result
  }
  const data = (await res.json()) as Overview

  for (const r of data.days) {
    if (!r.dept || !r.day) continue
    const abertos = Number(r.abertos) || 0
    const finalizados = Number(r.finalizados) || 0
    const handleSum = Number(r.handleSum) || 0
    try {
      await prisma.whatsappDaily.upsert({
        where: { dept_day: { dept: r.dept, day: r.day } },
        create: { dept: r.dept, day: r.day, abertos, finalizados, handleSum, color: r.color ?? null },
        update: { abertos, finalizados, handleSum, color: r.color ?? null },
      })
      result.syncedDays++
    } catch (e) {
      result.errors.push(`day ${r.dept}/${r.day}: ${(e as Error).message}`)
    }
  }

  for (const a of data.attendants) {
    if (!a.dept || !a.name || !a.day) continue
    const abertos = Number(a.abertos) || 0
    try {
      await prisma.whatsappAttendantDaily.upsert({
        where: { dept_name_day: { dept: a.dept, name: a.name, day: a.day } },
        create: { dept: a.dept, name: a.name, day: a.day, abertos },
        update: { abertos },
      })
      result.syncedAtt++
    } catch (e) {
      result.errors.push(`att ${a.dept}/${a.name}/${a.day}: ${(e as Error).message}`)
    }
  }

  // Snapshot "agora" (sempre o mais recente).
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
  return result
}
