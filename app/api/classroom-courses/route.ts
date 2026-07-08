import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { periodDays } from '@/lib/period-range'
import type { Period } from '@/lib/mock/dashboard'

export const dynamic = 'force-dynamic'

// Lista de cursos criados NO PERÍODO, puxada ao vivo do ClassRoom (.71) p/ o
// drill-down "Cursos criados por departamento". Uma linha por (curso, criador);
// o depto é resolvido no cliente pelo criador (mesma atribuição do agregado).
type Course = { courseId: string; title: string; createdAt: string; creatorNexusUserId: string }

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const period = (req.nextUrl.searchParams.get('period') as Period) || '30d'
  const { fromDay } = periodDays(period)
  const from = `${fromDay}T00:00:00.000Z`
  const to = new Date().toISOString()

  const base = process.env.CLASSROOM_BASE_URL
  const key = process.env.CLASSROOM_INTEGRATION_KEY
  if (!base || !key) {
    return NextResponse.json({ period, courses: [] as Course[] })
  }
  try {
    const qs = new URLSearchParams({ from, to })
    const res = await fetch(`${base}/api/integrations/talent-courses-created?${qs.toString()}`, {
      headers: { 'x-integration-key': key },
      cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json({ period, courses: [] as Course[] })
    const data = (await res.json()) as { ok: boolean; courses: Course[] }
    return NextResponse.json({ period, courses: data.courses ?? [] })
  } catch {
    return NextResponse.json({ period, courses: [] as Course[] })
  }
}
