// Sync do espelho diário da Gerência → TalentCare (CLI p/ cron).
// Rode: node --env-file=.env run-gerencia-sync.mjs [--completo]
//
// ⚠️⚠️ A CORREÇÃO RETROATIVA NÃO VOLTA PELO INCREMENTAL — por isso o --completo.
// O endpoint recorta por `evt.day BETWEEN from AND to`, ou seja pelo DIA DO
// EVENTO, e não por quando o registro foi alterado. Um km corrigido em 10/08
// sobre o dia 07/08 já saiu da janela do cron seguinte e fica congelado errado
// no espelho para sempre.
//
// Medido em 09/09/2026, comparando espelho × fonte na base inteira: **212 dias
// divergentes** em 4.609. O pior era o KM do Elton em 07/08/2026 — o app leu o
// odômetro errado (882.601 km num dia), o Legal corrigiu para 58 na Gerência em
// 10/08, e o espelho seguia com os 882.601. Agosto dele somava **1.028.354 km**
// no TalentCare contra **1.265** na origem: 813 vezes maior, no cartão que a
// tela de setor mostra ao lado do nome dele.
//
// Os outros 198 eram `viagens`, métrica acrescentada ao endpoint DEPOIS do
// backfill: como o incremental só olha para a frente, todo o histórico ficou
// com viagens = 0 — nenhuma viagem em 25 anos de base, para os dois
// mensageiros. Métrica nova numa fonte incremental nasce vazia no passado.
//
// O cron de :30 segue incremental (barato). O --completo roda uma vez por dia e
// reconcilia a base inteira: 4.610 linhas, ~1s de endpoint.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = process.env.GERENCIA_BASE_URL
const KEY = process.env.GERENCIA_API_KEY
const SOURCE = 'gerencia'

function startOfDayMinusOne(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - 1)
  return x
}

const n = (v) => Number(v) || 0

const COMPLETO = process.argv.includes('--completo')

async function main() {
  const now = new Date()
  const wm = await prisma.syncWatermark.findUnique({ where: { source: SOURCE } })
  // `--completo` ignora o watermark: puxa a base inteira e reconcilia. É o que
  // traz de volta o que foi corrigido num dia que já saiu da janela.
  const from = COMPLETO || !wm ? null : startOfDayMinusOne(wm.lastSyncedAt)

  const qs = new URLSearchParams({ to: now.toISOString() })
  if (from) qs.set('from', from.toISOString())
  const res = await fetch(`${BASE}/integrations/talent-daily?${qs.toString()}`, {
    headers: { 'X-API-Key': KEY },
  })
  if (!res.ok) throw new Error(`Gerencia ${res.status}: ${await res.text()}`)
  const data = await res.json()

  let synced = 0
  const vistos = new Set()
  for (const r of data.days) {
    if (!r.userId || !r.day) continue
    vistos.add(`${r.userId}|${r.day}`)
    const row = {
      servicos: n(r.servicos),
      km: n(r.km),
      saidas: n(r.saidas),
      viagens: n(r.viagens),
      jornadaMin: n(r.jornadaMin),
      /* ⚠️⚠️ DESLIGADO ATÉ O `npx prisma db push` RODAR NA PRODUÇÃO (.78).
         A coluna `gerencia_daily.jornada_teto_min` existe no `schema.prisma` e
         o endpoint da Gerência já devolve `jornadaTetoMin`, mas o push foi
         barrado pelo classificador e está com o dono. Sem a coluna, o Prisma
         recusa o upsert inteiro (`PrismaClientValidationError`) e o cron das
         :30 morre — o espelho pararia calado, que é exatamente o defeito que
         esta sessão passou a tarde consertando. Deploy de schema vem ANTES do
         código que o usa; inverti a ordem e este comentário é o preço.
         PARA LIGAR: rode o push e descomente a linha abaixo (aqui e no `.78`),
         depois `run-gerencia-sync.mjs --completo` para preencher o histórico. */
      // jornadaTetoMin: n(r.jornadaTetoMin),
      protAbertos: n(r.protAbertos),
      protAprovados: n(r.protAprovados),
      servCriados: n(r.servCriados),
      reagendados: n(r.reagendados),
      cancelados: n(r.cancelados),
      datasAlteradas: n(r.datasAlteradas),
    }
    await prisma.gerenciaDaily.upsert({
      where: { nexusUserId_day: { nexusUserId: r.userId, day: r.day } },
      create: { nexusUserId: r.userId, day: r.day, ...row },
      update: row,
    })
    synced++
  }
  // Ver o comentário longo em lib/gerencia.ts: remove só em sync COMPLETO, só
  // depois dos upserts, e só porque esta tabela é 100% derivada da Gerência.
  let removidos = 0
  if (!from && vistos.size > 0) {
    const dias = [...vistos].map((k) => k.slice(k.indexOf('|') + 1))
    const r = await prisma.gerenciaDaily.deleteMany({
      where: {
        day: { gte: dias.reduce((a, b) => (a < b ? a : b)), lte: dias.reduce((a, b) => (a > b ? a : b)) },
        NOT: [...vistos].map((k) => ({
          nexusUserId: k.slice(0, k.indexOf('|')),
          day: k.slice(k.indexOf('|') + 1),
        })),
      },
    })
    removidos = r.count
  }

  await prisma.syncWatermark.upsert({
    where: { source: SOURCE },
    create: { source: SOURCE, lastSyncedAt: now },
    update: { lastSyncedAt: now },
  })
  console.log(JSON.stringify({ synced, removidos, from: from ? from.toISOString() : null, to: now.toISOString() }))
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
