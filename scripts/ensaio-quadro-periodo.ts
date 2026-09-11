/* ENSAIO do QUADRO NO FIM DO PERÍODO e da ROTATIVIDADE DO PERÍODO (11/09/2026).
 * Não escreve nada.
 *
 *   npx --yes tsx@4 --env-file=.env --tsconfig scripts/tsconfig.json scripts/ensaio-quadro-periodo.ts
 *
 * Decisão do dono: pessoas, idade, tempo de casa e gênero = retrato do ÚLTIMO DIA do
 * período; rotatividade = a DO PERÍODO (saídas ÷ quadro médio), nas telas todas. A
 * régua mora em `lib/quadro.ts`, mas chega à tela por DOIS caminhos: o servidor
 * (`/api/dept-metrics`, do banco) e o navegador (painel e lista de Departamentos, do
 * dataset `getTalentData`). O defeito clássico é cada caminho ler a data de um jeito.
 * Para cada setor, em quatro janelas, confere que os dois dão o MESMO quadro no fim
 * e a MESMA rotatividade — e que, na janela que termina hoje, o quadro é o de ativos.
 */
import { encode } from 'next-auth/jwt'
import { prisma } from '../lib/db/prisma'
import { getTalentData } from '../lib/data/source'
import { deptListVM } from '../lib/mock/departments'

const BASE = 'http://127.0.0.1:8082'
const hoje = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10) // dia de SP
const menos = (d: string, n: number) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() - n); return x.toISOString().slice(0, 10) }
const JANELAS: [string, string, string][] = [
  ['30 dias até hoje', menos(hoje, 29), hoje], ['agosto', '2026-08-01', '2026-08-31'],
  ['junho', '2026-06-01', '2026-06-30'], ['o ano', '2026-01-01', hoje],
]

async function main() {
  let ok = 0, falhas = 0
  const erros: string[] = []
  const confere = (oque: string, a: unknown, b: unknown) => { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else { falhas++; erros.push(`${oque}: ${JSON.stringify(a)} × ${JSON.stringify(b)}`) } }

  const dono = await prisma.user.findFirst({ where: { role: 'ADMIN', leftAt: null }, select: { id: true, role: true } })
  if (!dono) throw new Error('sem ADMIN')
  const token = await encode({ token: { sub: dono.id, role: dono.role, departmentName: null, checadoEm: Date.now() }, secret: process.env.AUTH_SECRET!, salt: 'authjs.session-token' })
  const data = await getTalentData({ tipo: 'tudo' })
  const ativosPorSetor = new Map<string, number>()
  for (const u of await prisma.user.findMany({ where: { active: true, origin: { in: ['nexus', 'staff'] }, foraDoDiretorio: false }, select: { departmentId: true } }))
    if (u.departmentId) ativosPorSetor.set(u.departmentId, (ativosPorSetor.get(u.departmentId) ?? 0) + 1)

  for (const [nome, de, ate] of JANELAS) {
    const lista = deptListVM(data, de, ate)
    for (const c of lista.cards) {
      const r = await fetch(`${BASE}/api/dept-metrics?id=${c.id}&period=custom&from=${de}&to=${ate}`, { headers: { cookie: `authjs.session-token=${token}` } })
      if (r.status !== 200) continue
      const m = await r.json() as { equipe: { noFim: number; retrato: string }; turnover: { periodo: { saidas: number; quadroInicio: number; quadroFim: number; taxa: number } } }
      confere(`${c.nome} · ${nome} · pessoas no fim (setor × lista)`, m.equipe.noFim, c.headcount)
      confere(`${c.nome} · ${nome} · rotatividade (setor × lista)`,
        [m.turnover.periodo.saidas, m.turnover.periodo.quadroInicio, m.turnover.periodo.quadroFim, m.turnover.periodo.taxa],
        [c.rotatividade.saidas, c.rotatividade.quadroInicio, c.rotatividade.quadroFim, c.rotatividade.taxa])
      if (ate === hoje) {
        confere(`${c.nome} · ${nome} · o retrato de hoje diz "hoje"`, m.equipe.retrato, 'hoje')
        confere(`${c.nome} · ${nome} · quadro de hoje = ativos`, m.equipe.noFim, ativosPorSetor.get(c.id) ?? 0)
      }
    }
    const t = lista.cards.reduce((a, c) => ({ s: a.s + c.rotatividade.saidas, f: a.f + c.headcount }), { s: 0, f: 0 })
    console.log(`── ${nome} (${de} a ${ate}): ${lista.cards.length} setores · ${t.f} pessoas no fim · ${t.s} saídas`)
  }

  if (erros.length) console.log('❌', erros.slice(0, 25).join('\n   '))
  console.log(`${falhas ? '❌' : '✅'} ${ok + falhas} conferências, ${falhas} divergências`)
  await prisma.$disconnect()
  process.exit(falhas ? 1 : 0)
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(2) })
