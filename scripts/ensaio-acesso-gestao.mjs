// ENSAIO ponta a ponta do DEGRAU `TALENTCARE_ACESSO_GESTAO`, com sessão DE VERDADE.
// Não escreve nada.
//   node --env-file=.env scripts/ensaio-acesso-gestao.mjs
//
// ⚠️⚠️ POR QUE ELE EXISTE. O banco dizendo `role='GESTOR'` prova que o sync
// calculou o que se queria — não prova que a PESSOA entra, nem que ela para na
// porta do setor do vizinho. São duas réguas (a porta, em `proxy.ts`, e o
// conteúdo, em `lib/alcance.ts` + `regua.ts`) e o defeito clássico é uma passar
// e a outra não: a tela oferece e a rota responde 403.
//
// Para CADA gestor/sub liberado, cinco perguntas:
//   1. o relatório do setor DELE responde 200 e com a equipe dele dentro
//   2. o relatório de um setor de OUTRO responde 403
//   3. `/ranking` (painel da casa) não se abre
//   4. `/dashboard` (a empresa inteira) não se abre
//   5. a página dele chega sem o botão e sem os cartões da Diretoria (11/09/2026)
// E a contraprova do 5: a Diretoria recebe os dois.
import { PrismaClient } from '@prisma/client'
import { encode } from 'next-auth/jwt'

const prisma = new PrismaClient()
const BASE = 'http://127.0.0.1:8082'
// As marcas da janela de cartões (11/09/2026): o atributo do botão, no HTML, e a
// descrição do cartão de Configurações, que só viaja nos dados da página (RSC) de
// quem recebe os cartões (`lib/ui/menu.ts`). ⚠️ A LISTA de nomes das telas vai no
// JS que toda sessão baixa (é o "voltar"); é nome de tela, não dado.
const MARCA_BOTAO = 'data-menu-telas'
const MARCA_CARTOES = 'as fontes de dados'

const cookieDe = async (u) =>
  encode({
    token: { sub: u.id, role: u.role, departmentName: u.department?.name ?? null, checadoEm: Date.now() },
    secret: process.env.AUTH_SECRET,
    salt: 'authjs.session-token',
  })

// `redirect: 'manual'` é o ponto: o middleware responde 307 para /meu-setor e
// seguir o redirect esconderia justamente a barreira que se quer medir.
const bate = async (path, token) =>
  fetch(`${BASE}${path}`, { headers: { cookie: `authjs.session-token=${token}` }, redirect: 'manual' })

const gestores = await prisma.user.findMany({
  where: { role: 'GESTOR', leftAt: null },
  select: { id: true, name: true, jobTitle: true, role: true, department: { select: { id: true, name: true } } },
  orderBy: { name: 'asc' },
})

// Os setores que cada um AVALIA — é o vínculo que manda, não o setor em que a
// pessoa senta (o Evandro e a Joice são do Legal e respondem pelas Entregas).
const vinculos = await prisma.setorAvaliador.findMany({
  select: { userId: true, departmentId: true },
})
const todosSetores = await prisma.department.findMany({ select: { id: true, name: true } })
// ⚠️ `SetorAvaliador` guarda só o `departmentId` (não há relação declarada no
// schema), então o nome do setor vem daqui.
const setorPorId = new Map(todosSetores.map((s) => [s.id, s]))
const porUser = new Map()
for (const v of vinculos) {
  if (!porUser.has(v.userId)) porUser.set(v.userId, [])
  porUser.get(v.userId).push(setorPorId.get(v.departmentId) ?? { id: v.departmentId, name: '(setor sumido)' })
}

let falhas = 0
const conta = (ok, texto) => { if (!ok) falhas++; return `${ok ? '✅' : '❌'} ${texto}` }

console.log(`${gestores.length} pessoas com papel GESTOR\n`)
for (const g of gestores) {
  const meus = porUser.get(g.id) ?? (g.department ? [g.department] : [])
  const alheio = todosSetores.find((s) => !meus.some((m) => m.id === s.id) && s.name !== 'Diretoria')
  const token = await cookieDe(g)

  console.log(`── ${g.name} [${g.jobTitle}] · responde por: ${meus.map((m) => m.name).join(', ') || '(nenhum)'}`)

  for (const m of meus) {
    const r = await bate(`/api/dept-metrics?id=${m.id}&period=30d`, token)
    const d = r.ok ? await r.json() : null
    const equipe = d?.pessoas?.length ?? d?.equipe?.length ?? null
    console.log('   ' + conta(r.status === 200, `setor dele (${m.name}): HTTP ${r.status}${equipe !== null ? ` · ${equipe} pessoas` : ''}`))
  }

  const rAlheio = await bate(`/api/dept-metrics?id=${alheio.id}&period=30d`, token)
  console.log('   ' + conta(rAlheio.status === 403, `setor alheio (${alheio.name}): HTTP ${rAlheio.status} (esperado 403)`))

  const rRank = await bate('/ranking', token)
  console.log('   ' + conta(rRank.status === 307 || rRank.status === 302, `/ranking: HTTP ${rRank.status} → ${rRank.headers.get('location') ?? '(sem redirect)'}`))

  const rDash = await bate('/dashboard', token)
  console.log('   ' + conta(rDash.status === 307 || rDash.status === 302, `/dashboard: HTTP ${rDash.status} → ${rDash.headers.get('location') ?? '(sem redirect)'}`))

  // 5. (11/09/2026) Sem menu lateral: a página do setor dele chega SEM o botão da
  //    janela e SEM os cartões da Diretoria — nem escondidos, nem nos dados da página.
  if (meus[0]) {
    const rPag = await bate(`/departamentos/${meus[0].id}`, token)
    const html = rPag.status === 200 ? await rPag.text() : ''
    const limpo = rPag.status === 200 && !html.includes(MARCA_BOTAO) && !html.includes(MARCA_CARTOES)
    console.log('   ' + conta(limpo, `página do setor sem o botão e sem os cartões da Diretoria (HTTP ${rPag.status})`))
  }
}

// A outra metade da prova: a Diretoria RECEBE o botão e os cartões. Sem ela, um
// botão que sumiu para todo mundo passaria como "o gestor não vê".
const diretor = await prisma.user.findFirst({
  where: { role: 'ADMIN', leftAt: null },
  select: { id: true, name: true, role: true, department: { select: { name: true } } },
  orderBy: { name: 'asc' },
})
if (diretor) {
  const r = await bate('/dashboard', await cookieDe(diretor))
  const html = r.status === 200 ? await r.text() : ''
  console.log(`\n── Diretoria · ${diretor.name}`)
  console.log('   ' + conta(r.status === 200 && html.includes(MARCA_BOTAO), `/dashboard traz o botão da janela de cartões (HTTP ${r.status})`))
  console.log('   ' + conta(html.includes(MARCA_CARTOES), '/dashboard traz os cartões (o de Configurações)'))
}

// A contraprova: um colaborador comum continua fora. Sem ela o ensaio diria
// "todo mundo passou" num sistema que tivesse aberto para os 87.
const colab = await prisma.user.findFirst({
  where: { role: 'SEM_PERMISSAO', leftAt: null, origin: 'nexus' },
  select: { id: true, name: true, role: true, department: { select: { id: true, name: true } } },
})
if (colab) {
  const token = await cookieDe(colab)
  const r = await bate(`/api/dept-metrics?id=${colab.department?.id}&period=30d`, token)
  const p = await bate('/departamentos', token)
  console.log(`\n── contraprova · ${colab.name} (SEM_PERMISSAO, ${colab.department?.name})`)
  console.log('   ' + conta(r.status === 403, `dept-metrics do próprio setor: HTTP ${r.status} (esperado 403)`))
  console.log('   ' + conta(p.status === 307 || p.status === 302, `/departamentos: HTTP ${p.status} → ${p.headers.get('location') ?? '(sem redirect)'}`))
}

console.log(falhas === 0 ? '\n✅ ensaio limpo' : `\n❌ ${falhas} verificações falharam`)
await prisma.$disconnect()
process.exit(falhas === 0 ? 0 : 1)
