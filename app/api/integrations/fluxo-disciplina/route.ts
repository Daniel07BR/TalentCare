import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db/prisma'
import { gravarDisciplinaDoFluxo, type EnvioDoFluxo } from '@/lib/fluxo-disciplina'

/* ============================================================
   RECEPTOR DOS ATRASOS E DA DISCIPLINA DO FLUXO (server-to-server, 14/10/2026).

   O Fluxo chama aqui a cada gravação no controle de atrasos do DP, com o MÊS
   INTEIRO, e de hora em hora com o mês corrente e o anterior (a rede de
   segurança de um envio que falhou). Ver `lib/fluxo-disciplina.ts`.

   Auth: header X-API-Key == FLUXO_API_KEY deste sistema (a mesma chave com que
   o TalentCare lê o Fluxo — lá ela se chama TALENTCARE_API_KEY), comparado com
   `timingSafeEqual`.
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
  let corpo: EnvioDoFluxo
  try {
    corpo = await req.json()
  } catch {
    return NextResponse.json({ ok: false, erro: 'invalid_body' }, { status: 400 })
  }
  const r = await gravarDisciplinaDoFluxo(prisma, corpo)
  return NextResponse.json(r, { status: r.ok ? 200 : 400 })
}
