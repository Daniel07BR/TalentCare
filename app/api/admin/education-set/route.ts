import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { deriveLevelAndDetail, type EduItem } from '@/lib/education-edit'

export async function POST(req: Request) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const body = (await req.json().catch(() => null)) as
    | { nexusUserId?: string; items?: EduItem[]; level?: string | null; detail?: string | null }
    | null
  const nexusUserId = (body?.nexusUserId ?? '').trim()
  if (!nexusUserId) return NextResponse.json({ error: 'nexusUserId obrigatório' }, { status: 400 })

  // Novo formato (editor por níveis): deriva level+detail dos itens marcados e
  // guarda os itens em `raw` p/ re-carregar os checkboxes fielmente.
  let level: string | null
  let detail: string | null
  let raw: { items: EduItem[] } | undefined
  if (Array.isArray(body?.items)) {
    const items = body!.items
      .filter((it) => it && typeof it.tipo === 'string')
      .map((it) => ({ tipo: it.tipo, curso: (it.curso ?? '').trim(), cursando: !!it.cursando }))
    const d = deriveLevelAndDetail(items)
    level = d.level
    detail = d.detail
    raw = { items }
  } else {
    // Compat: formato antigo (level + detail manuais).
    level = (body?.level ?? '').trim() || null
    detail = (body?.detail ?? '').trim() || null
  }

  if (!level) {
    await prisma.employeeEducation.deleteMany({ where: { nexusUserId } })
  } else {
    await prisma.employeeEducation.upsert({
      where: { nexusUserId },
      create: { nexusUserId, level, detail, source: 'manual', raw: raw ?? undefined },
      update: { level, detail, source: 'manual', raw: raw ?? undefined },
    })
  }
  return NextResponse.json({ ok: true })
}
