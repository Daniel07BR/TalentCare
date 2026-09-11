// ENSAIO do DETALHE DE SISTEMA dentro do relatório do setor. Não escreve nada.
//   node --env-file=.env scripts/ensaio-detalhe-setor.mjs
//
// ⚠️⚠️ POR QUE ELE EXISTE. A janela "Ver detalhes" abre a PÁGINA do sistema
// recortada para o setor, e o cartão de onde se clicou vem de OUTRA rota
// (`/api/dept-metrics`). Se as duas contas divergirem, o gestor clica num
// cartão de 503 e a janela abre com 497 — o mesmo número em duas alturas da
// mesma tela. Este script refaz, para cada setor, a conta da janela (a rota do
// sistema somada nas pessoas ATIVAS do setor, que é o que `RecorteDoSetor`
// entrega à página) e a compara com o cartão, número por número.
//
// E confere as duas travas de alcance que o detalhe depende:
//   - `/api/whatsapp-overview?setor=` de um setor ALHEIO → 403 para gestor
//   - `/api/classroom-courses` não leva cursos de autor fora do alcance
import { PrismaClient } from '@prisma/client'
import { encode } from 'next-auth/jwt'

const prisma = new PrismaClient()
const BASE = 'http://127.0.0.1:8082'
const PERIODOS = ['period=30d', 'period=Ano']

const cookie = async (u) => `authjs.session-token=${await encode({
  token: { sub: u.id, role: u.role, checadoEm: Date.now() }, secret: process.env.AUTH_SECRET, salt: 'authjs.session-token',
})}`
const get = async (path, ck) => {
  const r = await fetch(`${BASE}${path}`, { headers: { cookie: ck } })
  return { status: r.status, j: r.ok ? await r.json() : null }
}

const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', active: true }, select: { id: true, role: true } })
const ckAdmin = await cookie(admin)
const setores = await prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })

let falhas = 0, conferidos = 0
const soma = (rows, ids, campo) => rows.filter((r) => ids.has(r.nexusUserId)).reduce((a, r) => a + (r[campo] ?? 0), 0)
const confere = (nome, card, janela, falhasAqui) => {
  conferidos++
  if (card !== janela) { falhas++; falhasAqui.push(`${nome}: cartão ${card} × janela ${janela}`) }
}

for (const q of PERIODOS) {
  // As rotas por sistema são UMA chamada por período (o recorte é da janela).
  const api = {}
  for (const s of ['helpdesk', 'classroom', 'cide', 'consultoria', 'gerencia', 'radio', 'chat']) {
    api[s] = (await get(`/api/${s}-metrics?${q}`, ckAdmin)).j
  }
  console.log(`\n══ ${q}`)
  for (const st of setores) {
    const ativos = await prisma.user.findMany({
      where: { departmentId: st.id, active: true, foraDoDiretorio: false, origin: { in: ['nexus', 'staff'] } },
      select: { nexusUserId: true },
    })
    if (!ativos.length) continue
    const ids = new Set(ativos.map((a) => a.nexusUserId).filter(Boolean))
    const { status, j: m } = await get(`/api/dept-metrics?id=${st.id}&${q}`, ckAdmin)
    if (status !== 200) { console.log(`   ${st.name}: dept-metrics HTTP ${status}`); continue }
    const f = []
    const hd = api.helpdesk.byUser, cl = api.classroom.byUser, ci = api.cide.byUser, co = api.consultoria.byUser, ge = api.gerencia.byUser, ra = api.radio.byUser, ch = api.chat.byUser
    confere('HelpDesk abertos', m.helpdesk.abertos, soma(hd, ids, 'opened'), f)
    // ⚠️ "Resolvidos" = fluxo normal + formalizados, nas DUAS telas (`helpdeskVM`
    // e `dept-metrics`). A primeira versão deste ensaio comparou só o campo cru
    // `resolved` e acusou 9 divergências que não existiam na tela.
    confere('HelpDesk resolvidos', m.helpdesk.resolvidos, soma(hd, ids, 'resolved') + soma(hd, ids, 'formalized'), f)
    confere('ClassRoom criados', m.classroom.criados, soma(cl, ids, 'created'), f)
    confere('ClassRoom concluídos', m.classroom.assistidos, soma(cl, ids, 'courses'), f)
    confere('ClassRoom vídeos', m.classroom.videos, soma(cl, ids, 'videos'), f)
    confere('CIDE', m.cide.atividades, soma(ci, ids, 'atividades'), f)
    confere('Consultoria estudos', m.consultoria.estudos, soma(co, ids, 'studies'), f)
    confere('Consultoria chamados', m.consultoria.chamados, soma(co, ids, 'tickets'), f)
    confere('Consultoria mensagens', m.consultoria.mensagens, soma(co, ids, 'messages'), f)
    confere('Consultoria comentários', m.consultoria.comentarios, soma(co, ids, 'comments'), f)
    confere('Gerência serviços', m.gerencia.servicos, soma(ge, ids, 'servicos'), f)
    confere('Gerência km', m.gerencia.km, soma(ge, ids, 'km'), f)
    confere('Gerência saídas', m.gerencia.saidas, soma(ge, ids, 'saidas'), f)
    confere('Rádio horas', m.radio.horas, Math.round(soma(ra, ids, 'seconds') / 3600), f)
    confere('Chat mensagens', m.chat.msgCanais + m.chat.msgDiretas + m.chat.msgChamados,
      soma(ch, ids, 'msgCanais') + soma(ch, ids, 'msgDiretas') + soma(ch, ids, 'msgChamados'), f)
    // Os chamados do Chat na janela vêm POR SETOR (a mesma fonte do cartão "Chamados entre setores").
    const cs = api.chat.byDept.find((s) => s.id === st.id)
    if (m.chamadosDoSetor) confere('Chat chamados recebidos', m.chamadosDoSetor.recebeu, cs?.recebidosAbertos ?? 0, f)
    // WhatsApp: a janela pede a rota com ?setor=
    const w = (await get(`/api/whatsapp-overview?${q}&setor=${st.id}`, ckAdmin)).j
    confere('WhatsApp abertos', m.whatsapp.abertos, w.kpis.abertos, f)
    confere('WhatsApp finalizados', m.whatsapp.finalizados, w.kpis.finalizados, f)
    console.log(`   ${f.length ? '❌' : '✅'} ${st.name.padEnd(13)} ${f.length ? f.join(' · ') : 'todos os números batem'}`)
  }
}

// ── as travas de alcance, com uma gestora de verdade
const gestora = await prisma.user.findFirst({ where: { role: 'GESTOR', name: { startsWith: 'Priscila Ara' } }, select: { id: true, role: true } })
const ckG = await cookie(gestora)
const meu = await prisma.setorAvaliador.findFirst({ where: { userId: gestora.id }, select: { departmentId: true } })
const alheio = setores.find((s) => s.id !== meu.departmentId && s.name === 'Fiscal')
const wMeu = await get(`/api/whatsapp-overview?period=Ano&setor=${meu.departmentId}`, ckG)
const wAlheio = await get(`/api/whatsapp-overview?period=Ano&setor=${alheio.id}`, ckG)
console.log(`\n── alcance · Priscila Araújo (GESTOR, Contábil)`)
console.log(`   ${wMeu.status === 200 ? '✅' : '❌'} WhatsApp do próprio setor: HTTP ${wMeu.status}`)
console.log(`   ${wAlheio.status === 403 ? '✅' : '❌'} WhatsApp do Fiscal: HTTP ${wAlheio.status} (esperado 403)`)
if (wMeu.status !== 200) falhas++
if (wAlheio.status !== 403) falhas++
const cursosAdmin = (await get('/api/classroom-courses?period=Ano', ckAdmin)).j.courses
const cursosG = (await get('/api/classroom-courses?period=Ano', ckG)).j.courses
const meusNx = new Set((await prisma.user.findMany({ where: { departmentId: meu.departmentId }, select: { nexusUserId: true } })).map((u) => u.nexusUserId))
const vazados = cursosG.filter((c) => !meusNx.has(c.creatorNexusUserId)).length
console.log(`   ${vazados === 0 ? '✅' : '❌'} Cursos: a casa tem ${cursosAdmin.length} no ano; ela recebe ${cursosG.length}, ${vazados} de fora do setor`)
if (vazados) falhas++

console.log(`\n${falhas === 0 ? '✅' : '❌'} ${conferidos} números conferidos, ${falhas} divergências`)
await prisma.$disconnect()
process.exit(falhas ? 1 : 0)
