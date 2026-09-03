import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

/* ============================================================
   ATÉ QUANDO CADA ESPELHO FOI ALIMENTADO.

   ⚠️⚠️ Existe para substituir a frase **"Atualizado há 12 min"**, que estava
   cravada no JSX do painel desde o primeiro desenho e não vinha de lugar nenhum.
   Ela aparecia igual num painel fresco e num painel morto — e o `tc-vigia.sh`
   deste mesmo repositório já a citava, por escrito, como o exemplo do que dá
   errado aqui: *"o rádio ficou 39 dias parado e o WhatsApp congelou — os crons
   rodavam, nada estourava, e o painel dizia 'atualizado há 12 min'"*.

   ⚠️⚠️ Mede `max(day)` da TABELA, nunca o `sync_watermark`. O watermark avança
   mesmo quando o pull traz zero linha: em 07/08/2026 dois dos seis espelhos
   estavam mortos havia semanas com os seis crons "rodando com sucesso". A regra
   está em `docs/FONTES.md` — watermark recente NÃO prova frescor.

   ⚠️ O rótulo mostra o espelho MAIS ATRASADO, não a média nem o mais recente. Um
   painel é tão fresco quanto a fonte mais velha que ele soma, e o número que
   tranquiliza é justamente o que não se quer aqui. Em 03/09/2026: oito fontes em
   2026-09-03 e o ponto em 2026-06-25 — o painel diz 25/06.
   ============================================================ */
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const [cls, radio, wpp, cide, hd, cons, ger, chat, ponto, disc] = await Promise.all([
    prisma.classroomDaily.aggregate({ _max: { day: true } }),
    prisma.radioDaily.aggregate({ _max: { day: true } }),
    prisma.whatsappDaily.aggregate({ _max: { day: true } }),
    prisma.cideDaily.aggregate({ _max: { day: true } }),
    prisma.helpdeskDaily.aggregate({ _max: { day: true } }),
    prisma.consultoriaDaily.aggregate({ _max: { day: true } }),
    prisma.gerenciaDaily.aggregate({ _max: { day: true } }),
    prisma.chatDaily.aggregate({ _max: { day: true } }),
    prisma.assiduidadeDaily.aggregate({ _max: { day: true } }),
    prisma.disciplinaEvento.aggregate({ _max: { data: true } }),
  ])

  const fontes = [
    { nome: 'ClassRoom', ate: cls._max.day },
    { nome: 'Rádio', ate: radio._max.day },
    { nome: 'Painel de Atendimento', ate: wpp._max.day },
    { nome: 'CIDE', ate: cide._max.day },
    { nome: 'HelpDesk', ate: hd._max.day },
    { nome: 'Consultoria Plus', ate: cons._max.day },
    { nome: 'Gerência', ate: ger._max.day },
    { nome: 'Chat Interno', ate: chat._max.day },
    // ⚠️ As duas sem cron: entram por import à mão, e é sempre uma delas que
    // atrasa. ⚠️⚠️ E são DUAS linhas, não uma: a disciplina termina em 11/06 e o
    // ponto em 25/06 — anunciar só o ponto daria o painel por 14 dias mais fresco
    // do que ele é, que é exatamente o erro do "Atualizado há 12 min".
    { nome: 'Ponto', ate: ponto._max.day },
    { nome: 'Disciplina', ate: disc._max.data },
  ]

  const comDado = fontes.filter((f): f is { nome: string; ate: string } => !!f.ate)
  const maisAtrasada = comDado.length
    ? comDado.reduce((a, b) => (a.ate <= b.ate ? a : b))
    : null

  return NextResponse.json({ fontes, maisAtrasada })
}
