import { prisma } from '@/lib/db/prisma'

// Ingestão das métricas reais da Rádio Itamarathy (frente B), modelo ESPELHO
// DIÁRIO + sync INCREMENTAL idempotente:
//   - puxa do .68 o uso por (usuário, dia) a partir do último watermark;
//   - upsert SET por (usuário, dia) em radio_daily → re-rodar não duplica;
//   - avança o watermark. Filtros de período depois somam radio_daily localmente.
const BASE = process.env.RADIO_BASE_URL!
const KEY = process.env.RADIO_API_KEY!
const SOURCE = 'radio'

interface DailyRow {
  userId: string
  day: string // YYYY-MM-DD
  totalSeconds: number | string
  sessions: number | string
}

export interface RadioSyncResult {
  synced: number // linhas (usuário×dia) atualizadas
  from: string | null
  to: string
  errors: string[]
}

function startOfDayMinusOne(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - 1) // margem de 1 dia p/ pegar sessões que cruzam o limite
  return x
}

export async function syncRadio(): Promise<RadioSyncResult> {
  const now = new Date()
  const wm = await prisma.syncWatermark.findUnique({ where: { source: SOURCE } })
  // Incremental: do dia do watermark (−1) p/ frente. Sem watermark = backfill total.
  const from = wm ? startOfDayMinusOne(wm.lastSyncedAt) : null
  const result: RadioSyncResult = { synced: 0, from: from ? from.toISOString() : null, to: now.toISOString(), errors: [] }

  const qs = new URLSearchParams({ to: now.toISOString() })
  if (from) qs.set('from', from.toISOString())
  const res = await fetch(`${BASE}/api/integrations/usage-daily?${qs.toString()}`, {
    headers: { 'X-API-Key': KEY },
    cache: 'no-store',
  })
  if (!res.ok) {
    result.errors.push(`Radio API ${res.status}: ${await res.text()}`)
    return result
  }
  const data = (await res.json()) as { days: DailyRow[] }

  for (const r of data.days) {
    if (!r.userId || !r.day) continue
    const seconds = Number(r.totalSeconds) || 0
    const sessions = Number(r.sessions) || 0
    try {
      await prisma.radioDaily.upsert({
        where: { nexusUserId_day: { nexusUserId: r.userId, day: r.day } },
        create: { nexusUserId: r.userId, day: r.day, seconds, sessions },
        update: { seconds, sessions }, // SET (não soma) → idempotente
      })
      result.synced++
    } catch (e) {
      result.errors.push(`${r.userId}/${r.day}: ${(e as Error).message}`)
    }
  }

  // Avança o watermark só se o pull foi ok.
  await prisma.syncWatermark.upsert({
    where: { source: SOURCE },
    create: { source: SOURCE, lastSyncedAt: now },
    update: { lastSyncedAt: now },
  })
  return result
}
