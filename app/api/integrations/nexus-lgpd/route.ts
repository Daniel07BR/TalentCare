import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db/prisma'
import { gravarMedidaLgpd } from '@/lib/lgpd'

/* ============================================================
   RECEPTOR DO PUSH DE MEDIDA DE LGPD (server-to-server).

   O Nexus chama aqui no instante em que uma advertência ou suspensão por
   vazamento de dados é registrada em `/lgpd`. É o caminho RÁPIDO; a rede de
   segurança é `run-lgpd-sync.mjs`, que relê o histórico inteiro — push que
   falha, falha calado (servidor fora do ar, rota mudada), e o contrato de
   integração é explícito sobre isso.

   Auth: header X-Nexus-Lgpd-Key == NEXUS_API_KEY deste sistema, comparado com
   `timingSafeEqual`.

   ⚠️ A medida chega SEM nome: o Nexus manda `nexusUserId`. Casar por nome é
   justamente o erro que o import do ponto cometeu ("Wendel Ribeiro da Silva" ×
   "Edileuza da Silva"), e aqui o preço seria uma suspensão na ficha errada.
   ============================================================ */

const NEXUS_API_KEY = process.env.NEXUS_API_KEY ?? ''

function keyOk(provided: string | null): boolean {
  if (!provided || !NEXUS_API_KEY) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(NEXUS_API_KEY)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  if (!keyOk(req.headers.get('x-nexus-lgpd-key'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { event?: string; medida?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  if (body.event !== 'medida' || !body.medida) {
    return NextResponse.json({ error: 'evento_desconhecido' }, { status: 400 })
  }

  const r = await gravarMedidaLgpd(prisma, body.medida)
  return NextResponse.json(r, { status: r.ok ? 200 : 400 })
}
