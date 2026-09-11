/* ENSAIO do PAINEL PRINCIPAL (`/dashboard`, no desenho novo desde 11/09/2026). Não escreve nada.
 *
 *   npx --yes tsx@4 --env-file=.env --tsconfig scripts/tsconfig.json scripts/ensaio-painel-novo.ts
 *
 * ⚠️⚠️ POR QUE ELE EXISTE. O dono pediu: "os números têm de ser OS MESMOS da página
 * atual — muda o desenho, não a conta". A página nova chama as mesmas funções
 * (`buildDashboard`, `classroomVM`…), e é por isso que o ensaio as IMPORTA em vez
 * de reimplementar: ele lê as MESMAS rotas que a tela lê (com uma sessão da
 * Diretoria), monta os mesmos mapas e confere, em oito janelas:
 *
 *   1. o que cada clique revela SOMA o número clicado (Atrasos, Advertências,
 *      Suspensões, Headcount; e cada grupo de Escolaridade/Geração/Gênero);
 *   2. as linhas de cada cartão de sistema são as do cartão da página atual (a
 *      lógica de ordem/filtro de lá está replicada aqui, marcada "ATUAL"), e somam
 *      o total que o cabeçalho do cartão diz;
 *   3. cada LINHA de setor = o número que a JANELA daquele setor abre (o resumo do
 *      sistema sobre o dataset recortado, com quem já saiu — `comQuemSaiu`);
 *   4. a janela de comparação dos selos: mesmos dias, mesmos dias da semana,
 *      sem sobrepor a atual, dentro do ponto;
 *   5. o acesso: a Diretoria abre `/dashboard` (e `/novo` redireciona); gestor e anônimo, não.
 */
import { encode } from 'next-auth/jwt'
import { prisma } from '../lib/db/prisma'
import { getTalentData } from '../lib/data/source'
import { withRealScores } from '../lib/mock/score'
import { buildDashboard, type Period } from '../lib/mock/dashboard'
import { generationsVM, genderVM } from '../lib/mock/demographics'
import { classroomVM } from '../lib/mock/classroom'
import { radioVM } from '../lib/mock/radio'
import { consultoriaVM } from '../lib/mock/consultoria'
import { helpdeskVM } from '../lib/mock/helpdesk'
import { cideVM } from '../lib/mock/cide'
import { chatVM, type ChatSetor } from '../lib/mock/chat'
import { gerenciaVM } from '../lib/mock/gerencia'
import { periodDays } from '../lib/period-range'
import {
  linhasWhatsapp, linhasClassroom, linhasDe, somaLinhas, gruposEscolaridade, gruposGeracao, gruposGenero,
  janelaDeComparacao, seloVariacao, diasComExpediente, compararMesmasPessoas, mapaDaCasa, somaAssiduidade, listaMinutos,
  type Linha,
} from '../lib/painel/visao'
import type { TalentData } from '../lib/mock/data'

const BASE = 'http://127.0.0.1:8082'
const JANELAS: { nome: string; period: Period; from?: string; to?: string }[] = [
  { nome: '7 dias', period: '7d' }, { nome: '30 dias', period: '30d' },
  { nome: 'Trimestre', period: 'Trimestre' }, { nome: 'Ano', period: 'Ano' },
  { nome: 'jun/26', period: 'custom', from: '2026-06-01', to: '2026-06-30' },
  { nome: 'jul/26', period: 'custom', from: '2026-07-01', to: '2026-07-31' },
  { nome: 'ago/26', period: 'custom', from: '2026-08-01', to: '2026-08-31' },
]

const cookie = async (u: { id: string; role: string; email?: string | null }) => `authjs.session-token=${await encode({
  token: { sub: u.id, role: u.role, email: u.email ?? undefined, checadoEm: Date.now() }, secret: process.env.AUTH_SECRET!, salt: 'authjs.session-token',
})}`

let conferidos = 0, falhas = 0
const erros: string[] = []
function confere(onde: string, oque: string, a: unknown, b: unknown) {
  conferidos++
  const ja = JSON.stringify(a), jb = JSON.stringify(b)
  if (ja !== jb) { falhas++; erros.push(`${onde} · ${oque}: ${ja.slice(0, 120)} × ${jb.slice(0, 120)}`) }
}

/** O recorte que a janela de UM setor aplica (`RecorteDoSetor` com `incluiDesligados`). */
const recorte = (data: TalentData, id: string): TalentData => ({
  ...data,
  employees: data.employees.filter((e) => e.dept === id),
  departments: data.departments.filter((d) => d.id === id),
})

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', active: true }, select: { id: true, role: true } })
  if (!admin) throw new Error('sem ADMIN ativo')
  const ck = await cookie(admin)
  const get = async (path: string) => {
    const r = await fetch(`${BASE}${path}`, { headers: { cookie: ck } })
    if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`)
    return r.json()
  }
  const base = await getTalentData({ tipo: 'tudo' })

  for (const jn of JANELAS) {
    const { fromDay, toDay } = periodDays(jn.period, jn.from, jn.to)
    const qs = new URLSearchParams({ period: jn.period })
    if (jn.period === 'custom') { qs.set('from', fromDay); qs.set('to', toDay) }
    const q = qs.toString()
    const onde = jn.nome
    console.log(`\n══ ${jn.nome} (${fromDay} a ${toDay})`)

    // ── as MESMAS rotas que a tela lê, lidas como os ganchos leem
    const [as, sc, wp, cl, ra, co, hd, ci, ch, ge] = await Promise.all([
      get(`/api/assiduidade-metrics?${q}`), get(`/api/score-metrics?${q}`), get(`/api/whatsapp-by-dept?${q}`),
      get(`/api/classroom-metrics?${q}`), get(`/api/radio-metrics?${q}`), get(`/api/consultoria-metrics?${q}`),
      get(`/api/helpdesk-metrics?${q}`), get(`/api/cide-metrics?${q}`), get(`/api/chat-metrics?${q}`), get(`/api/gerencia-metrics?${q}`),
    ])
    const assidMap = new Map<string, any>()
    for (const u of as.byPerson) assidMap.set(u.personKey, {
      atrasos: u.atrasos, abonados: u.abonados, minutos: u.minutos, advertencias: u.advertencias,
      lgpdSuspensoes: u.lgpdSuspensoes ?? 0, lgpdAdvertencias: u.lgpdAdvertencias ?? 0, suspensoesAtraso: u.suspensoesAtraso ?? 0,
    })
    const signals = {
      porPessoa: new Map<string, any>(sc.byPerson.map((p: any) => [p.id, { activity: p.activity, atrasos: p.atrasos, advertencias: p.advertencias }])),
      janelaComPonto: sc.janelaComPonto ?? false, motivoSemPonto: sc.motivoSemPonto ?? null,
      pontuacao: new Map<string, number>((sc.pontuacao ?? []).map((p: any) => [p.id, p.pontos])),
      competenciaPontuacao: sc.competenciaPontuacao, estadoPontuacao: sc.estadoPontuacao,
    }
    const data = withRealScores(base, signals as any)
    const vm = buildDashboard(data, jn.period, {
      assidMap, from: jn.from ?? '', to: jn.to ?? '',
      janelaComPonto: as.janelaComPonto ?? false, motivoSemPonto: as.motivoSemPonto ?? null,
      atrasosPorDia: as.porDia ?? [], pontoDesde: as.pontoDesde ?? null, pontoAte: as.pontoAte ?? null,
      lgpdSuspensoes: as.lgpdSuspensoes ?? null, suspensoesAtraso: as.suspensoesAtraso ?? null, lgpdAdvertencias: as.lgpdAdvertencias ?? null,
      pontuacao: signals.pontuacao, competenciaPontuacao: signals.competenciaPontuacao, estadoPontuacao: signals.estadoPontuacao,
    })
    const k = (l: string) => vm.kpis.find((x) => x.label === l)!
    console.log(`   números: ${vm.kpis.map((x) => `${x.label} ${x.value}`).join(' · ')}`)

    // ── 1. o clique soma o número clicado
    for (const l of ['Atrasos', 'Advertências']) {
      const kk = k(l)
      if (typeof kk.value === 'number') confere(onde, `lista de ${l} soma o cartão`, (kk.pessoas ?? []).reduce((a, p) => a + p.valor, 0), kk.value)
    }
    const su = k('Suspensões')
    if (typeof su.value === 'number') {
      // A lista mostra MEDIDAS (suspensões + advertências de LGPD); o cartão conta só as suspensões.
      const pk = new Map(data.employees.map((e) => [e.id, e.nexusUserId ?? e.id]))
      const s = (su.pessoas ?? []).reduce((a, p) => { const m = assidMap.get(pk.get(p.id)!); return a + (m?.suspensoesAtraso ?? 0) + (m?.lgpdSuspensoes ?? 0) }, 0)
      confere(onde, 'lista de Suspensões soma o cartão', s, su.value)
    }
    const [ent, sai] = (k('Headcount').nota.match(/\d+/g) ?? []).map(Number)
    confere(onde, 'Headcount abre entradas + saídas', (k('Headcount').pessoas ?? []).length, ent + sai)
    confere(onde, 'Turnover: a curva soma as saídas', vm.turnoverVals.reduce((a, b) => a + b, 0), vm.turnoverSaidas)
    confere(onde, 'Turnover: a taxa da curva = a do cartão', vm.turnoverWinRate, k('Turnover').value)

    // ── 2. as linhas de cada cartão = as do cartão ATUAL, e somam o total do cabeçalho
    // ATUAL (WhatsappDeptCard): filtra > 0, ordena desc.
    const wAtual = [...wp.departments].filter((x: any) => x.abertos > 0).sort((a: any, b: any) => b.abertos - a.abertos).map((x: any) => [x.name, x.abertos])
    confere(onde, 'WhatsApp: linhas', linhasWhatsapp(wp.departments).map((l) => [l.nome, l.valor]), wAtual)
    confere(onde, 'WhatsApp: soma = total da rota', somaLinhas(linhasWhatsapp(wp.departments)), wp.totalAbertos)
    // A barra abre a janela da FILA (decisão do dono): o número da janela = o da barra.
    for (const l of linhasWhatsapp(wp.departments)) {
      const jf = await get(`/api/whatsapp-overview?${q}&fila=${encodeURIComponent(l.id!)}`)
      confere(onde, `WhatsApp · fila ${l.nome}: barra × janela da fila`, l.valor, jf.kpis.abertos)
    }

    const clMap = new Map<string, any>(cl.byUser.map((u: any) => [u.nexusUserId, { videos: u.videos, courses: u.courses, created: u.created }]))
    const raMap = new Map<string, any>(ra.byUser.map((u: any) => [u.nexusUserId, { seconds: u.seconds, sessions: u.sessions }]))
    const coMap = new Map<string, any>(co.byUser.map((u: any) => [u.nexusUserId, { studies: u.studies, tickets: u.tickets, messages: u.messages, comments: u.comments }]))
    const hdMap = new Map<string, any>(hd.byUser.map((u: any) => [u.nexusUserId, { opened: u.opened, resolved: u.resolved, formalized: u.formalized, resolvedSeconds: u.resolvedSeconds }]))
    const ciMap = new Map<string, any>(ci.byUser.map((u: any) => [u.nexusUserId, { atividades: u.atividades }]))
    const chMap = new Map<string, any>(ch.byUser.map((u: any) => [u.nexusUserId, {
      msgCanais: u.msgCanais, msgDiretas: u.msgDiretas, msgChamados: u.msgChamados, chamadosAbertos: u.chamadosAbertos,
      chamadosAssumidos: u.chamadosAssumidos, chamadosConcluidos: u.chamadosConcluidos, segundosResolucao: u.segundosResolucao,
    }]))
    const geMap = new Map<string, any>(ge.byUser.map(({ nexusUserId, ...s }: any) => [nexusUserId, s]))
    const setores: ChatSetor[] = ch.byDept ?? []

    // Os resumos da janela leem o dataset CRU (`useTalentData()`), não o do score.
    const cvm = classroomVM(base, clMap), rvm = radioVM(base, raMap), covm = consultoriaVM(base, coMap)
    const hvm = helpdeskVM(base, hdMap), civm = cideVM(base, ciMap), chvm = chatVM(base, chMap, setores), gvm = gerenciaVM(base, geMap)

    const lCl = linhasClassroom(cvm.deptBars)
    confere(onde, 'ClassRoom: linhas', lCl.map((l) => [l.nome, l.valor]), [...cvm.deptBars].sort((a, b) => b.created - a.created).map((d) => [d.nome, d.created]))
    confere(onde, 'ClassRoom: soma = cursos criados', somaLinhas(lCl), cvm.totals.created)
    const lRa = linhasDe(rvm.deptBars, (d) => d.horas)
    confere(onde, 'Rádio: soma = horas', somaLinhas(lRa), rvm.totalHoras)
    const lCi = linhasDe(civm.deptBars, (d) => d.atividades)
    confere(onde, 'CIDE: soma = empresas atendidas', somaLinhas(lCi), civm.totalAtividades)
    confere(onde, 'Consultoria: tabela soma o total', ['studies', 'tickets', 'messages', 'comments'].map((c) => covm.deptBars.reduce((a: number, d: any) => a + d[c], 0)),
      ['studies', 'tickets', 'messages', 'comments'].map((c) => (covm.totals as any)[c]))
    confere(onde, 'HelpDesk: tabela soma o total', [hvm.deptBars.reduce((a, d) => a + d.opened, 0), hvm.deptBars.reduce((a, d) => a + d.resolved, 0)], [hvm.totals.opened, hvm.totals.resolved])
    const lGs = linhasDe(gvm.execBars, (d) => d.valor), lGk = linhasDe(gvm.kmBars, (d) => d.valor)
    confere(onde, 'Gerência: soma = serviços', somaLinhas(lGs), gvm.totais.servicos)
    confere(onde, 'Gerência: soma = km', somaLinhas(lGk), gvm.totais.km)

    // ── 3. cada linha de setor = o número que a janela daquele setor abre
    let linhasSetor = 0
    const porSetor = (nome: string, linhas: Linha[], janela: (d: TalentData) => number) => {
      for (const l of linhas) {
        if (!l.id) continue
        linhasSetor++
        confere(onde, `${nome} · ${l.nome}: barra × janela do setor`, l.valor, janela(recorte(base, l.id)))
      }
    }
    porSetor('ClassRoom', lCl, (d) => classroomVM(d, clMap).totals.created)
    porSetor('Rádio', lRa, (d) => radioVM(d, raMap).totalHoras)
    porSetor('CIDE', lCi, (d) => cideVM(d, ciMap).totalAtividades)
    porSetor('Gerência serviços', lGs, (d) => gerenciaVM(d, geMap).totais.servicos)
    porSetor('Gerência km', lGk, (d) => gerenciaVM(d, geMap).totais.km)
    for (const c of ['studies', 'tickets', 'messages', 'comments'] as const) {
      porSetor(`Consultoria ${c}`, covm.deptBars.map((d) => ({ id: d.id, nome: d.nome, cor: '', valor: d[c] })), (d) => consultoriaVM(d, coMap).totals[c])
    }
    for (const c of ['opened', 'resolved'] as const) {
      porSetor(`HelpDesk ${c}`, hvm.deptBars.map((d) => ({ id: d.id, nome: d.nome, cor: '', valor: d[c] })), (d) => helpdeskVM(d, hdMap).totals[c])
    }
    // Chat: a janela do setor filtra os chamados POR SETOR (`byDept`), não pelas pessoas.
    for (const s of chvm.porSetor) {
      if (!s.id) continue
      linhasSetor++
      const j = chatVM(recorte(base, s.id), chMap, setores.filter((x) => x.id === s.id)).totaisSetor
      confere(onde, `Chat · ${s.nome}: linha × janela`, [s.pedidosAbertos, s.recebidosAbertos, s.recebidosConcluidos], [j.pedidosAbertos, j.recebidosAbertos, j.recebidosConcluidos])
    }

    // ── 4. a janela de comparação dos selos
    const j = janelaDeComparacao(fromDay, toDay, as.pontoDesde ?? null, as.pontoAte ?? null, as.janelaComPonto ?? false)
    if (!j) console.log('   selos: sem comparação nesta janela (regra: medida, ≤ 4 meses, anterior dentro do ponto)')
    else {
      const dia = (s: string) => new Date(`${s}T12:00:00Z`).getUTCDay()
      const n = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5) + 1
      confere(onde, 'selo: mesmo número de dias', n(j.de, j.ate), n(j.atualDe, j.atualAte))
      confere(onde, 'selo: mesmo dia da semana', dia(j.de), dia(j.atualDe))
      confere(onde, 'selo: anterior não sobrepõe a atual', j.ate < j.atualDe, true)
      confere(onde, 'selo: anterior dentro do ponto', j.de >= as.pontoDesde, true)
      const ant = await get(`/api/assiduidade-metrics?period=custom&from=${j.de}&to=${j.ate}`)
      const mapAnt = new Map<string, any>(ant.byPerson.map((u: any) => [u.personKey, { atrasos: u.atrasos, abonados: u.abonados, minutos: u.minutos, advertencias: u.advertencias }]))
      // As duas travas do crítico: mesmo número de dias com expediente, mesmas pessoas.
      const expA = diasComExpediente(as.porDia ?? [], j.atualDe, j.atualAte), expB = diasComExpediente(ant.porDia ?? [], j.de, j.ate)
      if (expA !== expB || expA === 0) console.log(`   selos: sem selo — dias com expediente ${expA} × ${expB} (feriado de um lado)`)
      else {
        const c = compararMesmasPessoas(base, j.de, assidMap, mapAnt)
        confere(onde, 'selo: há gente nas duas janelas', c.pessoas > 0, true)
        // Só o de Atrasos vai à tela: a advertência é derivada do 2º atraso do mês e
        // o total dela depende de onde a janela corta o mês (crítico, rodada 2).
        const sel = (['atrasos'] as const).map((f) => {
          const sv = seloVariacao(c.atual[f], c.anterior[f])
          return `${f} ${c.atual[f]} vs ${c.anterior[f]} → ${sv ? `${sv.seta} ${sv.texto}` : 'sem selo'}`
        })
        console.log(`   selos: ${j.atualDe}…${j.atualAte} contra ${j.de}…${j.ate} · ${expA} dias com expediente · mesmas ${c.pessoas} pessoas · ${sel.join(' · ')}`)
      }
    }

    // ── 4b. o calendário da casa: cada dia = o que o banco conta para a mesma gente
    const mp = await get(`/api/assiduidade-mapa?${q}`)
    const mapa = mapaDaCasa(base, mp.chaves, mp.linhas)
    const semDir = base.employees.filter((e) => !(base.deptMeta[e.dept] || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes('diretoria'))
    const direto = await prisma.assiduidadeDaily.groupBy({
      by: ['day'], where: { day: { gte: fromDay, lte: toDay }, personKey: { in: semDir.map((e) => e.nexusUserId ?? e.id) } },
      _sum: { atrasos: true, minutosAtraso: true }, _count: { _all: true }, orderBy: { day: 'asc' },
    })
    confere(onde, 'calendário: dias, pessoas, atrasos e minutos = banco',
      mapa.dias.map((d) => [d.day, d.pessoas, d.atrasos, d.minutos]),
      direto.map((d) => [d.day, d._count._all, d._sum.atrasos ?? 0, d._sum.minutosAtraso ?? 0]))
    for (const d of mapa.dias) {
      const n = mapa.quemNoDia.filter((l) => l.day === d.day).length
      if (n !== d.pessoas) confere(onde, `calendário ${d.day}: lista = cor`, n, d.pessoas)
    }
    conferidos++
    const kA = k('Atrasos').value
    if (typeof kA === 'number') {
      const ativos = mapa.quemNoDia.filter((l) => !mapa.quem[l.id].saiu).reduce((a, l) => a + l.atrasos, 0)
      confere(onde, 'calendário (só quem está no quadro) = cartão Atrasos', ativos, kA)
      confere(onde, 'lista de minutos soma o número de minutos', listaMinutos(base, assidMap).reduce((a, p) => a + p.valor, 0), somaAssiduidade(base, assidMap).minutos)
    }

    // ── 5 (uma vez): demografia — retrato de hoje, não depende da janela
    if (jn.period === '30d') {
      const gE = gruposEscolaridade(data, vm.escSegments)
      for (const g of gE) confere('demografia', `Escolaridade ${g.rotulo}: lista = fatia`, g.pessoas.length, g.quantos)
      const gen = generationsVM(data).overall
      for (const g of gruposGeracao(data, gen.segs)) confere('demografia', `Geração ${g.rotulo}: lista = segmento`, g.pessoas.length, g.quantos)
      const gd = genderVM(data).overall
      const [m, f, ni] = gruposGenero(data)
      confere('demografia', 'Gênero: M, F, não informado', [m.quantos, f.quantos, ni.quantos], [gd.m, gd.f, gd.ni])
    }
    console.log(`   ${linhasSetor} linhas de setor conferidas contra a janela do setor`)
  }

  // ── acesso ao painel
  const ver = async (path: string, ck2: string | null) => {
    const r = await fetch(`${BASE}${path}`, { headers: ck2 ? { cookie: ck2 } : {}, redirect: 'manual' })
    return `${r.status}${r.headers.get('location') ? ` → ${new URL(r.headers.get('location')!, BASE).pathname}` : ''}`
  }
  const gestor = await prisma.user.findFirst({ where: { role: 'GESTOR', active: true }, select: { id: true, role: true, name: true } })
  const ckG = gestor ? await cookie(gestor) : null
  const a1 = await ver('/dashboard', ck)
  const a2 = ckG ? await ver('/dashboard', ckG) : 'sem gestor'
  const a3 = await ver('/dashboard', null)
  const a4 = await ver('/dashboard/novo', ck)
  const a5 = ckG ? await ver('/dashboard/anterior', ckG) : 'sem gestor'
  // O ranking da casa saiu (11/09/2026): o endereço leva ao painel.
  const a6 = await ver('/ranking', ck)
  // Saíram do MENU (11/09/2026): Relatórios leva ao painel; Casar ponto e Quem avalia
  // seguem por endereço (são ferramentas do import do ponto e das promoções).
  const a7 = await ver('/relatorios', ck)
  // ⚠️ `/ponto` mora na área de ADMINISTRAÇÃO, que é do DONO (allowlist
  // `TALENTCARE_ADMIN_EMAILS`), não de toda a Diretoria — o teste entra como um dono.
  const emailsDono = (process.env.TALENTCARE_ADMIN_EMAILS ?? '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)
  const dono = await prisma.user.findFirst({ where: { email: { in: emailsDono }, active: true }, select: { id: true, role: true, email: true } })
  const ckDono = dono ? await cookie(dono) : ck
  const a8 = await ver('/ponto', ckDono), a9 = await ver('/avaliadores', ckDono)
  const a10 = ckG ? await ver('/ponto', ckG) : 'sem gestor', a11 = ckG ? await ver('/avaliadores', ckG) : 'sem gestor'
  console.log(`\n── acesso ao painel`)
  console.log(`   Diretoria: ${a1} · gestor (${gestor?.name}): ${a2} · sem sessão: ${a3} · /novo: ${a4} · /anterior p/ gestor: ${a5} · /ranking: ${a6}`)
  confere('acesso', 'Diretoria abre', a1, '200')
  confere('acesso', 'gestor vai para o setor dele', a2.startsWith('307 → /meu-setor'), true)
  confere('acesso', 'sem sessão não abre', a3.startsWith('200'), false)
  confere('acesso', '/dashboard/novo leva ao painel', a4.includes('/dashboard'), true)
  confere('acesso', '/dashboard/anterior fechado ao gestor', a5.startsWith('307 → /meu-setor'), true)
  confere('acesso', '/ranking leva ao painel', a6.includes('/dashboard'), true)
  console.log(`   /relatorios: ${a7} · /ponto: ${a8} · /avaliadores: ${a9} · gestor em /ponto: ${a10} · em /avaliadores: ${a11}`)
  confere('acesso', '/relatorios leva ao painel', a7.includes('/dashboard'), true)
  confere('acesso', 'Casar ponto segue por endereço (para o dono)', a8, '200')
  confere('acesso', 'Quem avalia segue por endereço', a9, '200')
  confere('acesso', 'gestor fora do Casar ponto', a10.startsWith('200'), false)
  confere('acesso', 'gestor fora do Quem avalia', a11.startsWith('200'), false)

  if (erros.length) { console.log('\n❌ divergências:'); for (const e of erros) console.log(`   ${e}`) }
  console.log(`\n${falhas === 0 ? '✅' : '❌'} ${conferidos} conferências, ${falhas} divergências`)
  await prisma.$disconnect()
  process.exit(falhas ? 1 : 0)
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(2) })
