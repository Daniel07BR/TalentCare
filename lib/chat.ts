import { prisma } from '@/lib/db/prisma'

// Ingestão das MENSAGENS do CHAT INTERNO (.69) — 8ª fonte. Modelo ESPELHO
// DIÁRIO + sync INCREMENTAL idempotente, igual às outras:
//
// ⚠️⚠️ Os CHAMADOS saíram daqui em 16/09/2026 (foram para o Fluxo, `lib/fluxo.ts`).
// A origem ainda os devolve — a tabela `tickets` do `.69` ficou congelada como
// mapa dos links antigos —, e é por isso que este sync PARA de gravá-los: um
// número parado que continua sendo escrito todo dia é indistinguível de um
// número vivo.
//   - puxa do .69 a atividade por (pessoa, dia) e por (setor, dia) desde o
//     último watermark;
//   - upsert SET nas duas tabelas → re-rodar a mesma janela não duplica;
//   - avança o watermark. Os filtros de período depois somam o espelho local.
//
// ⚠️ O endpoint devolve DUAS listas porque o chat mede duas coisas diferentes:
// pessoas (mensagens + chamados dela) e setores (as duas faces do chamado).
const BASE = process.env.CHAT_BASE_URL!
const KEY = process.env.CHAT_API_KEY!
const SOURCE = 'chat'

interface LinhaPessoa {
  userId: string
  day: string // YYYY-MM-DD
  msgCanais: number | string
  msgDiretas: number | string
  msgChamados: number | string
}

export interface ChatSyncResult {
  pessoas: number
  /** Sempre 0 desde 16/09/2026 — o espelho por setor do Chat congelou. */
  setores: number
  from: string | null
  to: string
  errors: string[]
}

const n = (v: number | string | undefined): number => Math.round(Number(v) || 0)

function startOfDayMinusOne(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - 1)
  return x
}

export async function syncChat(): Promise<ChatSyncResult> {
  const now = new Date()
  const wm = await prisma.syncWatermark.findUnique({ where: { source: SOURCE } })
  const from = wm ? startOfDayMinusOne(wm.lastSyncedAt) : null
  const result: ChatSyncResult = {
    pessoas: 0,
    setores: 0,
    from: from ? from.toISOString() : null,
    to: now.toISOString(),
    errors: [],
  }

  const qs = new URLSearchParams({ to: now.toISOString() })
  if (from) qs.set('from', from.toISOString())
  const res = await fetch(`${BASE}/api/integrations/talent-daily?${qs.toString()}`, {
    headers: { 'X-API-Key': KEY },
    cache: 'no-store',
  })
  if (!res.ok) {
    result.errors.push(`Chat API ${res.status}: ${await res.text()}`)
    return result
  }
  const data = (await res.json()) as { pessoas: LinhaPessoa[] }

  for (const r of data.pessoas ?? []) {
    if (!r.userId || !r.day) continue
    const dados = {
      msgCanais: n(r.msgCanais),
      msgDiretas: n(r.msgDiretas),
      msgChamados: n(r.msgChamados),
    }
    try {
      await prisma.chatDaily.upsert({
        where: { nexusUserId_day: { nexusUserId: r.userId, day: r.day } },
        create: { nexusUserId: r.userId, day: r.day, ...dados },
        update: dados, // SET → idempotente
      })
      result.pessoas++
    } catch (e) {
      result.errors.push(`pessoa ${r.userId}/${r.day}: ${(e as Error).message}`)
    }
  }

  /* ⚠️⚠️ O espelho por SETOR (`chat_dept_daily`) também PAROU em 16/09/2026:
     ele era dos chamados. A origem ainda devolve as linhas, e gravá-las
     reescreveria todo dia uma tabela congelada — quem conta setor agora é
     `fluxo_dept_daily`. A tabela fica como história. */

  await prisma.syncWatermark.upsert({
    where: { source: SOURCE },
    create: { source: SOURCE, lastSyncedAt: now },
    update: { lastSyncedAt: now },
  })
  return result
}
