import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { rangeDaRequisicao } from '@/lib/period-range'
import { alcanceDeQuemLe, porPersonKey } from '@/lib/alcance'
import { coberturaDoPonto } from '@/lib/ponto-cobertura'

/* ============================================================
   O MAPA DE ATRASOS DA CASA — as linhas do ponto da janela, uma por pessoa e dia
   (painel principal, 11/09/2026, pedido do dono: "a assiduidade e disciplina com
   os calendários interativos, assim como tem nos departamentos").

   ⚠️ Devolve as LINHAS, não o agregado: o painel precisa das duas coisas — a cor
   de cada dia (quantas pessoas) e quem está atrás dela —, e as duas têm de sair
   das MESMAS linhas, senão o quadro diz "7 pessoas" e a lista mostra 6 (a regra
   do mapa do setor, em `/api/dept-metrics`). Quem agrupa é
   `lib/painel/visao.ts` (`mapaDaCasa`), que também escolhe a população.

   ⚠️ Formato compacto (arrays, chave indexada): "Ano corrente" são ~1.400
   linhas, e o nginx da casa não comprime JSON.

   Régua de dado: `porPersonKey(alcance)`, a mesma de `/api/assiduidade-metrics`.
   ============================================================ */
export async function GET(req: NextRequest) {
  const alcance = await alcanceDeQuemLe()
  if (!alcance) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { period, fromDay, toDay } = rangeDaRequisicao(req)

  const [linhas, cob] = await Promise.all([
    prisma.assiduidadeDaily.findMany({
      where: { day: { gte: fromDay, lte: toDay }, ...porPersonKey(alcance) },
      select: {
        personKey: true, day: true, atrasos: true, atrasosAbon: true, minutosAtraso: true,
        atrasosAte5: true, atrasosAte30: true, atrasosMais30: true,
      },
      orderBy: [{ day: 'asc' }, { minutosAtraso: 'desc' }],
    }),
    coberturaDoPonto(),
  ])

  const chaves = [...new Set(linhas.map((l) => l.personKey))]
  const idx = new Map(chaves.map((k, i) => [k, i]))
  return NextResponse.json({
    period, fromDay, toDay,
    pontoAte: cob.ultimoDia,
    // ⚠️ A ponta de baixo também: antes dela o calendário não pode dizer "limpo".
    pontoDesde: cob.primeiroDia,
    chaves,
    /** [dia, índice da chave, atrasos, abonados, minutos, até 5 min, até 30, mais de 30] */
    linhas: linhas.map((l) => [
      l.day, idx.get(l.personKey)!, l.atrasos ?? 0, l.atrasosAbon ?? 0, l.minutosAtraso ?? 0,
      l.atrasosAte5 ?? 0, l.atrasosAte30 ?? 0, l.atrasosMais30 ?? 0,
    ]),
  })
}
