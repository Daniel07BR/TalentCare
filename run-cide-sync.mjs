// Sync incremental do espelho diário do CIDE → TalentCare (CLI p/ cron).
// Rode: node --env-file=.env run-cide-sync.mjs
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = process.env.CIDE_BASE_URL
const KEY = process.env.CIDE_API_KEY
const SOURCE = 'cide'

function startOfDayMinusOne(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - 1)
  return x
}

async function main() {
  const now = new Date()
  const wm = await prisma.syncWatermark.findUnique({ where: { source: SOURCE } })
  /* ⚠️ `--tudo` ignora o watermark e repuxa a história inteira. É o que
     preenche `empresas`/`manuais` nas linhas gravadas antes de 08/09/2026 —
     sem esse backfill, quem consome o campo novo lê `null` no passado todo, e
     `null` tratado como zero apagaria o histórico de CIDE de todo mundo. */
  const tudo = process.argv.includes('--tudo')
  const from = tudo ? null : (wm ? startOfDayMinusOne(wm.lastSyncedAt) : null)

  const qs = new URLSearchParams({ to: now.toISOString() })
  if (from) qs.set('from', from.toISOString())
  const res = await fetch(`${BASE}/api/integrations/atividade-daily?${qs.toString()}`, { headers: { 'X-API-Key': KEY } })
  if (!res.ok) throw new Error(`CIDE ${res.status}: ${await res.text()}`)
  const data = await res.json()

  let synced = 0
  for (const r of data.days) {
    if (!r.userId || !r.day) continue
    const atividades = Number(r.atividades) || 0
    /* ⚠️⚠️ `undefined`, NUNCA `null`, quando o CIDE não mandar os campos novos.
       `null` no update APAGARIA o que um sync anterior já mediu, trocando dado
       por buraco em silêncio — a mesma armadilha do sexo no diretório
       (08/09/2026). `undefined` faz o Prisma não tocar na coluna. */
    const empresas = r.empresas == null ? undefined : Number(r.empresas) || 0
    const manuais = r.manuais == null ? undefined : Number(r.manuais) || 0
    await prisma.cideDaily.upsert({
      where: { nexusUserId_day: { nexusUserId: r.userId, day: r.day } },
      create: { nexusUserId: r.userId, day: r.day, atividades, empresas: empresas ?? null, manuais: manuais ?? null },
      update: { atividades, empresas, manuais },
    })
    synced++
  }
  await prisma.syncWatermark.upsert({
    where: { source: SOURCE },
    create: { source: SOURCE, lastSyncedAt: now },
    update: { lastSyncedAt: now },
  })
  console.log(JSON.stringify({ synced, from: from ? from.toISOString() : null, to: now.toISOString() }))
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
