import { prisma } from '@/lib/db/prisma'
import { FONTES, FONTE_PADRAO } from '@/lib/whatsapp-fontes'

// Espelho diário do WhatsApp/OneCode (Painel .70). Pull incremental por dia a
// partir do watermark; upsert SET → idempotente. Popula: whatsapp_daily (abertos/
// finalizados/handleSum/cor por dept×dia), whatsapp_attendant_daily (abertos por
// atendente×dia) e whatsapp_snapshot (pendingNow/openNow "agora").
//
// ⚠️⚠️ SÃO DUAS INSTÂNCIAS desde 18/09/2026 — o número do escritório e o da
// Imobiliária, duas rotas no Relatórios e dois watermarks. A da Imobiliária
// chega como o setor "Imóveis" (a fila fina fica lá), então daqui para baixo
// nada distingue as duas: é uma linha de espelho como qualquer outra. Ver
// `lib/whatsapp-fontes.ts`.
const BASE = process.env.PAINEL_BASE_URL!
const KEY = process.env.PAINEL_API_KEY!

interface DayRow { dept: string; day: string; abertos: number | string; finalizados: number | string; handleSum: number | string; color: string | null }
interface AttRow { dept: string; name: string; day: string; abertos: number | string; finalizados: number | string; handleSum: number | string; verificados?: number | null; pedidos?: number | null; avaliados?: number | null; notaSum?: number | null }
interface Overview { days: DayRow[]; attendants: AttRow[]; snapshot: { pendingNow: number; openNow: number } }

export interface WhatsappSyncResult {
  syncedDays: number
  syncedAtt: number
  from: string | null
  to: string
  errors: string[]
  /** Uma entrada por instância, para o relatório do sync não esconder metade. */
  porFonte: Record<string, { syncedDays: number; syncedAtt: number; from: string | null; errors: string[] }>
}

function startOfDayMinusOne(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - 1)
  return x
}

async function syncFonte(fonte: keyof typeof FONTES, now: Date) {
  const { caminho, watermark, snapshotId, inicio } = FONTES[fonte]
  const parcial = { syncedDays: 0, syncedAtt: 0, from: null as string | null, errors: [] as string[] }

  const wm = await prisma.syncWatermark.findUnique({ where: { source: watermark } })
  /* ⚠️ Sem watermark, o pull sem `inicio` traz TUDO o que a origem tem — e para
     a Imobiliária isso significaria trazer a faxina de 17/09 (ver o `inicio` em
     `lib/whatsapp-fontes.ts`). O piso é do código, não do cron: assim não
     depende de alguém lembrar de rodar o primeiro pull à mão. */
  const from = wm ? startOfDayMinusOne(wm.lastSyncedAt) : inicio ? new Date(`${inicio}T03:00:00Z`) : null
  parcial.from = from ? from.toISOString() : null

  const qs = new URLSearchParams({ to: now.toISOString() })
  if (from) qs.set('from', from.toISOString())
  const res = await fetch(`${BASE}${caminho}?${qs.toString()}`, {
    headers: { 'X-API-Key': KEY },
    cache: 'no-store',
  })
  if (!res.ok) {
    parcial.errors.push(`Painel API ${res.status} (${fonte}): ${await res.text()}`)
    return parcial
  }
  const data = (await res.json()) as Overview

  for (const r of data.days) {
    if (!r.dept || !r.day) continue
    const abertos = Number(r.abertos) || 0
    const finalizados = Number(r.finalizados) || 0
    const handleSum = Number(r.handleSum) || 0
    try {
      await prisma.whatsappDaily.upsert({
        where: { dept_day: { dept: r.dept, day: r.day } },
        create: { dept: r.dept, day: r.day, abertos, finalizados, handleSum, color: r.color ?? null },
        update: { abertos, finalizados, handleSum, color: r.color ?? null },
      })
      parcial.syncedDays++
    } catch (e) {
      parcial.errors.push(`day ${fonte}/${r.dept}/${r.day}: ${(e as Error).message}`)
    }
  }

  for (const a of data.attendants) {
    if (!a.dept || !a.name || !a.day) continue
    const abertos = Number(a.abertos) || 0
    const finalizados = Number(a.finalizados) || 0
    const handleSum = Number(a.handleSum) || 0
    /* ⚠️⚠️ A AVALIAÇÃO DO CLIENTE (11/09/2026). O Painel só manda os quatro campos
       para o dia que ele JÁ CONFERIU no OneCode; ausente = não conferido, e grava
       `undefined` (não mexe), NUNCA `null` nem `0`: `0` diria "não pediu avaliação"
       de quem ninguém mediu. A instância da Imobiliária ainda não é conferida —
       os quatro campos dela ficam em "—", que é a leitura certa. */
    const aval: Record<string, number> = {}
    for (const k of ['verificados', 'pedidos', 'avaliados', 'notaSum'] as const) {
      const v = a[k]
      if (v !== undefined && v !== null && Number.isFinite(Number(v))) aval[k] = Number(v)
    }
    try {
      await prisma.whatsappAttendantDaily.upsert({
        where: { dept_name_day: { dept: a.dept, name: a.name, day: a.day } },
        create: { dept: a.dept, name: a.name, day: a.day, abertos, finalizados, handleSum, ...aval },
        update: { abertos, finalizados, handleSum, ...aval },
      })
      parcial.syncedAtt++
    } catch (e) {
      parcial.errors.push(`att ${fonte}/${a.dept}/${a.name}/${a.day}: ${(e as Error).message}`)
    }
  }

  // Snapshot "agora" (sempre o mais recente), uma linha por instância.
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
  return parcial
}

export async function syncWhatsapp(): Promise<WhatsappSyncResult> {
  const now = new Date()
  const result: WhatsappSyncResult = {
    syncedDays: 0, syncedAtt: 0, from: null, to: now.toISOString(), errors: [], porFonte: {},
  }
  for (const fonte of Object.keys(FONTES) as (keyof typeof FONTES)[]) {
    try {
      const p = await syncFonte(fonte, now)
      result.porFonte[fonte] = p
      result.syncedDays += p.syncedDays
      result.syncedAtt += p.syncedAtt
      result.errors.push(...p.errors)
      if (fonte === FONTE_PADRAO) result.from = p.from
    } catch (e) {
      /* ⚠️ Uma instância fora do ar não pode parar a outra: o erro fica no
         relatório e o watermark dela NÃO avança — ela relê sozinha o que ficou
         para trás no próximo pull. */
      const msg = `${fonte}: ${(e as Error).message}`
      result.porFonte[fonte] = { syncedDays: 0, syncedAtt: 0, from: null, errors: [msg] }
      result.errors.push(msg)
    }
  }
  return result
}
