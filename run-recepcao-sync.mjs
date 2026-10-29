// Sync do ATENDIMENTO DA RECEPÇÃO (Fluxo, .70) → TalentCare (16/10/2026).
// Rode: node --env-file=.env run-recepcao-sync.mjs [--completo]
//
// Lê `GET /api/integrations/talent-recepcao?from&to` (dias de São Paulo) e TROCA a janela
// inteira em `recepcao_daily` e `recepcao_area_daily`, numa transação. Desde 29/10/2026 vêm
// também as OUTRAS TAREFAS (entrevistas, Controle de faltas, prestadores, marcadores).
//
// ⚠️⚠️ TROCAR, e não somar por cima: a Recepção corrige o passado (desfaz um contato em lote,
// apaga uma visita registrada em dobro, marca o Chegou de ontem). Upsert só corrigiria quem
// veio na resposta — o dia que ficou VAZIO continuaria com o número velho. Os dados são
// poucos (quatro pessoas × dia), então a janela vai inteira a cada rodada.
//   normal      → os últimos 45 dias (cron de hora em hora);
//   --completo  → desde 22/09/2026, quando o Alô Você abriu para todos (madrugada).
// ⚠️ FREIO: resposta vazia com espelho cheio na janela é problema LÁ — não apaga nada.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = process.env.FLUXO_BASE_URL
const KEY = process.env.FLUXO_API_KEY
const INICIO = '2026-09-22'

const n = (v) => Math.max(0, Math.round(Number(v) || 0))
const diaSP = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d)

async function main() {
  if (!BASE || !KEY) throw new Error('FLUXO_BASE_URL/FLUXO_API_KEY ausentes no .env')
  const completo = process.argv.includes('--completo')
  const to = diaSP(new Date())
  const de = new Date(); de.setDate(de.getDate() - 45)
  const from = completo ? INICIO : (diaSP(de) < INICIO ? INICIO : diaSP(de))

  const res = await fetch(`${BASE}/api/integrations/talent-recepcao?${new URLSearchParams({ from, to })}`, { headers: { 'X-API-Key': KEY } })
  if (!res.ok) throw new Error(`Fluxo ${res.status}: ${await res.text()}`)
  const data = await res.json()

  const pessoas = (data.pessoas ?? []).filter((r) => r.userId && r.day).map((r) => ({
    nexusUserId: r.userId, day: r.day,
    recebidas: n(r.recebidas), feitas: n(r.feitas), naoRealizadas: n(r.naoRealizadas),
    esperaLigacaoSeg: n(r.esperaLigacaoSeg), esperaLigacaoN: n(r.esperaLigacaoN),
    visitas: n(r.visitas), deliveries: n(r.deliveries),
    esperaDeliverySeg: n(r.esperaDeliverySeg), esperaDeliveryN: n(r.esperaDeliveryN),
    contatosEmLote: n(r.contatosEmLote),
    // As outras tarefas (29/10/2026): entrevistas, Controle de faltas, prestadores e marcadores.
    entrevistasAgendadas: n(r.entrevistasAgendadas), entrevistasCadastradas: n(r.entrevistasCadastradas),
    entrevistasEncerradas: n(r.entrevistasEncerradas), entrevistasTestes: n(r.entrevistasTestes),
    entrevistasAcompanhadas: n(r.entrevistasAcompanhadas), faltasConferidas: n(r.faltasConferidas),
    prestadores: n(r.prestadores), marcadores: n(r.marcadores),
  }))
  const area = []
  for (const a of data.area ?? []) {
    for (const [campo, v] of Object.entries(a)) {
      if (campo !== 'day' && n(v) > 0) area.push({ day: a.day, grupo: 'total', rotulo: campo, n: n(v) })
    }
  }
  for (const g of data.grupos ?? []) {
    if (g.day && g.grupo && g.rotulo && n(g.n) > 0) area.push({ day: g.day, grupo: g.grupo, rotulo: String(g.rotulo).slice(0, 120), n: n(g.n) })
  }

  const janela = { day: { gte: from, lte: to } }
  const antes = await prisma.recepcaoDaily.count({ where: janela })
  if (pessoas.length === 0 && antes > 10) {
    console.log(JSON.stringify({ freio: `fonte vazia e o espelho tem ${antes} linhas em ${from}..${to} — nada trocado`, from, to }))
    return
  }

  await prisma.$transaction([
    prisma.recepcaoDaily.deleteMany({ where: janela }),
    prisma.recepcaoAreaDaily.deleteMany({ where: janela }),
    prisma.recepcaoDaily.createMany({ data: pessoas }),
    prisma.recepcaoAreaDaily.createMany({ data: area }),
  ])
  // ⚠️ `semConta` no log: atendimento de quem não tem conta do Nexus no Fluxo — entra no total
  // da área, mas não tem ficha a quem creditar.
  console.log(JSON.stringify({ from, to, completo, pessoas: pessoas.length, area: area.length, antes, semConta: data.semConta ?? null }))
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
