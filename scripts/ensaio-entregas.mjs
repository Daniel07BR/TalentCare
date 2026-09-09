// ENSAIO ponta a ponta da rota /api/entregas-metrics, com sessão DE VERDADE.
// Não escreve nada.
//   node --env-file=.env scripts/ensaio-entregas.mjs
//
// ⚠️⚠️ POR QUE ELE EXISTE. Conferir a rota pelo banco prova que a query está
// certa, não que a TELA está. Este script forja o cookie do next-auth com o
// `AUTH_SECRET` e bate na rota nos cinco filtros que têm armadilha — e foi ele
// que pegou, depois de duas rodadas do agente crítico, a célula de pontuação
// imprimindo o SLUG cru ("sem-credito") em vez da frase em português.
//
// Os cinco casos não são arbitrários; cada um cobre uma armadilha medida:
//   30 dias        → a janela normal, dentro da cobertura do app
//   Ano corrente   → a única em que "tem número na janela" e "a fonte parou"
//                    DIVERGEM (o Gilberto tem 14 dias dentro dela e parou em
//                    24/02) — foi aqui que a tela chegou a apagar 153 serviços
//   Trimestre      → cruza a borda de 17/07, quando o app passou a medir
//   junho/2026     → janela INTEIRA antes do app: km, saída e jornada são "—"
//   2025 inteiro   → antes de existir autoria de registro no sistema
import { PrismaClient } from '@prisma/client'
import { encode } from 'next-auth/jwt'

const prisma = new PrismaClient()
const BASE = 'http://127.0.0.1:8082'

const quem = await prisma.user.findFirst({
  where: { role: 'ADMIN', active: true },
  select: { id: true, name: true, role: true, department: { select: { name: true } } },
})
if (!quem) throw new Error('sem ADMIN para o ensaio')

const token = await encode({
  token: { sub: quem.id, role: quem.role, departmentName: quem.department?.name ?? null, checadoEm: Date.now() },
  secret: process.env.AUTH_SECRET,
  salt: 'authjs.session-token',
})

const casos = [
  ['30 dias', 'period=30d'],
  ['Ano corrente', 'period=Ano'],
  ['Trimestre', 'period=Trimestre'],
  ['junho/2026 (antes do app)', 'period=custom&from=2026-06-01&to=2026-06-30'],
  ['2025 inteiro', 'period=custom&from=2025-01-01&to=2025-12-31'],
]

console.log(`sessão: ${quem.name} (${quem.role})\n`)
for (const [nome, q] of casos) {
  const r = await fetch(`${BASE}/api/entregas-metrics?${q}`, {
    headers: { cookie: `authjs.session-token=${token}` },
  })
  if (!r.ok) { console.log(`${nome}: HTTP ${r.status} — ${(await r.text()).slice(0, 120)}`); continue }
  const d = await r.json()
  const t = d.totais, c = d.cobertura
  console.log(`── ${nome}  (${d.fromDay} a ${d.toDay})`)
  console.log(`   totais: ${t.servicos} serv · ${t.km} km · ${t.saidas} saídas · ${t.viagens} viagens`)
  console.log(`   jornada: total ${(t.jornadaMin / 60).toFixed(1)}h · teto ${t.jornadaTetoMin === null ? '(não medido)' : (t.jornadaTetoMin / 60).toFixed(1) + 'h'}`)
  console.log(`   cobertura: appFora=${c.appFora} appDias=${c.appDiasNaJanela} registrosFora=${c.registrosFora} fonteAte=${c.fonteAte}`)
  console.log(`   competência ${d.competencia} · parcial=${d.pontuacao.parcial} prévia=${d.pontuacao.previa}${d.pontuacao.motivo ? ' · ' + d.pontuacao.motivo : ''}`)
  console.log(`   com registro: ${t.pessoasComRegistro} de ${t.pessoasNaEquipe}`)
  for (const p of d.pessoas) {
    console.log(`   · ${p.nome.padEnd(32)} dias=${String(p.diasComRegistro).padStart(3)} serv=${String(p.servicos).padStart(5)} km=${String(p.km).padStart(6)} fontePara=${p.fontePara} ultimo=${p.ultimoDia} pontos=${p.pontos ?? '—'}${p.semNota ? ' [' + p.semNota + ']' : ''}`)
  }
  console.log()
}
await prisma.$disconnect()
