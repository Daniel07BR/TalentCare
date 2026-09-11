// Sync incremental do espelho diário do Chat Interno → TalentCare (CLI p/ cron).
// Rode: node --env-file=.env run-chat-sync.mjs [--completo]
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
  /* ⚠️⚠️ `--completo` repassa o HISTÓRICO INTEIRO (11/09/2026). O incremental só
     puxa desde a última passagem − 1 dia, e um chamado que MUDA DE DONO depois
     muda o passado: o Daniel assumiu 8 chamados em 04/09 e passou 6 adiante — a
     fonte diz 2 naquele dia, o espelho seguia com 8. Achado ao pôr a lista de
     chamados da pessoa ao lado do número (16 no espelho × 9 na lista). */
  const completo = process.argv.includes('--completo')
  const from = wm && !completo ? startOfDayMinusOne(wm.lastSyncedAt) : null

  const qs = new URLSearchParams({ to: now.toISOString() })
  if (from) qs.set('from', from.toISOString())
  const res = await fetch(`${BASE}/api/integrations/talent-daily?${qs.toString()}`, { headers: { 'X-API-Key': KEY } })
  if (!res.ok) throw new Error(`Chat ${res.status}: ${await res.text()}`)
  const data = await res.json()

  let pessoas = 0
  const vistasPessoa = new Set()
  for (const r of data.pessoas ?? []) {
    if (!r.userId || !r.day) continue
    vistasPessoa.add(`${r.userId}|${r.day}`)
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
  const vistasSetor = new Set()
  for (const r of data.setores ?? []) {
    if (!r.deptId || !r.day) continue
    vistasSetor.add(`${r.deptId}|${r.day}`)
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

  /* ⚠️⚠️ No modo completo, a linha que a fonte NÃO devolveu é ZERADA. Quem ficou
     com zero num dia (passou o único chamado adiante) nem aparece na resposta, e
     um upsert só corrigiria quem aparece — o 8 do Daniel ficaria para sempre.
     Zerar, e não apagar: a linha volta ao valor certo na próxima passagem se a
     fonte voltar a contá-la, e nada some do banco.
     ⚠️ FREIO (lição do sync de diretório): se a fonte devolveu menos da metade das
     linhas que o espelho tem, algo está errado LÁ — não zera nada. */
  let zeradas = 0, freio = null
  if (completo) {
    const [espP, espS] = await Promise.all([
      prisma.chatDaily.findMany({ select: { nexusUserId: true, day: true } }),
      prisma.chatDeptDaily.findMany({ select: { nexusDepartmentId: true, day: true } }),
    ])
    const soP = espP.filter((r) => !vistasPessoa.has(`${r.nexusUserId}|${r.day}`))
    const soS = espS.filter((r) => !vistasSetor.has(`${r.nexusDepartmentId}|${r.day}`))
    if (vistasPessoa.size < espP.length / 2 || vistasSetor.size < espS.length / 2) {
      freio = `fonte devolveu ${vistasPessoa.size}/${espP.length} linhas de pessoa e ${vistasSetor.size}/${espS.length} de setor — nada zerado`
    } else {
      const zeroP = { msgCanais: 0, msgDiretas: 0, msgChamados: 0, chamadosAbertos: 0, chamadosAssumidos: 0, chamadosConcluidos: 0, segundosResolucao: 0 }
      const zeroS = { pedidosAbertos: 0, pedidosConcluidos: 0, recebidosAbertos: 0, recebidosConcluidos: 0, recebidosCancelados: 0, segundosResolucao: 0 }
      for (const r of soP) await prisma.chatDaily.update({ where: { nexusUserId_day: { nexusUserId: r.nexusUserId, day: r.day } }, data: zeroP })
      for (const r of soS) await prisma.chatDeptDaily.update({ where: { nexusDepartmentId_day: { nexusDepartmentId: r.nexusDepartmentId, day: r.day } }, data: zeroS })
      zeradas = soP.length + soS.length
    }
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
    ...(completo ? { completo: true, zeradas, freio } : {}),
    from: from ? from.toISOString() : null, to: now.toISOString(),
  }))
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
