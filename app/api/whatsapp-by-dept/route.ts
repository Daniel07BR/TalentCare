import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import type { Period } from '@/lib/mock/dashboard'

// Proxy server-to-server: converte o período do dashboard (7d/30d/Trimestre/Ano)
// num range de datas REAL e puxa do Painel de Atendimento (.70) o resumo de
// atendimentos do WhatsApp por departamento (chamados abertos no período).
const BASE = process.env.PAINEL_BASE_URL!
const KEY = process.env.PAINEL_API_KEY!

const isoDay = (d: Date) => d.toISOString().slice(0, 10)

function rangeFor(period: Period): { from: string; to: string } {
  const to = new Date()
  let from: Date
  switch (period) {
    case '7d':
      from = new Date(to.getTime() - 7 * 86400_000)
      break
    case 'Trimestre': {
      const q = Math.floor(to.getMonth() / 3) * 3 // mês inicial do trimestre atual
      from = new Date(to.getFullYear(), q, 1)
      break
    }
    case 'Ano':
      from = new Date(to.getFullYear(), 0, 1)
      break
    case '30d':
    default:
      from = new Date(to.getTime() - 30 * 86400_000)
  }
  return { from: isoDay(from), to: isoDay(to) }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const period = (req.nextUrl.searchParams.get('period') as Period) || '30d'
  const { from, to } = rangeFor(period)
  try {
    const res = await fetch(`${BASE}/api/integrations/whatsapp-by-department?from=${from}&to=${to}`, {
      headers: { 'X-API-Key': KEY },
      cache: 'no-store',
    })
    if (!res.ok) {
      return NextResponse.json({ error: `Painel ${res.status}` }, { status: 502 })
    }
    const data = await res.json()
    return NextResponse.json({ from, to, ...data })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}
