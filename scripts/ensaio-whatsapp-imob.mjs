// ENSAIO A SECO da 2ª instância do WhatsApp (a Imobiliária) — não escreve nada.
//   node --env-file=.env scripts/ensaio-whatsapp-imob.mjs [--desde AAAA-MM-DD]
//
// Roda ANTES de ligar a fonte, e depois de qualquer mexida na rota do
// Relatórios. Responde três perguntas, que são as três formas de essa
// integração falhar em silêncio:
//
//  1. O setor chega como "Imóveis"? A instância inteira vira UM setor (49% dos
//     atendimentos dela não têm fila, e as filas que tem se chamam "Financeiro",
//     "Juridico", "SAC" — os mesmos nomes de setores da casa). Qualquer outro
//     `dept` aqui é fila vazando, e vira barra errada no painel.
//  2. O NOME de cada atendente casa, LETRA POR LETRA, com alguém do diretório?
//     O OneCode da Imobiliária guarda "BÁRBARA ROCHA"; as telas do TalentCare
//     casam por igualdade exata (`name IN (...)`). Um nome fora daqui = pessoa
//     com atendimento na ficha e atividade ZERO na comparação do setor, na mesma
//     tela — e ninguém percebe, porque as duas contas "funcionam".
//  3. Algum dia traz finalizado demais? A faxina de 17/09/2026 fechou 466
//     conversas antigas de uma vez. Se ela aparecer, o pull está vindo de antes
//     do `inicio` — ver `lib/whatsapp-fontes.ts`.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = process.env.PAINEL_BASE_URL
const KEY = process.env.PAINEL_API_KEY
const CAMINHO = '/api/integrations/whatsapp-imob-overview-daily'
const SETOR = 'Imóveis'
const INICIO = '2026-09-18'
/** Acima disto num dia só, não é dia de trabalho — é mutirão de fechamento. */
const LIMITE_FINALIZADOS_DIA = 50

const norm = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

async function main() {
  const i = process.argv.indexOf('--desde')
  const desde = i > 0 ? process.argv[i + 1] : INICIO
  const qs = new URLSearchParams({ from: new Date(`${desde}T03:00:00Z`).toISOString(), to: new Date().toISOString() })
  const res = await fetch(`${BASE}${CAMINHO}?${qs}`, { headers: { 'X-API-Key': KEY } })
  if (!res.ok) throw new Error(`Relatórios ${res.status}: ${await res.text()}`)
  const data = await res.json()

  const problemas = []

  // 1. o setor
  const setores = [...new Set([...data.days, ...data.attendants].map((r) => r.dept))]
  if (setores.some((d) => d !== SETOR)) {
    problemas.push(`(1) veio setor fora de "${SETOR}": ${setores.filter((d) => d !== SETOR).join(', ')}`)
  }

  // 2. os nomes, letra por letra
  const nomes = [...new Set(data.attendants.map((a) => a.name))]
  const pessoas = await prisma.user.findMany({
    where: { origin: { in: ['nexus', 'staff'] }, foraDoDiretorio: false },
    select: { name: true, active: true, department: { select: { name: true } } },
  })
  const exatos = new Set(pessoas.map((p) => p.name))
  const porNorm = new Map(pessoas.map((p) => [norm(p.name), p]))
  const semCasar = []
  for (const n of nomes) {
    if (exatos.has(n)) continue
    const quase = porNorm.get(norm(n))
    semCasar.push(quase ? `${n} → o diretório grafa "${quase.name}"` : `${n} → ninguém com esse nome no diretório`)
  }
  if (semCasar.length) problemas.push(`(2) nome que não casa exato:\n     - ${semCasar.join('\n     - ')}`)

  // 3. o mutirão
  const porDia = new Map()
  for (const a of data.attendants) {
    const r = porDia.get(a.day) ?? { ab: 0, fin: 0 }
    r.ab += Number(a.abertos) || 0
    r.fin += Number(a.finalizados) || 0
    porDia.set(a.day, r)
  }
  const mutirao = [...porDia].filter(([, r]) => r.fin > LIMITE_FINALIZADOS_DIA)
  if (mutirao.length) {
    problemas.push(`(3) dia com finalizado demais (mutirão?): ${mutirao.map(([d, r]) => `${d}: ${r.fin}`).join(', ')}`)
  }

  // O que SERIA gravado
  const totalAb = data.days.reduce((a, r) => a + (Number(r.abertos) || 0), 0)
  const totalFin = data.days.reduce((a, r) => a + (Number(r.finalizados) || 0), 0)
  console.log(`Ensaio a seco — ${CAMINHO}, de ${desde} até hoje\n`)
  console.log(`  linhas de dia:        ${data.days.length}  (setor: ${setores.join(', ') || '—'})`)
  console.log(`  linhas de atendente:  ${data.attendants.length}  (${nomes.length} pessoas)`)
  console.log(`  abertos:              ${totalAb}`)
  console.log(`  finalizados:          ${totalFin}`)
  console.log(`  parados agora:        ${data.snapshot.pendingNow} sem atendimento · ${data.snapshot.openNow} em andamento`)
  console.log('\n  por pessoa:')
  const pp = new Map()
  for (const a of data.attendants) {
    const r = pp.get(a.name) ?? { ab: 0, fin: 0 }
    r.ab += Number(a.abertos) || 0
    r.fin += Number(a.finalizados) || 0
    pp.set(a.name, r)
  }
  for (const [n, r] of [...pp].sort((x, y) => y[1].ab - x[1].ab)) {
    const p = porNorm.get(norm(n))
    const onde = p ? `${p.department?.name ?? 'sem setor'}${p.active ? '' : ', INATIVA'}` : '⚠️ fora do diretório'
    console.log(`    ${n.padEnd(22)} ${String(r.ab).padStart(4)} abertos  ${String(r.fin).padStart(4)} finalizados   (${onde})`)
  }

  console.log('')
  if (problemas.length) {
    console.log('⚠️  NÃO ligue a fonte ainda:')
    for (const p of problemas) console.log(`  ${p}`)
    process.exitCode = 1
  } else {
    console.log('✅ Os três conferem. Pode ligar a fonte.')
  }
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
