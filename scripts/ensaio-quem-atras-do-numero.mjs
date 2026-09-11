// ENSAIO: o que o clique revela bate com o número clicado? Não escreve nada.
//   node --env-file=.env scripts/ensaio-quem-atras-do-numero.mjs
//
// A visão geral do setor (11/09/2026) abre, ao clicar, QUEM está atrás de cada
// número: o dia do mapa de atrasos lista as pessoas daquele dia; os indicadores
// de atrasos/minutos/advertências abrem a lista por pessoa. Se a lista não somar
// o número clicado, o gestor vê "3 pessoas" no quadro e 2 nomes embaixo.
// Confere, para cada setor e janela: dia a dia (pessoas e minutos) e os totais.
import { PrismaClient } from '@prisma/client'
import { encode } from 'next-auth/jwt'

const prisma = new PrismaClient()
const BASE = 'http://127.0.0.1:8082'
const a = await prisma.user.findFirst({ where: { role: 'ADMIN', active: true }, select: { id: true, role: true } })
const ck = `authjs.session-token=${await encode({ token: { sub: a.id, role: a.role, checadoEm: Date.now() }, secret: process.env.AUTH_SECRET, salt: 'authjs.session-token' })}`
const setores = await prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })

let falhas = 0, dias = 0
for (const q of ['period=custom&from=2026-08-01&to=2026-08-31', 'period=Ano']) {
  console.log(`\n══ ${q}`)
  for (const s of setores) {
    const r = await fetch(`${BASE}/api/dept-metrics?id=${s.id}&${q}`, { headers: { cookie: ck } })
    if (!r.ok) continue
    const m = await r.json()
    const f = []
    for (const d of m.assiduidade.dias ?? []) {
      dias++
      const q2 = (m.assiduidade.quemNoDia ?? []).filter((l) => l.day === d.day)
      const min = q2.reduce((x, l) => x + l.minutos, 0)
      if (q2.length !== d.pessoas) f.push(`${d.day}: quadro ${d.pessoas}p × lista ${q2.length}`)
      if (min !== d.minutos) f.push(`${d.day}: quadro ${d.minutos}min × lista ${min}`)
    }
    // as listas dos indicadores somam o número do azulejo?
    const soma = (k) => m.pessoas.reduce((x, p) => x + (p[k] ?? 0), 0)
    if (soma('atrasos') !== m.assiduidade.atrasos) f.push(`atrasos: azulejo ${m.assiduidade.atrasos} × lista ${soma('atrasos')}`)
    if (soma('minutosAtraso') !== m.assiduidade.minutos) f.push(`minutos: azulejo ${m.assiduidade.minutos} × lista ${soma('minutosAtraso')}`)
    if (soma('advertencias') !== m.assiduidade.advertencias) f.push(`advertências: azulejo ${m.assiduidade.advertencias} × lista ${soma('advertencias')}`)
    if (f.length) falhas += f.length
    console.log(`   ${f.length ? '❌' : '✅'} ${s.name.padEnd(13)} ${f.length ? f.slice(0, 4).join(' · ') + (f.length > 4 ? ` (+${f.length - 4})` : '') : `${(m.assiduidade.dias ?? []).length} dias, totais batem`}`)
  }
}
console.log(`\n${falhas ? '❌' : '✅'} ${dias} dias conferidos, ${falhas} divergências`)
await prisma.$disconnect()
process.exit(falhas ? 1 : 0)
