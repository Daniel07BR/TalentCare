import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { rangeDaRequisicao } from '@/lib/period-range'
import { alcanceDeQuemLe, porNexus } from '@/lib/alcance'
import type { Period } from '@/lib/mock/dashboard'

// As MENSAGENS do Chat Interno no PERÍODO, lidas do espelho local.
//
// ⚠️⚠️ Os CHAMADOS saíram daqui em 16/09/2026 (foram para o Fluxo, e a rota
// deles é `/api/fluxo-metrics`). Não ficou cópia: duas rotas somando o mesmo
// pedido, uma delas parada no dia da migração, é o defeito que ninguém percebe
// até alguém comparar os dois números.
export async function GET(req: NextRequest) {
  /* ⚠️⚠️ ESTA ROTA DEVOLVIA A EMPRESA INTEIRA para qualquer sessão autenticada.
     O middleware não alcança isto: ele conhece o caminho, e o caminho é igual
     para todo setor. Ver `lib/alcance.ts`. */
  const alcance = await alcanceDeQuemLe()
  if (!alcance) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { period, fromDay, toDay } = rangeDaRequisicao(req)
  const range = { day: { gte: fromDay, lte: toDay } }

  const [rows, primeiro] = await Promise.all([
    prisma.chatDaily.groupBy({
      by: ['nexusUserId'],
      where: { ...range, ...porNexus(alcance) },
      _sum: {
        msgCanais: true, msgDiretas: true, msgChamados: true,
      },
    }),
    // ⚠️ Desde quando HÁ dado. A tela avisa, senão o filtro de Ano parece bug:
    // o histórico de mensagem vem do import do Mattermost, com a data original,
    // e é muito mais antigo que o resto do sistema.
    // ⚠️ Recortado também: o dia mais antigo da EMPRESA diria a quem lê desde
    // quando existe dado de gente que ele não alcança.
    prisma.chatDaily.aggregate({ where: porNexus(alcance), _min: { day: true } }),
  ])

  const byUser = rows.map((r) => ({
    nexusUserId: r.nexusUserId,
    msgCanais: r._sum.msgCanais ?? 0,
    msgDiretas: r._sum.msgDiretas ?? 0,
    msgChamados: r._sum.msgChamados ?? 0,
  }))

  return NextResponse.json({ period, fromDay, toDay, desde: primeiro._min.day ?? null, byUser })
}
