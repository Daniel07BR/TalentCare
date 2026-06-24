import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { syncRadio } from '@/lib/radio'
import { syncWhatsapp } from '@/lib/whatsapp'

// Disparado pela animação de entrada ("Estamos preparando o sistema"). Roda o
// sync incremental das fontes (Rádio + WhatsApp) a partir do último watermark, em
// paralelo. Qualquer usuário logado pode chamar (a entrada é gated por SSO).
export async function POST() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const [radio, whatsapp] = await Promise.allSettled([syncRadio(), syncWhatsapp()])
  return NextResponse.json({
    ok: true,
    radio: radio.status === 'fulfilled' ? radio.value : { error: String(radio.reason) },
    whatsapp: whatsapp.status === 'fulfilled' ? whatsapp.value : { error: String(whatsapp.reason) },
  })
}
