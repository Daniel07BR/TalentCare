import { prisma } from '@/lib/db/prisma'

// Ingestão das métricas reais do Consultoria Plus (frente B), modelo ESPELHO
// DIÁRIO + sync INCREMENTAL idempotente (igual rádio/classroom):
//   - puxa do .68 a atividade por (usuário, dia) a partir do último watermark;
//   - upsert SET por (usuário, dia) em consultoria_daily → re-rodar não duplica;
//   - avança o watermark. Filtros de período depois somam consultoria_daily local.
const BASE = process.env.CONSULTORIA_BASE_URL!
const KEY = process.env.CONSULTORIA_API_KEY!
const SOURCE = 'consultoria'

interface DailyRow {
  userId: string
  day: string // YYYY-MM-DD
  studies: number | string
  tickets: number | string
  messages: number | string
  comments: number | string
}

export interface ConsultoriaSyncResult {
  synced: number // linhas (usuário×dia) atualizadas
  from: string | null
  to: string
  errors: string[]
}

function startOfDayMinusOne(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - 1) // margem de 1 dia p/ pegar eventos no limite do fuso
  return x
}

export async function syncConsultoria(): Promise<ConsultoriaSyncResult> {
  const now = new Date()
  const wm = await prisma.syncWatermark.findUnique({ where: { source: SOURCE } })
  // Incremental: do dia do watermark (−1) p/ frente. Sem watermark = backfill total.
  const from = wm ? startOfDayMinusOne(wm.lastSyncedAt) : null
  const result: ConsultoriaSyncResult = {
    synced: 0,
    from: from ? from.toISOString() : null,
    to: now.toISOString(),
    errors: [],
  }

  const qs = new URLSearchParams({ to: now.toISOString() })
  if (from) qs.set('from', from.toISOString())
  const res = await fetch(`${BASE}/api/integrations/consultoria-daily?${qs.toString()}`, {
    headers: { 'X-API-Key': KEY },
    cache: 'no-store',
  })
  if (!res.ok) {
    result.errors.push(`Consultoria API ${res.status}: ${await res.text()}`)
    return result
  }
  const data = (await res.json()) as { days: DailyRow[] }

  for (const r of data.days) {
    if (!r.userId || !r.day) continue
    const studies = Number(r.studies) || 0
    const tickets = Number(r.tickets) || 0
    const messages = Number(r.messages) || 0
    const comments = Number(r.comments) || 0
    try {
      await prisma.consultoriaDaily.upsert({
        where: { nexusUserId_day: { nexusUserId: r.userId, day: r.day } },
        create: { nexusUserId: r.userId, day: r.day, studies, tickets, messages, comments },
        update: { studies, tickets, messages, comments }, // SET (não soma) → idempotente
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
