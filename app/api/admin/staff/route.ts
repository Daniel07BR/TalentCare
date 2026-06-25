import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { auth } from '@/lib/auth/config'
import { isOwnerEmail } from '@/lib/nexus'
import { prisma } from '@/lib/db/prisma'

// Cadastro de colaboradores STAFF: pessoas reais SEM usuário no Nexus
// (motoboy, cozinha, limpeza…). Entram no painel com origin='staff', sem login
// (role SEM_PERMISSAO, senha inutilizável). Identidade real; métricas de sistema
// ficam zeradas (não usam os sistemas) e o ponto/disciplina casa por nome/CPF.

function isOwner(session: Awaited<ReturnType<typeof auth>>) {
  return isOwnerEmail(session?.user?.email)
}

// 'YYYY-MM-DD' → meio-dia UTC (não vira o dia por fuso); '' → null.
export function toDate(v: string | null | undefined): Date | null {
  const s = (v ?? '').trim()
  if (!s) return null
  const d = new Date(`${s}T12:00:00Z`)
  return isNaN(d.getTime()) ? null : d
}

// Valida/aceita o avatar (data-URI de imagem, já redimensionado no cliente).
// Limite de tamanho p/ não inflar o banco/payload. '' ou inválido → undefined.
export function avatarFromBody(v: unknown): string | undefined {
  const s = typeof v === 'string' ? v : ''
  if (!/^data:image\/(png|jpeg|jpg|webp);base64,/.test(s)) return undefined
  if (s.length > 600_000) return undefined // ~450KB de imagem; cliente manda ~10-30KB
  return s
}

// Resolve o setor: id existente OU nome novo (cria depto local sem nexus).
export async function resolveDepartment(departmentId?: string | null, newDepartment?: string | null): Promise<string | null> {
  const novo = (newDepartment ?? '').trim()
  if (novo) {
    const existing = await prisma.department.findFirst({ where: { name: { equals: novo, mode: 'insensitive' } } })
    if (existing) return existing.id
    const created = await prisma.department.create({ data: { name: novo } })
    return created.id
  }
  return (departmentId ?? '').trim() || null
}

export async function POST(req: Request) {
  const session = await auth()
  if (!isOwner(session)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const name = String(body?.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const cpf = String(body?.cpf ?? '').replace(/\D/g, '') || null
  const jobTitle = String(body?.jobTitle ?? '').trim() || null
  const gender = String(body?.gender ?? '').trim() || null
  const phone = String(body?.phone ?? '').trim() || null
  const departmentId = await resolveDepartment(body?.departmentId as string, body?.newDepartment as string)
  const avatarUrl = avatarFromBody(body?.avatar)

  // E-mail e hash são obrigatórios no schema, mas o staff não loga: gera valores
  // únicos e inutilizáveis (a senha nunca casa num bcrypt.compare).
  const email = cpf ? `${cpf}@staff.local` : `staff-${crypto.randomBytes(8).toString('hex')}@staff.local`
  const passwordHash = crypto.randomBytes(24).toString('hex')

  try {
    const user = await prisma.user.create({
      data: {
        name, cpf, jobTitle, gender, phone,
        email, passwordHash,
        role: 'SEM_PERMISSAO',
        origin: 'staff',
        active: true,
        avatarUrl,
        departmentId,
        entryDate: toDate(body?.entryDate as string),
        birthDate: toDate(body?.birthDate as string),
      },
    })
    return NextResponse.json({ ok: true, id: user.id })
  } catch (e) {
    const msg = (e as { code?: string }).code === 'P2002' ? 'Já existe colaborador com esse CPF/e-mail.' : (e as Error).message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
