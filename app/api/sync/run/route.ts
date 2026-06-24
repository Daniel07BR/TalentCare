import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { syncRadio } from '@/lib/radio'

// Disparado pela animação de entrada ("Estamos preparando o sistema"). Roda o
// sync incremental das fontes (hoje: Rádio) a partir do último watermark. Qualquer
// usuário logado pode chamar (a entrada é gated por SSO).
export async function POST() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  try {
    const radio = await syncRadio()
    return NextResponse.json({ ok: true, radio })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
