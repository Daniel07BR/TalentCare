import { NextRequest, NextResponse } from 'next/server'
import { alcanceDeQuemLe } from '@/lib/alcance'
import { rangeDaRequisicao } from '@/lib/period-range'
import type { Period } from '@/lib/mock/dashboard'

export const dynamic = 'force-dynamic'

// Lista de cursos criados NO PERÍODO, puxada ao vivo do ClassRoom (.71) p/ o
// drill-down "Cursos criados por departamento". Uma linha por (curso, criador);
// o depto é resolvido no cliente pelo criador (mesma atribuição do agregado).
type Course = { courseId: string; title: string; createdAt: string; creatorNexusUserId: string }

export async function GET(req: NextRequest) {
  /* ⚠️⚠️ Esta era a ÚNICA rota agregada que ficou fora de `lib/alcance.ts`: ela
     devolvia os cursos da EMPRESA INTEIRA (título e autor) para qualquer sessão
     — gestor incluído, desde que a chefia entrou em 10/09/2026. Achado em
     11/09, ao pôr o detalhe do ClassRoom dentro do relatório do setor: a tela
     filtraria, e o payload continuaria levando o resto da casa. */
  const alcance = await alcanceDeQuemLe()
  if (!alcance) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const alcancaAutor = (nx: string) => alcance.tipo === 'tudo' || alcance.nexusIds.includes(nx)
  const { period, fromDay, toDay } = rangeDaRequisicao(req)
  const from = `${fromDay}T00:00:00.000Z`
  // ⚠️ O fim do intervalo é o FIM DO DIA `toDay`, e não "agora": com o
  // calendário, `toDay` pode ser uma data passada, e usar `agora` traria tudo
  // o que veio depois dela — o filtro pareceria não funcionar.
  const to = `${toDay}T23:59:59.999Z`

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
    return NextResponse.json({ period, courses: (data.courses ?? []).filter((c) => alcancaAutor(c.creatorNexusUserId)) })
  } catch {
    return NextResponse.json({ period, courses: [] as Course[] })
  }
}
