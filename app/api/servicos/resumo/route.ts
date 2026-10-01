import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { rangeDaRequisicao } from '@/lib/period-range'
import { quemEh } from '@/lib/avaliacoes/regua'

/* ============================================================
   SERVIÇOS DO SETOR — o resumo da janela (01/10/2026).

   Pedido do Daniel: o cartão "Serviços do setor" levava à tela da planilha, e
   o Legal achou que estava quebrado — "não abre a janela como em todos os
   demais cards". Esta rota alimenta a janela: quem concluiu, o que ficou em
   aberto, por tipo de serviço, e de que envio veio cada número.

   ⚠️ SEM O NOME DO CLIENTE, de propósito: é a mesma regra que o dono deu para o
   Acessórias ("mantenha o cliente de fora" no TalentCare, 01/10/2026). O
   TalentCare mede gente, não carteira.

   ?dept=<departmentId> — obrigatório. A régua é a das outras rotas por setor:
   a Diretoria vê tudo; o gestor, os setores que avalia e o próprio.
   ============================================================ */

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const quem = await quemEh((session.user as { id: string }).id)
  if (!quem) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const deptId = req.nextUrl.searchParams.get('dept')
  if (!deptId) return NextResponse.json({ error: 'Falta o setor.' }, { status: 400 })
  const dept = await prisma.department.findUnique({ where: { id: deptId }, select: { id: true, name: true } })
  if (!dept) return NextResponse.json({ error: 'não encontrado' }, { status: 404 })
  const podeVerSetor = quem.escopo.tipo === 'tudo' || quem.escopo.avaliaDepartmentIds.includes(dept.id) || quem.departmentId === dept.id
  if (!podeVerSetor) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { fromDay, toDay } = rangeDaRequisicao(req)

  const [linhas, lotes] = await Promise.all([
    prisma.servicoDepto.findMany({
      where: { departmentId: dept.id, dia: { gte: fromDay, lte: toDay } },
      select: { personKey: true, nomeOrigem: true, status: true, tarefa: true, minutos: true },
    }),
    /* De onde veio o número: os envios ATIVOS que encostam na janela. Sem isto,
       "0 concluídos" não diz se o setor não trabalhou ou se ninguém subiu o mês. */
    prisma.importLote.findMany({
      where: { departmentId: dept.id, ativo: true, diaDe: { lte: toDay }, diaAte: { gte: fromDay } },
      select: { arquivo: true, diaDe: true, diaAte: true, enviadoEm: true, enviadoPor: true },
      orderBy: { enviadoEm: 'desc' },
    }),
  ])
  const ultimoDia = await prisma.servicoDepto.aggregate({ where: { departmentId: dept.id }, _max: { dia: true } })

  // personKey = nexusUserId ?? id (o mesmo do vínculo).
  const chaves = [...new Set(linhas.map((l) => l.personKey).filter((k): k is string => !!k))]
  const users = chaves.length
    ? await prisma.user.findMany({
        where: { OR: [{ nexusUserId: { in: chaves } }, { id: { in: chaves } }] },
        select: { id: true, nexusUserId: true, name: true, jobTitle: true, avatarUrl: true, active: true },
      })
    : []
  const porChave = new Map(users.map((u) => [u.nexusUserId ?? u.id, u]))
  const enviou = lotes.length
    ? new Map((await prisma.user.findMany({ where: { id: { in: [...new Set(lotes.map((l) => l.enviadoPor))] } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]))
    : new Map<string, string>()

  type P = { id: string | null; nome: string; cargo: string; hasAvatar: boolean; ativo: boolean; concluidos: number; abertos: number; minutos: number; tipos: Map<string, number> }
  const pessoas = new Map<string, P>()
  const tipos = new Map<string, { tipo: string; concluidos: number; abertos: number }>()
  const total = { concluidos: 0, abertos: 0, desconsiderados: 0, minutos: 0, semDono: 0 }

  for (const l of linhas) {
    if (l.status === 'desconsiderada') { total.desconsiderados++; continue }
    const concl = l.status === 'concluida'
    if (concl) { total.concluidos++; total.minutos += l.minutos } else total.abertos++
    if (!l.personKey) total.semDono++

    const t = tipos.get(l.tarefa) ?? { tipo: l.tarefa, concluidos: 0, abertos: 0 }
    if (concl) t.concluidos++; else t.abertos++
    tipos.set(l.tarefa, t)

    /* ⚠️ Linha sem dono continua na conta, com o nome que veio no arquivo: some-la
       faria o total da janela divergir do cartão sem explicação. */
    const k = l.personKey ?? `origem:${l.nomeOrigem}`
    const u = l.personKey ? porChave.get(l.personKey) : undefined
    const p = pessoas.get(k) ?? {
      id: u?.id ?? null, nome: u?.name ?? l.nomeOrigem, cargo: u ? (u.jobTitle ?? 'Colaborador') : 'sem vínculo no TalentCare',
      hasAvatar: !!u?.avatarUrl, ativo: u?.active ?? true, concluidos: 0, abertos: 0, minutos: 0, tipos: new Map(),
    }
    if (concl) { p.concluidos++; p.minutos += l.minutos; p.tipos.set(l.tarefa, (p.tipos.get(l.tarefa) ?? 0) + 1) } else p.abertos++
    pessoas.set(k, p)
  }

  return NextResponse.json({
    setor: dept.name,
    total,
    ultimoDiaComDado: ultimoDia._max.dia ?? null,
    pessoas: [...pessoas.values()]
      .map(({ tipos: t, ...p }) => ({ ...p, tipos: [...t].map(([tipo, n]) => ({ tipo, n })).sort((a, b) => b.n - a.n) }))
      .sort((a, b) => b.concluidos - a.concluidos || b.abertos - a.abertos || a.nome.localeCompare(b.nome)),
    tipos: [...tipos.values()].sort((a, b) => b.concluidos - a.concluidos || b.abertos - a.abertos),
    envios: lotes.map((l) => ({ arquivo: l.arquivo, diaDe: l.diaDe, diaAte: l.diaAte, enviadoEm: l.enviadoEm, por: enviou.get(l.enviadoPor) ?? null })),
  })
}
