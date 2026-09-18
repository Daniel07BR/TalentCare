// Sync incremental do espelho diário do WhatsApp → TalentCare (CLI p/ cron).
// Rode: node --env-file=.env run-whatsapp-sync.mjs
//
// ⚠️⚠️ SÃO DUAS INSTÂNCIAS do OneCode desde 18/09/2026 — a da contabilidade
// (`itamarathy`) e a da Imobiliária (`imobiliaria`), dois números de WhatsApp,
// duas rotas no Relatórios e dois watermarks. Sem argumento, roda as DUAS;
// `--fonte imobiliaria` roda só uma. A régua e o porquê estão em
// `lib/whatsapp-fontes.ts` (aqui as constantes estão repetidas porque este
// arquivo é .mjs e não importa TypeScript).
//
// ⚠️⚠️ A instância da Imobiliária chega como o setor "Imóveis" — quem resolve
// isso é o Relatórios, na rota dele. Daqui para baixo as duas são iguais: as
// linhas do espelho não distinguem de qual número vieram, e não precisam.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = process.env.PAINEL_BASE_URL
const KEY = process.env.PAINEL_API_KEY

// ⚠️⚠️ `inicio` = primeiro dia da instância quando ainda não há watermark. Sem
// ele, o primeiro pull traz TUDO — e no caso da Imobiliária isso significaria
// trazer a faxina de 17/09/2026 (466 conversas antigas fechadas de uma vez, com
// tempo mediano de ~305 dias). O porquê medido está em `lib/whatsapp-fontes.ts`.
const FONTES = {
  itamarathy: { caminho: '/api/integrations/whatsapp-overview-daily', watermark: 'whatsapp', snapshotId: 1, inicio: null },
  imobiliaria: { caminho: '/api/integrations/whatsapp-imob-overview-daily', watermark: 'whatsapp_imob', snapshotId: 2, inicio: '2026-09-18' },
}

function startOfDayMinusOne(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - 1)
  return x
}

function arg(nome) {
  const i = process.argv.indexOf(nome)
  return i > 0 ? process.argv[i + 1] : null
}

async function buscar(fonte, from, to) {
  const qs = new URLSearchParams({ to: to.toISOString() })
  if (from) qs.set('from', from.toISOString())
  const res = await fetch(`${BASE}${FONTES[fonte].caminho}?${qs.toString()}`, { headers: { 'X-API-Key': KEY } })
  if (!res.ok) throw new Error(`Painel ${res.status} (${fonte}): ${await res.text()}`)
  return res.json()
}

/* ⚠️⚠️ CARGA DO PASSADO DA AVALIAÇÃO (11/09/2026):
     node --env-file=.env run-whatsapp-sync.mjs --so-avaliacao --desde 2026-06-01
   Recuar o watermark faria o sync REESCREVER abertos/finalizados dos meses antigos com
   o que o Painel tem hoje — e em julho o espelho daqui é o melhor registro (a origem
   apaga atendimentos; ver a memória `painel-onecode-reconciliacao-nao-destrutiva`).
   Este modo só ACRESCENTA os quatro campos da avaliação às linhas que já existem: não
   cria linha, não mexe em número nenhum, e não move o watermark.
   ⚠️ Só a instância da contabilidade confere avaliação (`run-avaliacao-onecode.mjs`
   no Relatórios) — por isso o padrão aqui é `itamarathy`. */
async function soAvaliacao(desde, fonte) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde ?? '')) throw new Error('--desde AAAA-MM-DD')
  const data = await buscar(fonte, new Date(`${desde}T03:00:00Z`), new Date())
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
  console.log(JSON.stringify({ modo: 'so-avaliacao', fonte, desde, gravadas, semLinha, semConferencia, conferidosAMais }))
}

async function sincronizar(fonte, desde, now) {
  const { watermark, snapshotId, inicio } = FONTES[fonte]
  const wm = await prisma.syncWatermark.findUnique({ where: { source: watermark } })
  /* `--desde AAAA-MM-DD` (11/09/2026): relê a partir daquele dia, inteiro — o
     incremental só relê o dia anterior e não traz correção retroativa (a memória
     `sync-incremental-nao-traz-correcao-retroativa`). Usado para refazer SETEMBRO
     depois do conserto do dia parcial no Painel. ⚠️ Reescreve abertos/finalizados
     com o que o Painel tem hoje: não use para meses em que o espelho daqui é o melhor
     registro sem medir antes (ver CHANGELOG (27)). */
  const from = desde ? new Date(`${desde}T03:00:00Z`)
    : wm ? startOfDayMinusOne(wm.lastSyncedAt)
    : inicio ? new Date(`${inicio}T03:00:00Z`) : null
  const data = await buscar(fonte, from, now)

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
    where: { fonte },
    create: { id: snapshotId, fonte, pendingNow: data.snapshot.pendingNow, openNow: data.snapshot.openNow },
    update: { pendingNow: data.snapshot.pendingNow, openNow: data.snapshot.openNow },
  })
  await prisma.syncWatermark.upsert({
    where: { source: watermark },
    create: { source: watermark, lastSyncedAt: now },
    update: { lastSyncedAt: now },
  })
  return { fonte, days, att, snapshot: data.snapshot, from: from ? from.toISOString() : null }
}

async function main() {
  const fonteArg = arg('--fonte')
  if (fonteArg && !FONTES[fonteArg]) throw new Error(`--fonte deve ser ${Object.keys(FONTES).join(' ou ')}`)
  const desde = arg('--desde')
  if (desde && !/^\d{4}-\d{2}-\d{2}$/.test(desde)) throw new Error('--desde AAAA-MM-DD')

  if (process.argv.includes('--so-avaliacao')) return soAvaliacao(desde, fonteArg ?? 'itamarathy')

  const now = new Date()
  const alvos = fonteArg ? [fonteArg] : Object.keys(FONTES)
  const saida = []
  let falhou = false
  for (const fonte of alvos) {
    try {
      saida.push(await sincronizar(fonte, desde, now))
    } catch (e) {
      /* ⚠️ Uma instância fora do ar não derruba a outra — e o watermark dela não
         avança, então ela relê sozinha o que ficou para trás no próximo pull. */
      falhou = true
      saida.push({ fonte, erro: e.message })
    }
  }
  console.log(JSON.stringify({ to: now.toISOString(), fontes: saida }))
  if (falhou) process.exitCode = 1
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
