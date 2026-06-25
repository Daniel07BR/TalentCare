import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { periodDays } from '@/lib/period-range'
import type { Period } from '@/lib/mock/dashboard'

// Linha do tempo REAL de atividade cross-sistema de UMA pessoa, montada a partir
// dos espelhos diários locais (frente B). Cada dia COM atividade em um sistema vira
// um evento ("HelpDesk · ontem · resolveu 8 chamados"). É granularidade DIÁRIA
// (o espelho não guarda cada chamado/título individual) — fiel e period-aware.

type Ev = { system: string; color: string; action: string; detail: string; day: string; when: string }

// Rótulo relativo a partir do dia (YYYY-MM-DD).
function whenLabel(day: string, now: Date): string {
  const d = new Date(`${day}T12:00:00Z`)
  const today = new Date(`${now.toISOString().slice(0, 10)}T12:00:00Z`)
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
  if (diff <= 0) return 'hoje'
  if (diff === 1) return 'ontem'
  if (diff < 7) return `há ${diff} dias`
  if (diff < 14) return 'há 1 semana'
  if (diff < 30) return `há ${Math.floor(diff / 7)} semanas`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })
}

const plural = (n: number, s: string, p: string) => `${n.toLocaleString('pt-BR')} ${n === 1 ? s : p}`

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id') ?? ''
  const period = (req.nextUrl.searchParams.get('period') as Period) || '30d'
  const { fromDay, toDay } = periodDays(period)
  const user = await prisma.user.findUnique({ where: { id }, select: { nexusUserId: true, name: true } })
  if (!user) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })

  const nx = user.nexusUserId
  const range = { day: { gte: fromDay, lte: toDay } }
  const take = 30
  const ord = { day: 'desc' as const }

  const [hd, cls, cide, cons, radio, wpp] = await Promise.all([
    nx ? prisma.helpdeskDaily.findMany({ where: { nexusUserId: nx, ...range }, orderBy: ord, take }) : [],
    nx ? prisma.classroomDaily.findMany({ where: { nexusUserId: nx, ...range }, orderBy: ord, take }) : [],
    nx ? prisma.cideDaily.findMany({ where: { nexusUserId: nx, ...range }, orderBy: ord, take }) : [],
    nx ? prisma.consultoriaDaily.findMany({ where: { nexusUserId: nx, ...range }, orderBy: ord, take }) : [],
    nx ? prisma.radioDaily.findMany({ where: { nexusUserId: nx, ...range }, orderBy: ord, take }) : [],
    prisma.whatsappAttendantDaily.groupBy({ by: ['day'], where: { name: user.name, ...range }, _sum: { abertos: true, finalizados: true }, orderBy: { day: 'desc' }, take }),
  ])

  const now = new Date()
  const evs: Ev[] = []
  const push = (system: string, color: string, day: string, action: string, detail: string) =>
    evs.push({ system, color, action, detail, day, when: whenLabel(day, now) })

  for (const r of hd) {
    const resolved = r.resolved + r.formalized
    if (resolved > 0) {
      const det: string[] = []
      if (r.opened > 0) det.push(plural(r.opened, 'chamado aberto', 'chamados abertos'))
      if (r.formalized > 0) det.push(plural(r.formalized, 'formalizado', 'formalizados'))
      push('HelpDesk', 'var(--chart-4)', r.day, `Resolveu ${plural(resolved, 'chamado', 'chamados')}`, det.join(' · ') || 'no HelpDesk')
    } else if (r.opened > 0) {
      push('HelpDesk', 'var(--chart-4)', r.day, `Abriu ${plural(r.opened, 'chamado', 'chamados')}`, 'no HelpDesk')
    }
  }
  for (const r of cls) {
    const parts: string[] = []
    if (r.courses > 0) parts.push(plural(r.courses, 'curso concluído', 'cursos concluídos'))
    if (r.created > 0) parts.push(plural(r.created, 'curso criado', 'cursos criados'))
    if (r.videos > 0) parts.push(plural(r.videos, 'vídeo assistido', 'vídeos assistidos'))
    if (parts.length) push('ClassRoom', 'var(--chart-2)', r.day, parts[0].charAt(0).toUpperCase() + parts[0].slice(1), parts.slice(1).join(' · ') || 'no ClassRoom')
  }
  for (const r of cide) {
    if (r.atividades > 0) push('CIDE', 'var(--chart-5)', r.day, `Registrou ${plural(r.atividades, 'atividade', 'atividades')}`, 'alterações no cadastro geral')
  }
  for (const r of cons) {
    const parts: string[] = []
    if (r.studies > 0) parts.push(plural(r.studies, 'estudo publicado', 'estudos publicados'))
    if (r.tickets > 0) parts.push(plural(r.tickets, 'chamado aberto', 'chamados abertos'))
    if (r.messages > 0) parts.push(plural(r.messages, 'mensagem', 'mensagens'))
    if (r.comments > 0) parts.push(plural(r.comments, 'comentário', 'comentários'))
    if (parts.length) push('Consultoria Plus', 'var(--chart-3)', r.day, parts[0].charAt(0).toUpperCase() + parts[0].slice(1), parts.slice(1).join(' · ') || 'no Consultoria Plus')
  }
  for (const r of wpp) {
    const ab = r._sum.abertos ?? 0
    const fi = r._sum.finalizados ?? 0
    if (ab > 0 || fi > 0) push('Painel de Atendimento', 'var(--chart-1)', r.day, `${plural(ab, 'atendimento', 'atendimentos')} no WhatsApp`, fi > 0 ? plural(fi, 'finalizado', 'finalizados') : 'abertos no dia')
  }
  for (const r of radio) {
    const h = Math.round(r.seconds / 3600)
    if (h > 0) push('Rádio', 'var(--info)', r.day, `Ouviu ${plural(h, 'hora', 'horas')} de rádio`, plural(r.sessions, 'sessão', 'sessões'))
  }

  // Mais recentes primeiro; limita a 15 eventos.
  evs.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0))
  return NextResponse.json({ period, timeline: evs.slice(0, 15) })
}
