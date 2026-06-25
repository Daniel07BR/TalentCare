import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { isOwnerEmail } from '@/lib/nexus'
import { prisma } from '@/lib/db/prisma'

type Occ = { atrasos?: { day: string; minutos: number; abonado: boolean }[]; adverts?: { sourceId: string; day: string; motivo: string | null }[] }

// Vincula uma pessoa do dump de ponto (linha pendente em ponto_staging) a um
// funcionário do TalentCare. Aplica as ocorrências cruas (occ) à pessoa escolhida
// e grava o vínculo durável em ponto_match (o import futuro respeita). action:
//   'link'   → vincula (precisa de userId)
//   'ignore' → marca a linha como ignorada
export async function POST(req: Request) {
  const session = await auth()
  if (!isOwnerEmail(session?.user?.email)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = (await req.json().catch(() => null)) as { stagingId?: string; userId?: string; action?: string } | null
  const stagingId = body?.stagingId
  const action = body?.action ?? 'link'
  if (!stagingId) return NextResponse.json({ error: 'stagingId obrigatório' }, { status: 400 })

  const row = await prisma.pontoStaging.findUnique({ where: { id: stagingId } })
  if (!row) return NextResponse.json({ error: 'registro não encontrado' }, { status: 404 })

  if (action === 'ignore') {
    await prisma.pontoStaging.update({ where: { id: stagingId }, data: { status: 'ignored', matchedPersonKey: null } })
    return NextResponse.json({ ok: true })
  }

  const userId = (body?.userId ?? '').trim()
  if (!userId) return NextResponse.json({ error: 'userId obrigatório p/ vincular' }, { status: 400 })
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, nexusUserId: true, name: true } })
  if (!user) return NextResponse.json({ error: 'funcionário não encontrado' }, { status: 404 })
  const personKey = user.nexusUserId ?? user.id

  const occ = (row.occ ?? {}) as Occ
  // Atrasos → agrega por dia e SOMA ao espelho diário da pessoa (additivo).
  const byDay = new Map<string, { atrasos: number; abon: number; minutos: number }>()
  for (const a of occ.atrasos ?? []) {
    const d = byDay.get(a.day) ?? { atrasos: 0, abon: 0, minutos: 0 }
    if (a.abonado) d.abon++
    else { d.atrasos++; d.minutos += a.minutos || 0 }
    byDay.set(a.day, d)
  }
  for (const [day, d] of byDay) {
    await prisma.assiduidadeDaily.upsert({
      where: { personKey_day: { personKey, day } },
      create: { personKey, day, atrasos: d.atrasos, atrasosAbon: d.abon, minutosAtraso: d.minutos },
      update: { atrasos: { increment: d.atrasos }, atrasosAbon: { increment: d.abon }, minutosAtraso: { increment: d.minutos } },
    })
  }
  // Advertências → eventos idempotentes por (source, sourceId).
  for (const ev of occ.adverts ?? []) {
    await prisma.disciplinaEvento.upsert({
      where: { source_sourceId: { source: 'nexo', sourceId: ev.sourceId } },
      create: { personKey, source: 'nexo', sourceId: ev.sourceId, data: ev.day, tipo: 'advertencia', motivo: ev.motivo, dias: null },
      update: { personKey },
    })
  }

  // Vínculo durável + marca a linha aplicada.
  await prisma.pontoMatch.upsert({
    where: { nexoUserId: row.nexoUserId },
    create: { nexoUserId: row.nexoUserId, personKey, nome: row.nome },
    update: { personKey },
  })
  await prisma.pontoStaging.update({ where: { id: stagingId }, data: { status: 'applied', matchedPersonKey: personKey } })

  return NextResponse.json({ ok: true, atrasos: occ.atrasos?.length ?? 0, advertencias: occ.adverts?.length ?? 0 })
}
