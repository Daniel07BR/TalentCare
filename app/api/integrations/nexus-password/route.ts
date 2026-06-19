import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db/prisma'

// Receptor do PUSH de senha do Nexus (server-to-server). O Nexus chama aqui
// sempre que a senha de um funcionário muda, mandando o hash bcrypt para
// espelharmos na hora (o sync periódico é a rede de segurança). A senha é
// propriedade do Nexus; aqui só gravamos o hash para o login local offline.
//
// Auth: header X-Nexus-Password-Key == NEXUS_API_KEY deste sistema.
const NEXUS_API_KEY = process.env.NEXUS_API_KEY ?? ''

function keyOk(provided: string | null): boolean {
  if (!provided || !NEXUS_API_KEY) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(NEXUS_API_KEY)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  if (!keyOk(req.headers.get('x-nexus-password-key'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { nexusUserId?: string; passwordHash?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { nexusUserId, passwordHash } = body
  if (!nexusUserId || !passwordHash) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { nexusUserId } })
  if (!user) {
    // Ainda não sincronizado aqui — não é erro; o próximo sync traz o hash.
    return NextResponse.json({ ok: true, updated: false })
  }

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })
  return NextResponse.json({ ok: true, updated: true })
}
