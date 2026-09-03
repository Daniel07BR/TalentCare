import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { rangeDaRequisicao } from '@/lib/period-range'
import { alcanceDeQuemLe, porPersonKey } from '@/lib/alcance'
import { coberturaDoPonto, janelaTemDado, motivoSemPonto } from '@/lib/ponto-cobertura'
import type { Period } from '@/lib/mock/dashboard'

// Assiduidade (ponto) por pessoa NO PERÍODO, lida dos espelhos locais
// (assiduidade_daily + disciplina_evento). A página mescla com a identidade
// (useTalentData) p/ montar leaderboards/por depto respeitando o filtro de dias.
export async function GET(req: NextRequest) {
  /* ⚠️⚠️ Devolvia a empresa inteira para qualquer sessão. Ver `lib/alcance.ts`. */
  const alcance = await alcanceDeQuemLe()
  if (!alcance) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { period, fromDay, toDay } = rangeDaRequisicao(req)

  const [pontoRows, advRows, atrasoPorDia] = await Promise.all([
    prisma.assiduidadeDaily.groupBy({
      by: ['personKey'],
      // ⚠️ `personKey` = `nexusUserId ?? id` — cobre o STAFF sem conta no Nexus.
      where: { day: { gte: fromDay, lte: toDay }, ...porPersonKey(alcance) },
      _sum: { atrasos: true, atrasosAbon: true, minutosAtraso: true },
    }),
    prisma.disciplinaEvento.groupBy({
      by: ['personKey'],
      where: { tipo: 'advertencia', data: { gte: fromDay, lte: toDay }, ...porPersonKey(alcance) },
      _count: { _all: true },
    }),
    /* A série DIÁRIA de atrasos na janela — é o que a sparkline do KPI desenha.
       ⚠️ Vem do mesmo `where` do número, para o gráfico e o número não
       responderem a perguntas diferentes lado a lado. */
    prisma.assiduidadeDaily.groupBy({
      by: ['day'],
      where: { day: { gte: fromDay, lte: toDay }, ...porPersonKey(alcance) },
      _sum: { atrasos: true },
    }),
  ])

  const advByKey = new Map(advRows.map((r) => [r.personKey, r._count._all]))
  const keys = new Set<string>([...pontoRows.map((r) => r.personKey), ...advByKey.keys()])
  const byPerson = [...keys].map((personKey) => {
    const p = pontoRows.find((r) => r.personKey === personKey)
    return {
      personKey,
      atrasos: p?._sum.atrasos ?? 0,
      abonados: p?._sum.atrasosAbon ?? 0,
      minutos: p?._sum.minutosAtraso ?? 0,
      advertencias: advByKey.get(personKey) ?? 0,
    }
  })

  /* ⚠️⚠️ A JANELA FOI MEDIDA? O ponto entra por IMPORT À MÃO, não por cron — é a
     única das dez fontes sem cron. Em 03/09/2026 os oito espelhos de atividade
     estavam em `max(day) = 2026-09-03` e o ponto parava em **25/06**: em "7
     dias", "30 dias" e "Trimestre atual" o `groupBy` acima devolve VAZIO, e a
     tela lê vazio como **zero atraso** — "ninguém se atrasou este mês", que é
     uma frase que o sistema não tem como sustentar.

     Quem responde é `lib/ponto-cobertura.ts`, o MESMO arquivo que responde para
     o `/api/score-metrics` e para o dataset. Três cópias desta pergunta
     divergiriam em silêncio, e a que mente é sempre a mais tranquilizadora. */
  const cob = await coberturaDoPonto()
  const janelaComPonto = janelaTemDado(cob, fromDay, toDay)

  return NextResponse.json({
    period, fromDay, toDay, byPerson,
    porDia: atrasoPorDia
      .map((r) => ({ day: r.day, atrasos: r._sum.atrasos ?? 0 }))
      .sort((a, b) => a.day.localeCompare(b.day)),
    janelaComPonto,
    motivoSemPonto: janelaComPonto ? null : motivoSemPonto(cob, true, false),
    /* ⚠️ AS DUAS PONTAS, não só a de cima. `janelaTemDado` é um sim/não por
       sobreposição — certo para decidir se a métrica existe. Mas a sparkline
       desenha bucket a bucket: em "Ano corrente" são 9 meses contra um ponto que
       termina em 25/06, e os buckets de jul/ago/set saíam **zerados**, com o
       cartão dizendo "no período". A curva despencava a zero e lia-se "o
       problema de atraso acabou em julho". Bucket fora da cobertura não é zero,
       é ausência — e não entra na série. */
    pontoDesde: cob.primeiroDia,
    pontoAte: cob.ultimoDia,
  })
}
