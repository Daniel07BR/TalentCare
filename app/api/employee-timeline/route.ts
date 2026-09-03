import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { rangeDaRequisicao } from '@/lib/period-range'
import { quemEh, podeVer } from '@/lib/avaliacoes/regua'
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
  const { period, fromDay, toDay } = rangeDaRequisicao(req)
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, nexusUserId: true, name: true, departmentId: true },
  })
  if (!user) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })

  /*
   * ⚠️⚠️ A RÉGUA FINA. Esta rota expõe os números de UMA pessoa por `?id=`, e o
   * gate do middleware não alcança isso: ele só conhece o caminho, e o caminho é
   * o mesmo para todo mundo. Sem esta linha, no dia em que o sistema abrir, um
   * gestor do Fiscal puxaria a ficha de qualquer pessoa do Contábil trocando o
   * id na URL — e nada apareceria em log nenhum.
   */
  const quem = await quemEh((session.user as { id: string }).id)
  if (!quem || !podeVer(quem, user)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const nx = user.nexusUserId
  const range = { day: { gte: fromDay, lte: toDay } }
  const take = 30
  const ord = { day: 'desc' as const }

  const [hd, cls, cide, cons, radio, wpp, ger, chat] = await Promise.all([
    nx ? prisma.helpdeskDaily.findMany({ where: { nexusUserId: nx, ...range }, orderBy: ord, take }) : [],
    nx ? prisma.classroomDaily.findMany({ where: { nexusUserId: nx, ...range }, orderBy: ord, take }) : [],
    nx ? prisma.cideDaily.findMany({ where: { nexusUserId: nx, ...range }, orderBy: ord, take }) : [],
    nx ? prisma.consultoriaDaily.findMany({ where: { nexusUserId: nx, ...range }, orderBy: ord, take }) : [],
    nx ? prisma.radioDaily.findMany({ where: { nexusUserId: nx, ...range }, orderBy: ord, take }) : [],
    prisma.whatsappAttendantDaily.groupBy({ by: ['day'], where: { name: user.name, ...range }, _sum: { abertos: true, finalizados: true }, orderBy: { day: 'desc' }, take }),
    nx ? prisma.gerenciaDaily.findMany({ where: { nexusUserId: nx, ...range }, orderBy: ord, take }) : [],
    nx ? prisma.chatDaily.findMany({ where: { nexusUserId: nx, ...range }, orderBy: ord, take }) : [],
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
  // GERÊNCIA — entrega na rua e demanda de escritório no mesmo dia.
  for (const r of ger) {
    const saiu: string[] = []
    if (r.servicos > 0) saiu.push(plural(r.servicos, 'serviço entregue', 'serviços entregues'))
    if (r.km > 0) saiu.push(`${r.km} km`)
    if (r.saidas > 0) saiu.push(plural(r.saidas, 'saída', 'saídas'))
    if (r.viagens > 0) saiu.push(plural(r.viagens, 'viagem (fora do estado)', 'viagens (fora do estado)'))
    if (saiu.length) push('Gerência', 'var(--chart-2)', r.day, saiu[0].charAt(0).toUpperCase() + saiu[0].slice(1), saiu.slice(1).join(' · ') || 'na mensageria')
    const esc: string[] = []
    if (r.protAbertos > 0) esc.push(plural(r.protAbertos, 'protocolo aberto', 'protocolos abertos'))
    if (r.servCriados > 0) esc.push(plural(r.servCriados, 'serviço criado', 'serviços criados'))
    if (r.protAprovados > 0) esc.push(plural(r.protAprovados, 'aprovação', 'aprovações'))
    if (r.datasAlteradas > 0) esc.push(plural(r.datasAlteradas, 'data alterada', 'datas alteradas'))
    if (esc.length) push('Gerência', 'var(--info)', r.day, esc[0].charAt(0).toUpperCase() + esc[0].slice(1), esc.slice(1).join(' · ') || 'na mensageria')
  }

  // CHAT INTERNO — chamado e conversa viram DOIS eventos no mesmo dia, de
  // propósito. Juntá-los daria "Concluiu 2 chamados · 340 mensagens", e a
  // segunda metade abafaria a primeira em toda linha do tempo.
  for (const r of chat) {
    const cham: string[] = []
    if (r.chamadosConcluidos > 0) cham.push(plural(r.chamadosConcluidos, 'chamado concluído', 'chamados concluídos'))
    if (r.chamadosAssumidos > 0) cham.push(plural(r.chamadosAssumidos, 'assumido', 'assumidos'))
    if (r.chamadosAbertos > 0) cham.push(plural(r.chamadosAbertos, 'chamado aberto', 'chamados abertos'))
    if (cham.length) push('Chat Interno', 'var(--chart-3)', r.day, cham[0].charAt(0).toUpperCase() + cham[0].slice(1), cham.slice(1).join(' · ') || 'nos chamados entre setores')
    const msgs = r.msgCanais + r.msgDiretas + r.msgChamados
    if (msgs > 0) {
      const onde: string[] = []
      if (r.msgCanais > 0) onde.push(`${r.msgCanais.toLocaleString('pt-BR')} em canais`)
      if (r.msgDiretas > 0) onde.push(`${r.msgDiretas.toLocaleString('pt-BR')} em conversas diretas`)
      if (r.msgChamados > 0) onde.push(`${r.msgChamados.toLocaleString('pt-BR')} em chamados`)
      push('Chat Interno', 'var(--info)', r.day, `Escreveu ${plural(msgs, 'mensagem', 'mensagens')}`, onde.join(' · '))
    }
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
