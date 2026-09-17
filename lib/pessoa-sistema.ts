import 'server-only'
import { prisma } from '@/lib/db/prisma'

/* ============================================================
   O QUE UMA PESSOA FEZ EM UM SISTEMA, no período — o que abre ao clicar no nome
   dela nos resumos (pedido do dono, 11/09/2026: "faça o mesmo nos outros
   sistemas ao clicar na pessoa", depois do ClassRoom).

   Duas origens, e a tela diz qual:
   - AO VIVO (ClassRoom, HelpDesk, CIDE, Consultoria, Gerência): cada sistema
     ganhou `talent-pessoa` (ou `talent-user-learning`), com as MESMAS regras da
     rota diária que alimenta o número ao lado do nome — conferido 1:1 contra o
     espelho em 11/09/2026. No dia de hoje a lista pode ter um item a mais: o
     espelho sincroniza de hora em hora.
   - FLUXO (os CHAMADOS): ao vivo, com a lista e o assunto — liberado pelo dono
     em 11/09/2026 ("pode mostrar os chamados do chat também") e mantido quando
     eles mudaram de casa, em 16/09/2026. ⚠️ Se o Fluxo não responder, cai para
     a contagem por dia do espelho, COM AVISO.
   - CHAT: só a contagem de MENSAGENS por dia, do espelho — o texto das
     conversas não sai do Chat, e isso não mudou.
   - DO ESPELHO, dia a dia (WhatsApp, Rádio, Assiduidade):
     ⚠️ o WhatsApp é conversa com CLIENTE (nome e telefone de terceiros);
     Rádio e Assiduidade já estão inteiros no espelho.
   ============================================================ */

import type { Item, Grupo, Detalhe, Sistema } from '@/lib/pessoa-sistema-tipos'
export { SISTEMAS, type Sistema } from '@/lib/pessoa-sistema-tipos'

type Pessoa = { id: string; name: string; nexusUserId: string | null }
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`
const horas = (seg: number) => { const h = Math.floor(seg / 3600), m = Math.round((seg % 3600) / 60); return h ? `${h}h ${String(m).padStart(2, '0')}min` : `${m}min` }

/* ── AO VIVO: o contrato comum das integrações "pessoa" ─────────────────────── */
const EXTERNOS: Record<string, { base?: string; key?: string; header: string; caminho: string }> = {
  helpdesk: { base: process.env.HELPDESK_BASE_URL, key: process.env.HELPDESK_API_KEY, header: 'x-api-key', caminho: '/api/integrations/talent-pessoa' },
  cide: { base: process.env.CIDE_BASE_URL, key: process.env.CIDE_API_KEY, header: 'x-api-key', caminho: '/api/integrations/talent-pessoa' },
  consultoria: { base: process.env.CONSULTORIA_BASE_URL, key: process.env.CONSULTORIA_API_KEY, header: 'x-api-key', caminho: '/api/integrations/talent-pessoa' },
  gerencia: { base: process.env.GERENCIA_BASE_URL, key: process.env.GERENCIA_API_KEY, header: 'x-api-key', caminho: '/integrations/talent-pessoa' },
  // ⚠️ Fora dos "externos" de `detalheDaPessoa`: o Fluxo cai para o espelho
  // quando não responde — ver `doFluxo`.
  fluxo: { base: process.env.FLUXO_BASE_URL, key: process.env.FLUXO_API_KEY, header: 'x-api-key', caminho: '/api/integrations/talent-pessoa' },
  classroom: { base: process.env.CLASSROOM_BASE_URL, key: process.env.CLASSROOM_INTEGRATION_KEY, header: 'x-integration-key', caminho: '/api/integrations/talent-user-learning' },
}

async function aoVivo(sistema: string, nx: string, de: string, ate: string): Promise<Detalhe> {
  const e = EXTERNOS[sistema]
  if (!e.base || !e.key) return { grupos: [], aoVivo: true, erro: 'Sistema não configurado no TalentCare' }
  const qs = new URLSearchParams({ nexusUserId: nx, fromDay: de, toDay: ate })
  try {
    const r = await fetch(`${e.base}${e.caminho}?${qs}`, { headers: { [e.header]: e.key }, cache: 'no-store', signal: AbortSignal.timeout(15_000) })
    if (!r.ok) return { grupos: [], aoVivo: true, erro: `O sistema respondeu ${r.status}` }
    const j = await r.json()
    if (sistema === 'classroom') return { aoVivo: true, grupos: doClassroom(j) }
    return { aoVivo: true, grupos: (j.grupos ?? []) as Grupo[] }
  } catch {
    // ⚠️ Fora do ar é ERRO, dito como tal — lista vazia se leria "não fez nada".
    return { grupos: [], aoVivo: true, erro: 'O sistema não respondeu' }
  }
}

/** O ClassRoom responde no formato dele; os vídeos viram um item por curso, com os vídeos dentro. */
function doClassroom(j: { videos?: { videoId: string; titulo: string; cursoId: string; curso: string; dia: string }[]; cursos?: { cursoId: string; titulo: string; dia: string }[] }): Grupo[] {
  const porCurso = new Map<string, Item>()
  for (const v of j.videos ?? []) {
    const it = porCurso.get(v.cursoId) ?? { id: v.cursoId, titulo: v.curso, dia: v.dia, valor: 0, filhos: [] }
    it.valor = (it.valor ?? 0) + 1
    it.filhos!.push({ titulo: v.titulo, dia: v.dia })
    if (v.dia > it.dia) it.dia = v.dia
    porCurso.set(v.cursoId, it)
  }
  for (const it of porCurso.values()) it.sub = plural(it.valor ?? 0, 'vídeo', 'vídeos')
  return [
    { chave: 'cursos', titulo: 'Cursos concluídos', itens: (j.cursos ?? []).map((c) => ({ id: c.cursoId, titulo: c.titulo, dia: c.dia })) },
    { chave: 'videos', titulo: 'Vídeos assistidos', itens: [...porCurso.values()] },
  ]
}

/* ── DO ESPELHO: dia a dia ─────────────────────────────────────────────────── */
async function doEspelho(sistema: string, p: Pessoa, de: string, ate: string): Promise<Detalhe> {
  const dia = { gte: de, lte: ate }
  const desc = { day: 'desc' as const }
  if (sistema === 'chat') {
    if (!p.nexusUserId) return { grupos: [], aoVivo: false, semConta: true }
    const rs = await prisma.chatDaily.findMany({ where: { nexusUserId: p.nexusUserId, day: dia }, orderBy: desc })
    const ms = rs.filter((r) => r.msgCanais + r.msgDiretas + r.msgChamados > 0)
    const totMsg = ms.reduce((a, r) => a + r.msgCanais + r.msgDiretas + r.msgChamados, 0)
    /* ⚠️ Só MENSAGEM. Os chamados saíram do Chat em 16/09/2026 — quem os quer
       abre o Fluxo, e o painel deles é o `doFluxo` abaixo. */
    return { aoVivo: false, grupos: [
      { chave: 'mensagens', titulo: 'Mensagens, dia a dia', resumo: `${totMsg.toLocaleString('pt-BR')} mensagens`,
        itens: ms.map((r) => ({ id: r.day, dia: r.day, titulo: plural(r.msgCanais + r.msgDiretas + r.msgChamados, 'mensagem', 'mensagens'), sub: `${r.msgCanais} em canais · ${r.msgDiretas} diretas · ${r.msgChamados} em chamados` })) },
    ] }
  }
  if (sistema === 'fluxo') {
    if (!p.nexusUserId) return { grupos: [], aoVivo: false, semConta: true }
    const rs = await prisma.fluxoDaily.findMany({ where: { nexusUserId: p.nexusUserId, day: dia }, orderBy: desc })
    const ch = rs.filter((r) => r.chamadosAbertos + r.chamadosAssumidos + r.chamadosConcluidos > 0)
    const tf = rs.filter((r) => r.tarefasAbertas + r.tarefasAssumidas + r.tarefasConcluidas > 0)
    const s = (k: 'chamadosAbertos' | 'chamadosAssumidos' | 'chamadosConcluidos') => ch.reduce((a, r) => a + r[k], 0)
    const t = (k: 'tarefasAbertas' | 'tarefasAssumidas' | 'tarefasConcluidas') => tf.reduce((a, r) => a + r[k], 0)
    return { aoVivo: false, grupos: [
      { chave: 'chamados', titulo: 'Chamados, dia a dia', resumo: `${s('chamadosAbertos')} abertos · ${s('chamadosAssumidos')} assumidos · ${s('chamadosConcluidos')} concluídos`,
        itens: ch.map((r) => ({ id: r.day, dia: r.day, titulo: [r.chamadosAbertos && plural(r.chamadosAbertos, 'aberto', 'abertos'), r.chamadosAssumidos && plural(r.chamadosAssumidos, 'assumido', 'assumidos'), r.chamadosConcluidos && plural(r.chamadosConcluidos, 'concluído', 'concluídos')].filter(Boolean).join(' · '),
          sub: r.chamadosConcluidos && r.segundosResolucao ? `tempo médio ${horas(Math.round(r.segundosResolucao / r.chamadosConcluidos))} (só expediente)` : undefined })) },
      { chave: 'tarefas', titulo: 'Tarefas delegadas, dia a dia', resumo: `${t('tarefasAbertas')} delegadas · ${t('tarefasAssumidas')} recebidas · ${t('tarefasConcluidas')} concluídas`,
        itens: tf.map((r) => ({ id: `t-${r.day}`, dia: r.day, titulo: [r.tarefasAbertas && plural(r.tarefasAbertas, 'delegada', 'delegadas'), r.tarefasAssumidas && plural(r.tarefasAssumidas, 'recebida', 'recebidas'), r.tarefasConcluidas && plural(r.tarefasConcluidas, 'concluída', 'concluídas')].filter(Boolean).join(' · ') })) },
    ] }
  }
  if (sistema === 'whatsapp') {
    const rs = (await prisma.whatsappAttendantDaily.findMany({ where: { day: dia }, orderBy: desc })).filter((r) => norm(r.name) === norm(p.name))
    /* ⚠️ A avaliação do cliente (pedidos, avaliados, soma das notas) entra no dia —
       pedido do dono, 14/09/2026: "não mostra a nota média do WhatsApp". `null` no
       espelho = dia ainda não conferido pelo Painel, e continua fora da conta. */
    const porDia = new Map<string, { ab: number; fin: number; hs: number; pe: number; av: number; ns: number; filas: Set<string> }>()
    for (const r of rs) {
      const g = porDia.get(r.day) ?? { ab: 0, fin: 0, hs: 0, pe: 0, av: 0, ns: 0, filas: new Set() }
      g.ab += r.abertos; g.fin += r.finalizados; g.hs += r.handleSum; g.filas.add(r.dept)
      g.pe += r.pedidos ?? 0; g.av += r.avaliados ?? 0; g.ns += r.notaSum ?? 0
      porDia.set(r.day, g)
    }
    const it = [...porDia].filter(([, g]) => g.ab + g.fin > 0)
    const nota = (soma: number, n: number) => (soma / n).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    const tAv = it.reduce((a, [, g]) => a + g.av, 0), tNs = it.reduce((a, [, g]) => a + g.ns, 0), tPe = it.reduce((a, [, g]) => a + g.pe, 0)
    return { aoVivo: false, grupos: [{ chave: 'atendimentos', titulo: 'Atendimentos, dia a dia',
      resumo: [`${it.reduce((a, [, g]) => a + g.ab, 0)} abertos · ${it.reduce((a, [, g]) => a + g.fin, 0)} finalizados`, tPe ? `${tPe} pedidos de avaliação` : '', tAv ? `nota média ${nota(tNs, tAv)} (${plural(tAv, 'nota', 'notas')})` : ''].filter(Boolean).join(' · '),
      itens: it.map(([d, g]) => ({ id: d, dia: d, titulo: `${plural(g.ab, 'aberto', 'abertos')} · ${plural(g.fin, 'finalizado', 'finalizados')}`,
        sub: [g.fin ? `tempo médio ${horas(Math.round(g.hs / g.fin))}` : '', g.av ? `nota ${nota(g.ns, g.av)} (${plural(g.av, 'avaliação', 'avaliações')})` : g.pe ? `${plural(g.pe, 'pedido', 'pedidos')} de avaliação` : '', `fila ${[...g.filas].join(', ')}`].filter(Boolean).join(' · ') })) }] }
  }
  if (sistema === 'radio') {
    if (!p.nexusUserId) return { grupos: [], aoVivo: false }
    const rs = (await prisma.radioDaily.findMany({ where: { nexusUserId: p.nexusUserId, day: dia }, orderBy: desc })).filter((r) => r.seconds > 0)
    return { aoVivo: false, grupos: [{ chave: 'escuta', titulo: 'Escuta, dia a dia', resumo: `${horas(rs.reduce((a, r) => a + r.seconds, 0))} · ${rs.reduce((a, r) => a + r.sessions, 0)} sessões`,
      itens: rs.map((r) => ({ id: r.day, dia: r.day, titulo: horas(r.seconds), sub: plural(r.sessions, 'sessão', 'sessões') })) }] }
  }
  // assiduidade — a chave do ponto é nexus_user_id ?? id (cobre quem não tem conta)
  const chave = p.nexusUserId ?? p.id
  const [dias, disc] = await Promise.all([
    prisma.assiduidadeDaily.findMany({ where: { personKey: chave, day: dia }, orderBy: desc }),
    prisma.disciplinaEvento.findMany({ where: { personKey: chave, data: dia }, orderBy: { data: 'desc' } }),
  ])
  const at = dias.filter((r) => r.atrasos + r.atrasosAbon > 0)
  const ROT: Record<string, string> = { advertencia: 'Advertência', suspensao: 'Suspensão · atraso', lgpd_advertencia: 'Advertência · LGPD', lgpd_suspensao: 'Suspensão · LGPD' }
  return { aoVivo: false, grupos: [
    { chave: 'atrasos', titulo: 'Atrasos, dia a dia', resumo: `${at.reduce((a, r) => a + r.atrasos, 0)} atrasos · ${at.reduce((a, r) => a + r.minutosAtraso, 0)} min`,
      itens: at.map((r) => ({ id: r.day, dia: r.day, titulo: r.atrasos ? `${plural(r.atrasos, 'atraso', 'atrasos')}${r.minutosAtraso ? ` · ${r.minutosAtraso} min` : ' · sem minuto medido'}` : 'só abonado', sub: r.atrasosAbon ? plural(r.atrasosAbon, 'abonado', 'abonados') : undefined })) },
    { chave: 'disciplina', titulo: 'Advertências e suspensões', itens: disc.map((d) => ({ id: d.id, dia: d.data, titulo: ROT[d.tipo] ?? d.tipo, sub: [d.motivo, d.dias ? plural(d.dias, 'dia', 'dias') : ''].filter(Boolean).join(' · ') || undefined, destaque: d.tipo === 'suspensao' || d.tipo === 'lgpd_suspensao' ? ('grave' as const) : undefined })) },
  ] }
}

/**
 * FLUXO: os chamados AO VIVO (a lista, com número, assunto e situação).
 * ⚠️ Se o Fluxo não responder, cai para o dia a dia do espelho, COM AVISO — um
 * painel vazio se leria "não abriu chamado nenhum", que é outra coisa.
 * ⚠️⚠️ O assunto da TAREFA DELEGADA FECHADA não vem: a origem manda o número e
 * o rótulo, e o texto fica lá. Quem enxerga aquela tarefa é uma lista curta, e
 * a régua de quem lê o TalentCare não é a mesma.
 */
async function doFluxo(p: Pessoa, de: string, ate: string): Promise<Detalhe> {
  if (!p.nexusUserId) return { grupos: [], aoVivo: true, semConta: true }
  const vivo = await aoVivo('fluxo', p.nexusUserId, de, ate)
  if (!vivo.erro) return vivo
  const espelho = await doEspelho('fluxo', p, de, ate)
  return { ...espelho, aviso: `${vivo.erro} — os chamados abaixo são a contagem por dia do espelho.` }
}

export async function detalheDaPessoa(sistema: Sistema, p: Pessoa, de: string, ate: string): Promise<Detalhe> {
  if (sistema === 'fluxo') return doFluxo(p, de, ate)
  if (sistema in EXTERNOS) {
    // Sem conta no Nexus não há como casar com o sistema — não é "não fez nada".
    if (!p.nexusUserId) return { grupos: [], aoVivo: true, semConta: true }
    return aoVivo(sistema, p.nexusUserId, de, ate)
  }
  return doEspelho(sistema, p, de, ate)
}
