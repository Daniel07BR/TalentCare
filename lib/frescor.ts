import 'server-only'
import { prisma } from '@/lib/db/prisma'

/* ============================================================
   ATÉ QUANDO CADA ESPELHO FOI ALIMENTADO — a conta, num lugar só.

   Usada por `/api/frescor` (a frase do canto do painel) e pela aba "Fontes de
   dados" de Configurações (11/09/2026), que substituiu uma lista de "Sistemas
   conectados" com "Sync há 8 min" ESCRITO À MÃO no código — a mesma mentira do
   "Atualizado há 12 min" que esta conta nasceu para matar.

   ⚠️⚠️ Mede `max(day)` da TABELA, nunca o `sync_watermark`: o watermark avança
   mesmo quando o pull traz zero linha (ver `app/api/frescor/route.ts` e
   `docs/FONTES.md`).
   ============================================================ */
export type Fonte = { nome: string; ate: string | null; semCron?: boolean }

export async function frescorDasFontes(): Promise<Fonte[]> {
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
    /* ⚠️ Só o que veio do ponto: esta tela diz até quando cada FONTE mediu, e
       uma medida de LGPD registrada hoje faria o dump do ponto — que é import à
       mão e pode estar semanas atrás — parecer fresco. "Watermark recente não
       prova frescor", e aqui seria o watermark de outra fonte. */
    prisma.disciplinaEvento.aggregate({ where: { source: 'nexo' }, _max: { data: true } }),
  ])

  return [
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
    { nome: 'Ponto', ate: ponto._max.day, semCron: true },
    { nome: 'Disciplina', ate: disc._max.data, semCron: true },
  ]
}
