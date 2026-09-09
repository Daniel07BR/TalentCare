// ENSAIO — o espelho `gerencia_daily` bate com a fonte AGORA? Não escreve nada.
//
// Rode na produção (.78):
//   node --env-file=.env scripts/diff-espelho-gerencia.mjs [de] [ate]
//   node --env-file=.env scripts/diff-espelho-gerencia.mjs 2000-01-01 2100-01-01
//
// ⚠️⚠️ POR QUE ELE EXISTE. O sync incremental recorta pelo DIA DO EVENTO, não por
// quando o registro mudou — então tudo o que a origem CONSERTA depois fica
// congelado errado no espelho, sem erro e sem log. Em 09/09/2026 este diff achou
// **212 dias divergentes em 4.609**: o km do Elton em 07/08 lia 882.601 contra 58
// na origem (odômetro lido errado, corrigido na Gerência três dias depois), e
// `viagens` estava zerada em 198 dias do histórico por ser métrica criada DEPOIS
// do backfill. Agosto dele somava 1.028.354 km contra 1.265 reais.
//
// Depois de rodar e ver divergência, o conserto é:
//   node --env-file=.env run-gerencia-sync.mjs --completo
// (já está no cron às 03:10, ao lado do incremental de :30)
//
// ⚠️ AS OUTRAS NOVE FONTES têm o mesmo formato de recorte e ninguém mediu se elas
// divergem. Este arquivo é o molde: troque o endpoint, a tabela e a lista de
// campos. Ver `docs/FONTES.md`.
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const BASE = process.env.GERENCIA_BASE_URL
const KEY = process.env.GERENCIA_API_KEY
const from = process.argv[2] || '2026-01-01'
const to = process.argv[3] || '2026-12-31'

const res = await fetch(`${BASE}/integrations/talent-daily?from=${from}&to=${to}`, {
  headers: { 'X-API-Key': KEY },
})
if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
const { days } = await res.json()
const n = (v) => Number(v) || 0
const CAMPOS = ['servicos','km','saidas','viagens','jornadaMin','protAbertos','protAprovados','servCriados','reagendados','cancelados','datasAlteradas']
const COL = { servicos:'servicos',km:'km',saidas:'saidas',viagens:'viagens',jornadaMin:'jornadaMin',protAbertos:'protAbertos',protAprovados:'protAprovados',servCriados:'servCriados',reagendados:'reagendados',cancelados:'cancelados',datasAlteradas:'datasAlteradas' }

const fonte = new Map()
for (const r of days) fonte.set(`${r.userId}|${r.day}`, r)

const espelho = await prisma.gerenciaDaily.findMany({ where: { day: { gte: from, lte: to } } })
const nomes = new Map((await prisma.user.findMany({ where: { nexusUserId: { not: null } }, select: { nexusUserId: true, name: true } })).map(u => [u.nexusUserId, u.name]))

let difs = 0, soFonte = 0, soEspelho = 0
const porCampo = {}
const exemplos = []
for (const e of espelho) {
  const k = `${e.nexusUserId}|${e.day}`
  const f = fonte.get(k)
  if (!f) { soEspelho++; exemplos.push(`SÓ NO ESPELHO ${nomes.get(e.nexusUserId)||e.nexusUserId} ${e.day} servicos=${e.servicos} km=${e.km}`); continue }
  const d = []
  for (const c of CAMPOS) { const a = n(e[COL[c]]), b = n(f[c]); if (a !== b) { d.push(`${c}: espelho=${a} fonte=${b}`); porCampo[c] = (porCampo[c]||0)+1 } }
  if (d.length) { difs++; if (exemplos.length < 40) exemplos.push(`${nomes.get(e.nexusUserId)||e.nexusUserId} ${e.day} — ${d.join(' | ')}`) }
  fonte.delete(k)
}
for (const [k, f] of fonte) { soFonte++; if (exemplos.length < 60) exemplos.push(`SÓ NA FONTE ${nomes.get(k.split('|')[0])||k.split('|')[0]} ${f.day} servicos=${f.servicos} km=${f.km}`) }

console.log(JSON.stringify({ intervalo:[from,to], linhasFonte: days.length, linhasEspelho: espelho.length, diasDivergentes: difs, soNoEspelho: soEspelho, soNaFonte: soFonte, porCampo }, null, 2))
console.log('\n--- exemplos ---')
exemplos.forEach(l => console.log(l))
await prisma.$disconnect()
