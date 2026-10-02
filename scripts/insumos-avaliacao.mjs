#!/usr/bin/env node
/* ============================================================
   INSUMOS DA AVALIAÇÃO MENSAL — o que o agente precisa saber de cada pessoa
   antes de redigir (02/10/2026). SÓ LEITURA: não grava nada.

   Uso (no .78, de dentro de /var/www/talentcare):
     node --env-file=.env scripts/insumos-avaliacao.mjs --setor=TI
     node --env-file=.env scripts/insumos-avaliacao.mjs --setor=TI --competencia=2026-10

   Sem --competencia: o MÊS FECHADO (o anterior ao de hoje), que é o que se avalia.

   Para cada pessoa avaliável do setor, imprime:
     - os ATRASOS do mês, dia a dia (abonados à parte — não contam contra);
     - as ADVERTÊNCIAS do mês. ⚠️⚠️ São DERIVADAS dos atrasos (a partir do 2º
       atraso do mês, uma por atraso): "2 atrasos e 1 advertência" é UM fato
       só, e não dois. Ver docs/AVALIACAO-MENSAL-PASSO-A-PASSO.md §4;
     - medidas da LGPD / suspensões, se houver;
     - o DISC (perfil predominante e as quatro pontuações);
     - a avaliação do MÊS ANTERIOR (níveis, exemplos, combinados) — os
       combinados de lá são o que se cobra agora;
     - a situação da avaliação deste mês, se já existir.

   ⚠️ A população segue a régua do sistema (`lib/avaliacoes/regua.ts`): ativo
   no fim do mês, admitido antes do dia 16, fora conta de sistema e FORA QUEM É
   GESTOR (gestor não é avaliado — Daniel, 02/10/2026).
   ============================================================ */
import { PrismaClient } from '@prisma/client'

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=')
const norm = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

function competenciaAnterior(c) {
  const [a, m] = c.split('-').map(Number)
  const d = new Date(a, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const hoje = new Date()
const mesFechado = (() => { const d = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` })()

const competencia = arg('competencia') ?? mesFechado
const setorPedido = arg('setor')
if (!/^\d{4}-\d{2}$/.test(competencia) || !setorPedido) {
  console.error('Uso: node --env-file=.env scripts/insumos-avaliacao.mjs --setor=TI [--competencia=AAAA-MM]')
  process.exit(1)
}

// Níveis — a mesma tabela de lib/avaliacoes/criterios.ts (âncoras 4/6/8/10).
const NIVEL = (n) => (n == null ? '—' : n <= 4 ? 'Abaixo' : n <= 6 ? 'Em parte' : n <= 8 ? 'Atende' : 'Acima')
const CRITERIO = { entrega: 'Entrega', atitude: 'Atitude', equipe: 'Equipe e comunicação' }
const FATOR = { d: 'Dominante', i: 'Influente', s: 'Estável', c: 'Conforme' }

const p = new PrismaClient()
try {
  const depts = await p.department.findMany({ select: { id: true, name: true } })
  const dept = depts.find((d) => norm(d.name) === norm(setorPedido))
  if (!dept) { console.error(`Setor "${setorPedido}" não encontrado. Existem: ${depts.map((d) => d.name).join(', ')}`); process.exit(1) }

  const [a, m] = competencia.split('-').map(Number)
  const inicio = `${competencia}-01`
  const fimDate = new Date(a, m, 0, 23, 59, 59, 999)
  const fim = `${competencia}-${String(fimDate.getDate()).padStart(2, '0')}`
  const corteAdmissao = new Date(a, m - 1, 16)
  const anterior = competenciaAnterior(competencia)

  const gestores = (await p.setorAvaliador.findMany({ where: { nivel: 'gestor' }, select: { userId: true }, distinct: ['userId'] })).map((r) => r.userId)
  const avaliadores = await p.setorAvaliador.findMany({ where: { departmentId: dept.id }, select: { userId: true, nivel: true } })
  const nomeAval = new Map((await p.user.findMany({ where: { id: { in: avaliadores.map((v) => v.userId) } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]))

  const pessoas = await p.user.findMany({
    where: {
      departmentId: dept.id,
      origin: { in: ['nexus', 'staff'] },
      foraDoDiretorio: false,
      OR: [{ leftAt: null }, { leftAt: { gt: fimDate } }],
      entryDate: { lt: corteAdmissao },
      NOT: { id: { in: gestores } },
    },
    select: { id: true, name: true, jobTitle: true, nexusUserId: true, entryDate: true },
    orderBy: { name: 'asc' },
  })

  console.log(`\n══ INSUMOS DA AVALIAÇÃO · ${dept.name} · competência ${competencia} ══`)
  console.log(`Quem avalia o setor: ${avaliadores.map((v) => `${nomeAval.get(v.userId) ?? v.userId} (${v.nivel})`).join(', ') || 'ninguém definido'}`)
  console.log(`Gestor NÃO é avaliado — fica fora desta lista. Avaliáveis: ${pessoas.length}\n`)

  for (const u of pessoas) {
    const k = u.nexusUserId ?? u.id
    const [dias, disc, discRes, avAnt, avAtual] = await Promise.all([
      p.assiduidadeDaily.findMany({ where: { personKey: k, day: { gte: inicio, lte: fim } }, orderBy: { day: 'asc' } }),
      p.disciplinaEvento.findMany({ where: { personKey: k, data: { gte: inicio, lte: fim } }, orderBy: { data: 'asc' } }),
      p.discResultado.findFirst({ where: { userId: u.id }, orderBy: { aplicadoEm: 'desc' } }),
      p.avaliacao.findUnique({ where: { competencia_avaliadoId: { competencia: anterior, avaliadoId: u.id } }, include: { notas: true } }),
      p.avaliacao.findUnique({ where: { competencia_avaliadoId: { competencia, avaliadoId: u.id } }, include: { documento: { select: { concluidaEm: true } } } }),
    ])

    console.log(`── ${u.name} · ${u.jobTitle ?? 'Colaborador'}`)

    const atrasos = dias.filter((d) => d.atrasos > 0)
    const abonados = dias.filter((d) => d.atrasosAbon > 0)
    const nAtr = atrasos.reduce((s, d) => s + d.atrasos, 0)
    console.log(`   Atrasos (não abonados): ${nAtr}${atrasos.length ? ' → ' + atrasos.map((d) => `${d.day.slice(8)}/${d.day.slice(5, 7)} (${d.minutosAtraso} min)`).join(', ') : ''}`)
    if (abonados.length) console.log(`   Abonados (NÃO contam contra): ${abonados.map((d) => `${d.day.slice(8)}/${d.day.slice(5, 7)}`).join(', ')}`)
    const adv = disc.filter((e) => e.tipo === 'advertencia')
    const outras = disc.filter((e) => e.tipo !== 'advertencia')
    console.log(`   Advertências: ${adv.length}${adv.length ? ` (derivadas dos atrasos — a partir do 2º do mês; NÃO são fato separado)` : ''}`)
    if (outras.length) console.log(`   Outras medidas: ${outras.map((e) => `${e.tipo} em ${e.data}${e.motivo ? ` (${e.motivo})` : ''}`).join('; ')}`)

    if (discRes) {
      const notas = { d: discRes.d, i: discRes.i, s: discRes.s, c: discRes.c }
      const tot = Object.values(notas).reduce((s, v) => s + v, 0) || 1
      const max = Math.max(...Object.values(notas))
      const pred = Object.keys(notas).filter((f) => notas[f] === max).map((f) => FATOR[f])
      const pct = Object.entries(notas).sort((x, y) => y[1] - x[1]).map(([f, v]) => `${f.toUpperCase()} ${Math.round((v / tot) * 100)}%`).join(' · ')
      console.log(`   DISC (${discRes.aplicadoEm}): predominante ${pred.join(' + ')} — ${pct}`)
    } else {
      console.log('   DISC: não aplicado (escreva no tom neutro e calmo)')
    }

    if (avAnt && avAnt.status === 'publicada') {
      const linha = ['entrega', 'atitude', 'equipe'].map((c) => `${CRITERIO[c]}: ${NIVEL(avAnt.notas.find((n) => n.criterio === c)?.nota)}`).join(' · ')
      console.log(`   Mês anterior (${anterior}): ${linha} · resultado ${NIVEL(avAnt.media)}`)
      const comb = (avAnt.combinado ?? '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
      if (comb.length) { console.log('   Combinados do mês anterior (cobre se foram cumpridos):'); comb.forEach((c, i) => console.log(`     ${i + 1}. ${c}`)) }
    } else {
      console.log(`   Mês anterior (${anterior}): sem avaliação publicada`)
    }

    if (avAtual) {
      console.log(`   ESTE MÊS: já existe (${avAtual.status}, v${avAtual.versao}${avAtual.documento?.concluidaEm ? ', CONCLUÍDA — não se altera mais' : ''})`)
    } else {
      console.log('   ESTE MÊS: ainda não avaliado')
    }
    console.log('')
  }
  console.log('Lembrete: NADA disto vira número na avaliação. O nível é decisão do avaliador; o texto segue o guia.\n')
} finally {
  await p.$disconnect()
}
