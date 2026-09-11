// Sync incremental do espelho diário do WhatsApp → TalentCare (CLI p/ cron).
// Rode: node --env-file=.env run-whatsapp-sync.mjs
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = process.env.PAINEL_BASE_URL
const KEY = process.env.PAINEL_API_KEY
const SOURCE = 'whatsapp'

function startOfDayMinusOne(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - 1)
  return x
}

/* ⚠️⚠️ CARGA DO PASSADO DA AVALIAÇÃO (11/09/2026):
     node --env-file=.env run-whatsapp-sync.mjs --so-avaliacao --desde 2026-06-01
   Recuar o watermark faria o sync REESCREVER abertos/finalizados dos meses antigos com
   o que o Painel tem hoje — e em julho o espelho daqui é o melhor registro (a origem
   apaga atendimentos; ver a memória `painel-onecode-reconciliacao-nao-destrutiva`).
   Este modo só ACRESCENTA os quatro campos da avaliação às linhas que já existem: não
   cria linha, não mexe em número nenhum, e não move o watermark. */
async function soAvaliacao(desde) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde ?? '')) throw new Error('--desde AAAA-MM-DD')
  const qs = new URLSearchParams({ from: new Date(`${desde}T03:00:00Z`).toISOString(), to: new Date().toISOString() })
  const res = await fetch(`${BASE}/api/integrations/whatsapp-overview-daily?${qs}`, { headers: { 'X-API-Key': KEY } })
  if (!res.ok) throw new Error(`Painel ${res.status}: ${await res.text()}`)
  const data = await res.json()
  let gravadas = 0, semLinha = 0, semConferencia = 0, conferidosAMais = 0
  for (const a of data.attendants) {
    if (a.verificados == null) { semConferencia++; continue }
    const aval = { verificados: Number(a.verificados), pedidos: Number(a.pedidos), avaliados: Number(a.avaliados), notaSum: Number(a.notaSum) }
    const r = await prisma.whatsappAttendantDaily.updateMany({ where: { dept: a.dept, name: a.name, day: a.day }, data: aval })
    /* ⚠️ Sem linha aqui = o nome mudou de grafia desde que o dia foi espelhado ("bruna
       cunha" antigo × "Bruna Cunha" hoje; achado do crítico: 49 pessoa-dia só em
       junho). A linha nasce SÓ com a avaliação e ZERO em abertos/finalizados/tempo:
       nenhuma soma de atividade muda (a antiga continua contando o que contava), e
       o pedido de avaliação não se perde. */
    if (r.count === 0) {
      await prisma.whatsappAttendantDaily.create({ data: { dept: a.dept, name: a.name, day: a.day, abertos: 0, finalizados: 0, handleSum: 0, ...aval } })
      semLinha++
      continue
    }
    gravadas++
    const linha = await prisma.whatsappAttendantDaily.findUnique({ where: { dept_name_day: { dept: a.dept, name: a.name, day: a.day } }, select: { finalizados: true } })
    if (linha && aval.verificados > linha.finalizados) conferidosAMais++
  }
  // `conferidosAMais`: dias em que o Painel tem mais fechados que o espelho daqui guardou.
  console.log(JSON.stringify({ modo: 'so-avaliacao', desde, gravadas, semLinha, semConferencia, conferidosAMais }))
}

async function main() {
  if (process.argv.includes('--so-avaliacao')) {
    const i = process.argv.indexOf('--desde')
    return soAvaliacao(i > 0 ? process.argv[i + 1] : null)
  }
  const now = new Date()
  const wm = await prisma.syncWatermark.findUnique({ where: { source: SOURCE } })
  /* `--desde AAAA-MM-DD` (11/09/2026): relê a partir daquele dia, inteiro — o
     incremental só relê o dia anterior e não traz correção retroativa (a memória
     `sync-incremental-nao-traz-correcao-retroativa`). Usado para refazer SETEMBRO
     depois do conserto do dia parcial no Painel. ⚠️ Reescreve abertos/finalizados
     com o que o Painel tem hoje: não use para meses em que o espelho daqui é o melhor
     registro sem medir antes (ver CHANGELOG (27)). */
  const iDesde = process.argv.indexOf('--desde')
  const desde = iDesde > 0 ? process.argv[iDesde + 1] : null
  if (desde && !/^\d{4}-\d{2}-\d{2}$/.test(desde)) throw new Error('--desde AAAA-MM-DD')
  const from = desde ? new Date(`${desde}T03:00:00Z`) : wm ? startOfDayMinusOne(wm.lastSyncedAt) : null

  const qs = new URLSearchParams({ to: now.toISOString() })
  if (from) qs.set('from', from.toISOString())
  const res = await fetch(`${BASE}/api/integrations/whatsapp-overview-daily?${qs.toString()}`, { headers: { 'X-API-Key': KEY } })
  if (!res.ok) throw new Error(`Painel ${res.status}: ${await res.text()}`)
  const data = await res.json()

  let days = 0
  for (const r of data.days) {
    if (!r.dept || !r.day) continue
    const abertos = Number(r.abertos) || 0
    const finalizados = Number(r.finalizados) || 0
    const handleSum = Number(r.handleSum) || 0
    await prisma.whatsappDaily.upsert({
      where: { dept_day: { dept: r.dept, day: r.day } },
      create: { dept: r.dept, day: r.day, abertos, finalizados, handleSum, color: r.color ?? null },
      update: { abertos, finalizados, handleSum, color: r.color ?? null },
    })
    days++
  }
  let att = 0
  for (const a of data.attendants) {
    if (!a.dept || !a.name || !a.day) continue
    const abertos = Number(a.abertos) || 0
    const finalizados = Number(a.finalizados) || 0
    const handleSum = Number(a.handleSum) || 0
    /* ⚠️⚠️ A AVALIAÇÃO DO CLIENTE (11/09/2026). O Painel só manda os quatro campos
       para o dia que ele JÁ CONFERIU no OneCode; ausente = não conferido, e grava
       `undefined` (não mexe), NUNCA `null` nem `0`: `0` diria "não pediu avaliação"
       de quem ninguém mediu, e `null` apagaria um dia já conferido se o Painel
       responder sem o campo. */
    const aval = {}
    for (const k of ['verificados', 'pedidos', 'avaliados', 'notaSum']) {
      if (a[k] !== undefined && a[k] !== null && Number.isFinite(Number(a[k]))) aval[k] = Number(a[k])
    }
    await prisma.whatsappAttendantDaily.upsert({
      where: { dept_name_day: { dept: a.dept, name: a.name, day: a.day } },
      create: { dept: a.dept, name: a.name, day: a.day, abertos, finalizados, handleSum, ...aval },
      update: { abertos, finalizados, handleSum, ...aval },
    })
    att++
  }
  await prisma.whatsappSnapshot.upsert({
    where: { id: 1 },
    create: { id: 1, pendingNow: data.snapshot.pendingNow, openNow: data.snapshot.openNow },
    update: { pendingNow: data.snapshot.pendingNow, openNow: data.snapshot.openNow },
  })
  await prisma.syncWatermark.upsert({
    where: { source: SOURCE },
    create: { source: SOURCE, lastSyncedAt: now },
    update: { lastSyncedAt: now },
  })
  console.log(JSON.stringify({ days, att, snapshot: data.snapshot, from: from ? from.toISOString() : null, to: now.toISOString() }))
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
