import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { rangeDaRequisicao } from '@/lib/period-range'
import { quemEh, podeVer } from '@/lib/avaliacoes/regua'

export const dynamic = 'force-dynamic'

/* ============================================================
   O QUE UMA PESSOA ASSISTIU E CONCLUIU no ClassRoom, no período do filtro.

   Pedido do dono (11/09/2026): "ao clicar na pessoa, exibir no ClassRoom os
   cursos assistidos e concluídos". Busca ao vivo no ClassRoom (.71), rota
   `talent-user-learning`, que usa as MESMAS definições do espelho diário — a
   lista tem o tamanho do "vídeos/cursos concluídos" ao lado do nome.

   ⚠️⚠️ A régua é a da FICHA (`podeVer`): quem não pode abrir a ficha da pessoa
   não vê o que ela estudou. Título de curso é dado de trabalho, mas a lista do
   que alguém fez ou deixou de fazer é sobre a pessoa, e a pessoa tem régua.
   ============================================================ */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id') ?? ''
  const alvo = await prisma.user.findUnique({ where: { id }, select: { id: true, departmentId: true, nexusUserId: true } })
  if (!alvo) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })
  const quem = await quemEh((session.user as { id: string }).id)
  if (!quem || !podeVer(quem, alvo)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { fromDay, toDay } = rangeDaRequisicao(req)
  const vazio = { fromDay, toDay, videos: [], cursos: [] }
  // Sem conta no Nexus não há como casar com o ClassRoom — não é "não estudou".
  if (!alvo.nexusUserId) return NextResponse.json({ ...vazio, semConta: true })

  const base = process.env.CLASSROOM_BASE_URL, key = process.env.CLASSROOM_INTEGRATION_KEY
  if (!base || !key) return NextResponse.json({ ...vazio, erro: 'ClassRoom não configurado' }, { status: 502 })
  try {
    const qs = new URLSearchParams({ nexusUserId: alvo.nexusUserId, fromDay, toDay })
    const r = await fetch(`${base}/api/integrations/talent-user-learning?${qs}`, { headers: { 'x-integration-key': key }, cache: 'no-store' })
    if (!r.ok) return NextResponse.json({ ...vazio, erro: `ClassRoom respondeu ${r.status}` }, { status: 502 })
    const j = await r.json() as { videos: unknown[]; cursos: unknown[] }
    return NextResponse.json({ fromDay, toDay, videos: j.videos ?? [], cursos: j.cursos ?? [] })
  } catch {
    // ⚠️ ClassRoom fora do ar é ERRO, e a tela diz — lista vazia aqui se leria
    // "não estudou nada", que é justamente o que não se sabe.
    return NextResponse.json({ ...vazio, erro: 'ClassRoom fora do ar' }, { status: 502 })
  }
}
