import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

export async function POST(req: Request) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const body = (await req.json().catch(() => null)) as { nexusUserId?: string; level?: string | null; detail?: string | null } | null
  const nexusUserId = (body?.nexusUserId ?? '').trim()
  const level = (body?.level ?? '').trim() || null
  const detail = (body?.detail ?? '').trim() || null
  if (!nexusUserId) return NextResponse.json({ error: 'nexusUserId obrigatório' }, { status: 400 })

  if (!level) {
    await prisma.employeeEducation.deleteMany({ where: { nexusUserId } })
  } else {
    await prisma.employeeEducation.upsert({
      where: { nexusUserId },
      create: { nexusUserId, level, detail, source: 'manual' },
      update: { level, detail, source: 'manual' },
    })
  }
  return NextResponse.json({ ok: true })
}
