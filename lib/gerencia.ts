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
  saidas: number | string
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
  removidos?: number
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

  const vistos = new Set<string>()
  for (const r of data.days) {
    if (!r.userId || !r.day) continue
    vistos.add(`${r.userId}|${r.day}`)
    const row = {
      servicos: n(r.servicos),
      km: n(r.km),
      saidas: n(r.saidas),
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


  // ⚠️ Linha que DEIXOU de existir na origem. O upsert só toca no que a fonte
  // devolve, então um dia que sumiu (mudou a definição da métrica, ou o registro
  // foi corrigido lá) fica congelado aqui para sempre — foi o que aconteceu com
  // os serviços fantasmas da importação: o endpoint parou de devolvê-los e o
  // espelho seguiu mostrando.
  //
  // Só roda em sync COMPLETO e só DEPOIS de todos os upserts terem dado certo,
  // então uma falha de rede nunca apaga nada. É seguro aqui (e só aqui) porque
  // gerencia_daily é 100% derivada da Gerência — diferente do espelho do
  // WhatsApp, onde a origem já perdeu história e a nossa cópia é a melhor.
  if (!from && result.errors.length === 0 && vistos.size > 0) {
    const dias = [...vistos].map((k) => k.slice(k.indexOf('|') + 1))
    const removidos = await prisma.gerenciaDaily.deleteMany({
      where: {
        day: { gte: dias.reduce((a, b) => (a < b ? a : b)), lte: dias.reduce((a, b) => (a > b ? a : b)) },
        NOT: [...vistos].map((k) => ({
          nexusUserId: k.slice(0, k.indexOf('|')),
          day: k.slice(k.indexOf('|') + 1),
        })),
      },
    })
    result.removidos = removidos.count
  }

  await prisma.syncWatermark.upsert({
    where: { source: SOURCE },
    create: { source: SOURCE, lastSyncedAt: now },
    update: { lastSyncedAt: now },
  })
  return result
}
