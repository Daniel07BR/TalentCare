import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

export async function POST(req: Request) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const body = (await req.json().catch(() => null)) as { stagingId?: string; nexusUserId?: string | null } | null
  const stagingId = body?.stagingId
  const nexusUserId = (body?.nexusUserId ?? '').trim() || null
  if (!stagingId) return NextResponse.json({ error: 'stagingId obrigatório' }, { status: 400 })

  const row = await prisma.educationStaging.findUnique({ where: { id: stagingId } })
  if (!row) return NextResponse.json({ error: 'registro não encontrado' }, { status: 404 })

  if (nexusUserId) {
    await prisma.employeeEducation.upsert({
      where: { nexusUserId },
      create: { nexusUserId, level: row.level, sexo: row.sexo, detail: row.detail, raw: row.raw ?? undefined },
      update: { level: row.level, sexo: row.sexo, detail: row.detail, raw: row.raw ?? undefined },
    })
    // se estava vinculado a outra pessoa, limpa o antigo
    if (row.matchedNexusId && row.matchedNexusId !== nexusUserId) {
      await prisma.employeeEducation.deleteMany({ where: { nexusUserId: row.matchedNexusId } })
    }
    await prisma.educationStaging.update({ where: { id: stagingId }, data: { matchedNexusId: nexusUserId, status: 'applied' } })
  } else {
    if (row.matchedNexusId) await prisma.employeeEducation.deleteMany({ where: { nexusUserId: row.matchedNexusId } })
    await prisma.educationStaging.update({ where: { id: stagingId }, data: { matchedNexusId: null, status: 'rejected' } })
  }
  return NextResponse.json({ ok: true })
}
