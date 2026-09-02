// Sync incremental do espelho diário do Chat Interno → TalentCare (CLI p/ cron).
// Rode: node --env-file=.env run-chat-sync.mjs
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = process.env.CHAT_BASE_URL
const KEY = process.env.CHAT_API_KEY
const SOURCE = 'chat'

const n = (v) => Math.round(Number(v) || 0)

function startOfDayMinusOne(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - 1)
  return x
}

async function main() {
  const now = new Date()
  const wm = await prisma.syncWatermark.findUnique({ where: { source: SOURCE } })
  const from = wm ? startOfDayMinusOne(wm.lastSyncedAt) : null

  const qs = new URLSearchParams({ to: now.toISOString() })
  if (from) qs.set('from', from.toISOString())
  const res = await fetch(`${BASE}/api/integrations/talent-daily?${qs.toString()}`, { headers: { 'X-API-Key': KEY } })
  if (!res.ok) throw new Error(`Chat ${res.status}: ${await res.text()}`)
  const data = await res.json()

  let pessoas = 0
  for (const r of data.pessoas ?? []) {
    if (!r.userId || !r.day) continue
    const dados = {
      msgCanais: n(r.msgCanais),
      msgDiretas: n(r.msgDiretas),
      msgChamados: n(r.msgChamados),
      chamadosAbertos: n(r.chamadosAbertos),
      chamadosAssumidos: n(r.chamadosAssumidos),
      chamadosConcluidos: n(r.chamadosConcluidos),
      segundosResolucao: n(r.segundosResolucao),
    }
    await prisma.chatDaily.upsert({
      where: { nexusUserId_day: { nexusUserId: r.userId, day: r.day } },
      create: { nexusUserId: r.userId, day: r.day, ...dados },
      update: dados,
    })
    pessoas++
  }

  let setores = 0
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
    await prisma.chatDeptDaily.upsert({
      where: { nexusDepartmentId_day: { nexusDepartmentId: r.deptId, day: r.day } },
      create: { nexusDepartmentId: r.deptId, day: r.day, ...dados },
      update: dados,
    })
    setores++
  }

  await prisma.syncWatermark.upsert({
    where: { source: SOURCE },
    create: { source: SOURCE, lastSyncedAt: now },
    update: { lastSyncedAt: now },
  })
  // ⚠️ `foraDeSetor` no log de propósito: é o chamado que o painel por setor
  // NÃO mostra. Ficar em silêncio faria a diferença entre o chat e este painel
  // parecer erro de conta.
  console.log(JSON.stringify({
    pessoas, setores, foraDeSetor: data.foraDeSetor ?? null,
    from: from ? from.toISOString() : null, to: now.toISOString(),
  }))
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
