import { prisma } from '@/lib/db/prisma'

// Ingestão das métricas reais do CHAT INTERNO (.69) — 8ª fonte. Modelo ESPELHO
// DIÁRIO + sync INCREMENTAL idempotente, igual às outras sete:
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
  chamadosAbertos: number | string
  chamadosAssumidos: number | string
  chamadosConcluidos: number | string
  segundosResolucao: number | string
}

interface LinhaSetor {
  deptId: string
  day: string
  pedidosAbertos: number | string
  pedidosConcluidos: number | string
  recebidosAbertos: number | string
  recebidosConcluidos: number | string
  recebidosCancelados: number | string
  segundosResolucao: number | string
}

export interface ChatSyncResult {
  pessoas: number
  setores: number
  /** Chamados cuja função de origem/destino não é um departamento — ver abaixo. */
  foraDeSetor: { pedidos: number; recebidos: number }
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
    foraDeSetor: { pedidos: 0, recebidos: 0 },
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
  const data = (await res.json()) as {
    pessoas: LinhaPessoa[]
    setores: LinhaSetor[]
    foraDeSetor?: { pedidos: number; recebidos: number }
  }

  for (const r of data.pessoas ?? []) {
    if (!r.userId || !r.day) continue
    const dados = {
      msgCanais: n(r.msgCanais),
      msgDiretas: n(r.msgDiretas),
      msgChamados: n(r.msgChamados),
      chamadosAbertos: n(r.chamadosAbertos),
      chamadosAssumidos: n(r.chamadosAssumidos),
      chamadosConcluidos: n(r.chamadosConcluidos),
      // ⚠️ Segundos de EXPEDIENTE (08h–18h, seg a sex), contados no .69. Nunca
      // recalcular aqui a partir de datas: seriam duas verdades sobre quanto
      // tempo um chamado levou, uma no chat e outra neste painel.
      segundosResolucao: n(r.segundosResolucao),
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

  for (const r of data.setores ?? []) {
    if (!r.deptId || !r.day) continue
    const dados = {
      pedidosAbertos: n(r.pedidosAbertos),
      pedidosConcluidos: n(r.pedidosConcluidos),
      recebidosAbertos: n(r.recebidosAbertos),
      recebidosConcluidos: n(r.recebidosConcluidos),
      recebidosCancelados: n(r.recebidosCancelados),
      segundosResolucao: n(r.segundosResolucao),
    }
    try {
      await prisma.chatDeptDaily.upsert({
        where: { nexusDepartmentId_day: { nexusDepartmentId: r.deptId, day: r.day } },
        create: { nexusDepartmentId: r.deptId, day: r.day, ...dados },
        update: dados,
      })
      result.setores++
    } catch (e) {
      result.errors.push(`setor ${r.deptId}/${r.day}: ${(e as Error).message}`)
    }
  }

  // ⚠️ Chamado cuja função de origem/destino não É um departamento fica fora do
  // espelho por setor. Vem contado da origem e sobe no resultado do sync: sem
  // isso, o painel por setor mostraria menos chamados que o chat e ninguém
  // saberia por quê — o sync teria "rodado com sucesso" o tempo todo.
  if (data.foraDeSetor) result.foraDeSetor = data.foraDeSetor

  await prisma.syncWatermark.upsert({
    where: { source: SOURCE },
    create: { source: SOURCE, lastSyncedAt: now },
    update: { lastSyncedAt: now },
  })
  return result
}
