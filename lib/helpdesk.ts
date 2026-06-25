import { prisma } from '@/lib/db/prisma'

// Ingestão das métricas reais do HelpDesk (frente B), modelo ESPELHO DIÁRIO +
// sync INCREMENTAL idempotente (igual rádio/classroom/consultoria):
//   - puxa do .77 a atividade por (usuário, dia) a partir do último watermark;
//   - upsert SET por (usuário, dia) em helpdesk_daily → re-rodar não duplica;
//   - avança o watermark. Filtros de período depois somam helpdesk_daily local.
const BASE = process.env.HELPDESK_BASE_URL!
const KEY = process.env.HELPDESK_API_KEY!
const SOURCE = 'helpdesk'

interface DailyRow {
  userId: string
  day: string // YYYY-MM-DD
  opened: number | string
  resolved: number | string
  formalized: number | string
  resolvedSeconds: number | string
}

export interface HelpdeskSyncResult {
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

export async function syncHelpdesk(): Promise<HelpdeskSyncResult> {
  const now = new Date()
  const wm = await prisma.syncWatermark.findUnique({ where: { source: SOURCE } })
  const from = wm ? startOfDayMinusOne(wm.lastSyncedAt) : null
  const result: HelpdeskSyncResult = {
    synced: 0,
    from: from ? from.toISOString() : null,
    to: now.toISOString(),
    errors: [],
  }

  const qs = new URLSearchParams({ to: now.toISOString() })
  if (from) qs.set('from', from.toISOString())
  const res = await fetch(`${BASE}/api/integrations/helpdesk-daily?${qs.toString()}`, {
    headers: { 'X-API-Key': KEY },
    cache: 'no-store',
  })
  if (!res.ok) {
    result.errors.push(`HelpDesk API ${res.status}: ${await res.text()}`)
    return result
  }
  const data = (await res.json()) as { days: DailyRow[] }

  for (const r of data.days) {
    if (!r.userId || !r.day) continue
    const opened = Number(r.opened) || 0
    const resolved = Number(r.resolved) || 0
    const formalized = Number(r.formalized) || 0
    const resolvedSeconds = Math.round(Number(r.resolvedSeconds) || 0)
    try {
      await prisma.helpdeskDaily.upsert({
        where: { nexusUserId_day: { nexusUserId: r.userId, day: r.day } },
        create: { nexusUserId: r.userId, day: r.day, opened, resolved, formalized, resolvedSeconds },
        update: { opened, resolved, formalized, resolvedSeconds }, // SET → idempotente
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
