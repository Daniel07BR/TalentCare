import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { syncRadio } from '@/lib/radio'
import { syncWhatsapp } from '@/lib/whatsapp'
import { syncClassroom } from '@/lib/classroom'
import { syncConsultoria } from '@/lib/consultoria'

// Disparado pela animação de entrada ("Estamos preparando o sistema"). Roda o
// sync incremental das fontes (Rádio + WhatsApp + ClassRoom + Consultoria Plus) a
// partir do último watermark, em paralelo. Qualquer logado pode chamar (entrada é SSO).
export async function POST() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const [radio, whatsapp, classroom, consultoria] = await Promise.allSettled([
    syncRadio(),
    syncWhatsapp(),
    syncClassroom(),
    syncConsultoria(),
  ])
  const val = (r: PromiseSettledResult<unknown>) => (r.status === 'fulfilled' ? r.value : { error: String(r.reason) })
  return NextResponse.json({ ok: true, radio: val(radio), whatsapp: val(whatsapp), classroom: val(classroom), consultoria: val(consultoria) })
}
