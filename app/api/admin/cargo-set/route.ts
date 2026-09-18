import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { podeAdministrar } from '@/lib/nexus'
import { prisma } from '@/lib/db/prisma'

/* Grava o CARGO OFICIAL de uma pessoa (14/09/2026). Mesma régua de quem edita
   nascimento e admissão (`personal-set`): só o dono.

   ⚠️ Chave = `users.id`, e não `nexus_user_id`: colaborador avulso (STAFF, sem
   conta no Nexus) também tem cargo.
   ⚠️ Grava `cargo_oficial`, NUNCA `job_title` — aquele é do Nexus, o sync o
   reescreve e ele decide o acesso (ver o comentário no `schema.prisma`). */
export async function POST(req: Request) {
  const session = await auth()
  if (!(await podeAdministrar(session?.user?.email))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const body = (await req.json().catch(() => null)) as { id?: string; cargo?: string | null } | null
  const id = (body?.id ?? '').trim()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  // '' → null (limpa). Espaços repetidos viram um só; teto de 120 caracteres.
  const cargo = (body?.cargo ?? '').replace(/\s+/g, ' ').trim()
  if (cargo.length > 120) return NextResponse.json({ error: 'Cargo com mais de 120 caracteres' }, { status: 400 })

  const r = await prisma.user.updateMany({ where: { id }, data: { cargoOficial: cargo || null } })
  if (r.count === 0) return NextResponse.json({ error: 'Pessoa não encontrada' }, { status: 404 })
  return NextResponse.json({ ok: true, cargo: cargo || null })
}
