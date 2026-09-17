// Sync incremental das MENSAGENS do Chat Interno → TalentCare (CLI p/ cron).
//
// ⚠️⚠️ Os CHAMADOS saíram daqui em 16/09/2026 e são do Fluxo
// (`run-fluxo-sync.mjs`). A origem ainda os devolve — a tabela `tickets` do .69
// ficou congelada como mapa dos links antigos —, e é por isso que este sync PARA
// de gravá-los: número parado que continua sendo escrito todo dia é
// indistinguível de número vivo.
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
    }
    await prisma.chatDaily.upsert({
      where: { nexusUserId_day: { nexusUserId: r.userId, day: r.day } },
      create: { nexusUserId: r.userId, day: r.day, ...dados },
      update: dados,
    })
    pessoas++
  }

  /* ⚠️ O espelho por SETOR do Chat (`chat_dept_daily`) parou em 16/09/2026: ele
     era dos chamados, e eles mudaram de casa. A tabela fica como história — quem
     conta setor agora é `fluxo_dept_daily`. */
  const setores = 0

  /* ⚠️⚠️ No modo completo, a linha que a fonte NÃO devolveu é ZERADA. Quem ficou
     com zero num dia (passou o único chamado adiante) nem aparece na resposta, e
     um upsert só corrigiria quem aparece — o 8 do Daniel ficaria para sempre.
     Zerar, e não apagar: a linha volta ao valor certo na próxima passagem se a
     fonte voltar a contá-la, e nada some do banco.
     ⚠️ FREIO (lição do sync de diretório): se a fonte devolveu menos da metade das
     linhas que o espelho tem, algo está errado LÁ — não zera nada. */
  let zeradas = 0, freio = null
  if (completo) {
    /* ⚠️⚠️ SÓ PESSOA. O `chat_dept_daily` ficou congelado em 16/09/2026 e o sync
       não devolve mais linha de setor — passá-lo por este zerador APAGARIA a
       história inteira do painel por setor do Chat, e o freio abaixo, que
       existe para isso, derrubaria junto o zeramento das mensagens. */
    const espP = await prisma.chatDaily.findMany({ select: { nexusUserId: true, day: true } })
    const soP = espP.filter((r) => !vistasPessoa.has(`${r.nexusUserId}|${r.day}`))
    if (vistasPessoa.size < espP.length / 2) {
      freio = `fonte devolveu ${vistasPessoa.size}/${espP.length} linhas de pessoa — nada zerado`
    } else {
      const zeroP = { msgCanais: 0, msgDiretas: 0, msgChamados: 0 }
      for (const r of soP) await prisma.chatDaily.update({ where: { nexusUserId_day: { nexusUserId: r.nexusUserId, day: r.day } }, data: zeroP })
      zeradas = soP.length
    }
  }

  await prisma.syncWatermark.upsert({
    where: { source: SOURCE },
    create: { source: SOURCE, lastSyncedAt: now },
    update: { lastSyncedAt: now },
  })
  console.log(JSON.stringify({
    pessoas, setores,
    ...(completo ? { completo: true, zeradas, freio } : {}),
    from: from ? from.toISOString() : null, to: now.toISOString(),
  }))
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
