import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { toDate, resolveDepartment } from '../route'

// Edita um colaborador STAFF (ou ativa/inativa). Só atua sobre origin='staff'
// (não toca usuários do Nexus). Inativar carimba a data de saída (leftAt).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || role !== 'ADMIN') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id } = await params
  const target = await prisma.user.findUnique({ where: { id }, select: { origin: true, active: true } })
  if (!target || target.origin !== 'staff') {
    return NextResponse.json({ error: 'Colaborador staff não encontrado' }, { status: 404 })
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const data: Record<string, unknown> = {}

  if (body?.name != null) { const v = String(body.name).trim(); if (v) data.name = v }
  if (body?.cpf != null) data.cpf = String(body.cpf).replace(/\D/g, '') || null
  if (body?.jobTitle != null) data.jobTitle = String(body.jobTitle).trim() || null
  if (body?.gender != null) data.gender = String(body.gender).trim() || null
  if (body?.phone != null) data.phone = String(body.phone).trim() || null
  if ('entryDate' in (body ?? {})) data.entryDate = toDate(body?.entryDate as string)
  if ('birthDate' in (body ?? {})) data.birthDate = toDate(body?.birthDate as string)
  if (body?.departmentId != null || body?.newDepartment != null) {
    data.departmentId = await resolveDepartment(body?.departmentId as string, body?.newDepartment as string)
  }
  // Ativar/inativar: inativar carimba leftAt (hoje, se vazio); reativar limpa.
  if (typeof body?.active === 'boolean') {
    data.active = body.active
    data.leftAt = body.active ? null : new Date()
  }

  try {
    await prisma.user.update({ where: { id }, data })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = (e as { code?: string }).code === 'P2002' ? 'Já existe colaborador com esse CPF/e-mail.' : (e as Error).message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
