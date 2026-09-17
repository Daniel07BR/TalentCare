// Sync incremental do espelho diário dos CHAMADOS (Fluxo, .70) → TalentCare.
// Rode: node --env-file=.env run-fluxo-sync.mjs [--completo]
//
// ⚠️⚠️ Os chamados eram do Chat Interno até 16/09/2026 (`run-chat-sync.mjs`,
// colunas `chamados_*` de `chat_daily`). Mudaram de casa com a história inteira
// — os 105 vieram com a data original —, então este espelho cobre tudo e é a
// ÚNICA fonte de chamado daqui em diante. Ler os dois somaria o mesmo pedido
// duas vezes.
//
// ⚠️ O Chat continua sendo sincronizado: as MENSAGENS ficaram lá.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = process.env.FLUXO_BASE_URL
const KEY = process.env.FLUXO_API_KEY
const SOURCE = 'fluxo'

const n = (v) => Math.round(Number(v) || 0)

function startOfDayMinusOne(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - 1)
  return x
}

async function main() {
  if (!BASE || !KEY) throw new Error('FLUXO_BASE_URL/FLUXO_API_KEY ausentes no .env')
  const now = new Date()
  const wm = await prisma.syncWatermark.findUnique({ where: { source: SOURCE } })
  /* ⚠️⚠️ `--completo` repassa o HISTÓRICO INTEIRO. O incremental só puxa desde a
     última passagem − 1 dia, e chamado MUDA O PASSADO: quem assume hoje um
     pedido de duas semanas atrás, quem passa o chamado adiante, quem reabre —
     tudo isso reescreve dias que o incremental não visita mais. É a mesma lição
     do Chat (o Daniel com 16 no espelho e 9 na fonte). */
  const completo = process.argv.includes('--completo')
  const from = wm && !completo ? startOfDayMinusOne(wm.lastSyncedAt) : null

  const qs = new URLSearchParams({ to: now.toISOString() })
  if (from) qs.set('from', from.toISOString())
  const res = await fetch(`${BASE}/api/integrations/talent-daily?${qs.toString()}`, { headers: { 'X-API-Key': KEY } })
  if (!res.ok) throw new Error(`Fluxo ${res.status}: ${await res.text()}`)
  const data = await res.json()

  let pessoas = 0
  const vistasPessoa = new Set()
  for (const r of data.pessoas ?? []) {
    if (!r.userId || !r.day) continue
    vistasPessoa.add(`${r.userId}|${r.day}`)
    const dados = {
      chamadosAbertos: n(r.chamadosAbertos),
      chamadosAssumidos: n(r.chamadosAssumidos),
      chamadosConcluidos: n(r.chamadosConcluidos),
      segundosResolucao: n(r.segundosResolucao),
      tarefasAbertas: n(r.tarefasAbertas),
      tarefasAssumidas: n(r.tarefasAssumidas),
      tarefasConcluidas: n(r.tarefasConcluidas),
    }
    await prisma.fluxoDaily.upsert({
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
    await prisma.fluxoDeptDaily.upsert({
      where: { nexusDepartmentId_day: { nexusDepartmentId: r.deptId, day: r.day } },
      create: { nexusDepartmentId: r.deptId, day: r.day, ...dados },
      update: dados,
    })
    setores++
  }

  /* ⚠️⚠️ No modo completo, a linha que a fonte NÃO devolveu é ZERADA. Quem ficou
     com zero num dia (passou o único chamado adiante) nem aparece na resposta, e
     um upsert só corrigiria quem aparece. Zerar, e não apagar: a linha volta ao
     valor certo na próxima passagem, e nada some do banco.
     ⚠️ FREIO: se a fonte devolveu menos da metade das linhas que o espelho tem,
     o problema está LÁ — não zera nada. */
  let zeradas = 0, freio = null
  if (completo) {
    const [espP, espS] = await Promise.all([
      prisma.fluxoDaily.findMany({ select: { nexusUserId: true, day: true } }),
      prisma.fluxoDeptDaily.findMany({ select: { nexusDepartmentId: true, day: true } }),
    ])
    const soP = espP.filter((r) => !vistasPessoa.has(`${r.nexusUserId}|${r.day}`))
    const soS = espS.filter((r) => !vistasSetor.has(`${r.nexusDepartmentId}|${r.day}`))
    if (vistasPessoa.size < espP.length / 2 || vistasSetor.size < espS.length / 2) {
      freio = `fonte devolveu ${vistasPessoa.size}/${espP.length} linhas de pessoa e ${vistasSetor.size}/${espS.length} de setor — nada zerado`
    } else {
      const zeroP = { chamadosAbertos: 0, chamadosAssumidos: 0, chamadosConcluidos: 0, segundosResolucao: 0, tarefasAbertas: 0, tarefasAssumidas: 0, tarefasConcluidas: 0 }
      const zeroS = { pedidosAbertos: 0, pedidosConcluidos: 0, recebidosAbertos: 0, recebidosConcluidos: 0, recebidosCancelados: 0, segundosResolucao: 0 }
      for (const r of soP) await prisma.fluxoDaily.update({ where: { nexusUserId_day: { nexusUserId: r.nexusUserId, day: r.day } }, data: zeroP })
      for (const r of soS) await prisma.fluxoDeptDaily.update({ where: { nexusDepartmentId_day: { nexusDepartmentId: r.nexusDepartmentId, day: r.day } }, data: zeroS })
      zeradas = soP.length + soS.length
    }
  }

  await prisma.syncWatermark.upsert({
    where: { source: SOURCE },
    create: { source: SOURCE, lastSyncedAt: now },
    update: { lastSyncedAt: now },
  })
  // ⚠️ `foraDeSetor` no log de propósito: é o chamado que o painel por setor NÃO
  // mostra (setor sem id no Nexus). Em silêncio, a diferença entre o Fluxo e
  // este painel pareceria erro de conta.
  console.log(JSON.stringify({
    pessoas, setores, foraDeSetor: data.foraDeSetor ?? null,
    ...(completo ? { completo: true, zeradas, freio } : {}),
    from: from ? from.toISOString() : null, to: now.toISOString(),
  }))
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
