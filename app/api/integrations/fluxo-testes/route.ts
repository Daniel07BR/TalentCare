import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db/prisma'
import { gravarTestesDoFluxo, type EnvioDosTestes } from '@/lib/fluxo-testes'

/* ============================================================
   RECEPTOR DOS TESTES DA ENTREVISTA DE EMPREGO (server-to-server, 22/10/2026).

   O Fluxo chama aqui quando a Recepção vincula o candidato contratado a um
   funcionário, e sempre que os testes daquela entrevista mudam. Ver
   `lib/fluxo-testes.ts`.

   Auth: a mesma da disciplina — X-API-Key == FLUXO_API_KEY deste sistema (lá
   ela se chama TALENTCARE_API_KEY), comparado com `timingSafeEqual`.
   ============================================================ */

const CHAVE = process.env.FLUXO_API_KEY ?? ''

function chaveOk(recebida: string | null): boolean {
  if (!recebida || !CHAVE) return false
  const a = Buffer.from(recebida)
  const b = Buffer.from(CHAVE)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  if (!chaveOk(req.headers.get('x-api-key'))) {
    return NextResponse.json({ ok: false, erro: 'unauthorized' }, { status: 401 })
  }
  let corpo: EnvioDosTestes
  try {
    corpo = await req.json()
  } catch {
    return NextResponse.json({ ok: false, erro: 'invalid_body' }, { status: 400 })
  }
  const { status, ...r } = await gravarTestesDoFluxo(prisma, corpo)
  return NextResponse.json(r, { status })
}
