import { prisma } from '@/lib/db/prisma'

// Ingestão das métricas reais da GERÊNCIA (mensageria), modelo ESPELHO DIÁRIO +
// sync INCREMENTAL idempotente (igual às demais fontes).
//
// A Gerência tem DUAS faces e as duas vêm na mesma linha:
//   execução  — serviços concluídos, km, viagens, jornada (quem sai na rua)
//   escritório — protocolos abertos/aprovados/reagendados/cancelados e
//                serviços criados (qualquer funcionário que demanda)
// Elas coexistem de propósito: fora Elton e Gilberto (os mensageiros de hoje),
// várias pessoas de outros cargos fazem saída externa eventual.
const BASE = process.env.GERENCIA_BASE_URL!
const KEY = process.env.GERENCIA_API_KEY!
const SOURCE = 'gerencia'

interface DailyRow {
  userId: string
  day: string // YYYY-MM-DD
  servicos: number | string
  km: number | string
  viagens: number | string
  jornadaMin: number | string
  protAbertos: number | string
  protAprovados: number | string
  servCriados: number | string
  reagendados: number | string
  cancelados: number | string
  datasAlteradas: number | string
}

export interface GerenciaSyncResult {
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

const n = (v: number | string | undefined): number => Number(v) || 0

export async function syncGerencia(): Promise<GerenciaSyncResult> {
  const now = new Date()
  const wm = await prisma.syncWatermark.findUnique({ where: { source: SOURCE } })
  const from = wm ? startOfDayMinusOne(wm.lastSyncedAt) : null
  const result: GerenciaSyncResult = {
    synced: 0,
    from: from ? from.toISOString() : null,
    to: now.toISOString(),
    errors: [],
  }

  const qs = new URLSearchParams({ to: now.toISOString() })
  if (from) qs.set('from', from.toISOString())
  const res = await fetch(`${BASE}/integrations/talent-daily?${qs.toString()}`, {
    headers: { 'X-API-Key': KEY },
    cache: 'no-store',
  })
  if (!res.ok) {
    result.errors.push(`Gerencia API ${res.status}: ${await res.text()}`)
    return result
  }
  const data = (await res.json()) as { days: DailyRow[] }

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
    try {
      await prisma.gerenciaDaily.upsert({
        where: { nexusUserId_day: { nexusUserId: r.userId, day: r.day } },
        create: { nexusUserId: r.userId, day: r.day, ...row },
        update: row, // SET → idempotente
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
