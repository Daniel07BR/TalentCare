import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { isOwnerEmail } from '@/lib/nexus'
import { prisma } from '@/lib/db/prisma'

// Edita dados pessoais (nascimento / admissão) de uma pessoa, por nexus_user_id.
// Nascimento é exclusivo do TalentCare; admissão "gruda" (o sync não sobrescreve).
export async function POST(req: Request) {
  const session = await auth()
  if (!isOwnerEmail(session?.user?.email)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const body = (await req.json().catch(() => null)) as
    | { nexusUserId?: string; birthDate?: string | null; entryDate?: string | null }
    | null
  const nexusUserId = (body?.nexusUserId ?? '').trim()
  if (!nexusUserId) return NextResponse.json({ error: 'nexusUserId obrigatório' }, { status: 400 })

  // 'YYYY-MM-DD' → Date no meio-dia UTC (casa com a exibição em UTC e não vira o
  // dia por fuso, independente do fuso do servidor); '' → null (limpa o campo).
  const toDate = (v: string | null | undefined) => {
    const s = (v ?? '').trim()
    if (!s) return null
    const d = new Date(`${s}T12:00:00Z`)
    return isNaN(d.getTime()) ? null : d
  }

  const data: { birthDate?: Date | null; entryDate?: Date | null } = {}
  if ('birthDate' in (body ?? {})) data.birthDate = toDate(body?.birthDate)
  if ('entryDate' in (body ?? {})) data.entryDate = toDate(body?.entryDate)
  if (Object.keys(data).length === 0) return NextResponse.json({ ok: true })

  const r = await prisma.user.updateMany({ where: { nexusUserId }, data })
  return NextResponse.json({ ok: true, updated: r.count })
}
