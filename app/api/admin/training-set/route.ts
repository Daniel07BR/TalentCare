import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

type Item = { nome: string; ano: string }

// Salva cursos/treinamentos + certificações (listas livres) de uma pessoa.
export async function POST(req: Request) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const body = (await req.json().catch(() => null)) as
    | { nexusUserId?: string; cursos?: Item[]; certs?: Item[] }
    | null
  const nexusUserId = (body?.nexusUserId ?? '').trim()
  if (!nexusUserId) return NextResponse.json({ error: 'nexusUserId obrigatório' }, { status: 400 })

  // Sanitiza: só itens com nome; ano é texto livre opcional.
  const clean = (arr?: Item[]) =>
    (Array.isArray(arr) ? arr : [])
      .map((i) => ({ nome: (i?.nome ?? '').trim(), ano: (i?.ano ?? '').trim() }))
      .filter((i) => i.nome)

  const cursos = clean(body?.cursos)
  const certs = clean(body?.certs)

  if (cursos.length === 0 && certs.length === 0) {
    await prisma.employeeTraining.deleteMany({ where: { nexusUserId } })
  } else {
    await prisma.employeeTraining.upsert({
      where: { nexusUserId },
      create: { nexusUserId, cursos, certs },
      update: { cursos, certs },
    })
  }
  return NextResponse.json({ ok: true })
}
