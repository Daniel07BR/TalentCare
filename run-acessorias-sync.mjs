// Coletor do ACESSÓRIAS (api.acessorias.com) → TalentCare. 10ª fonte, 30/09/2026.
// Rode: node --env-file=.env run-acessorias-sync.mjs [--completo] [--seco]
//
//   (sem flag)   processos + solicitações inteiros (são poucos: ~360 e ~10) e as
//                entregas ALTERADAS desde ontem (`deliveries/ListAll` só aceita
//                `DtLastDH` de hoje ou de ontem — é uma regra da API).
//   --completo   também as entregas empresa por empresa (~500 chamadas, ~8 min
//                a 1 por segundo). É o que pega entrega DESFEITA e o histórico.
//   --seco       só lê o Acessórias e imprime o que gravaria. Não abre o banco.
//
// ⚠️⚠️ Diferente das outras nove fontes, aqui NÃO existe endpoint `<algo>-daily`
// do nosso lado: o Acessórias é de fora. Este script chama a API deles, guarda
// cada processo/entrega/solicitação pelo id e REMONTA o `acessorias_daily` a
// partir desses registros. O porquê está no schema (bloco ACESSÓRIAS).
//
// ⚠️ Limite da API: 100 requisições por minuto por TOKEN, somadas a qualquer
// outro uso do mesmo token. Por isso o passo de 1 s — sobra folga para o resto.
const TOKEN = process.env.ACESSORIAS_API_TOKEN
const BASE = process.env.ACESSORIAS_BASE_URL || 'https://api.acessorias.com'
const SOURCE = 'acessorias'
const PASSO_MS = 1000
const DESDE = '2026-01-01' // a implantação começou em 2026; antes disso não há o que medir

const DOMINIOS_DA_CASA = new Set(['grupoitamarathy.com.br', 'itamarathyclassroom.com.br', 'grupoitamarathy.local'])
const AMBIGUO = Symbol('ambiguo')

const completo = process.argv.includes('--completo')
const seco = process.argv.includes('--seco')

const dorme = (ms) => new Promise((r) => setTimeout(r, ms))
let chamadas = 0

async function get(caminho) {
  for (let tentativa = 1; ; tentativa++) {
    await dorme(PASSO_MS)
    chamadas++
    const res = await fetch(`${BASE}/${caminho}`, { headers: { Authorization: `Bearer ${TOKEN}` } })
    if (res.status === 429 && tentativa <= 5) { await dorme(15000 * tentativa); continue }
    // ⚠️ 204 e 404 são "nada aqui" para a API (empresa sem entrega, página vazia).
    if (res.status === 204 || res.status === 404) return null
    if (!res.ok) throw new Error(`Acessórias ${res.status} em ${caminho}: ${(await res.text()).slice(0, 200)}`)
    const txt = await res.text()
    if (!txt.trim()) return null
    const json = JSON.parse(txt)
    // ⚠️ Erro de negócio vem com HTTP 200 e a chave `Erro`. Engolir seria gravar
    // "nenhum processo" — que é um número plausível.
    if (json && !Array.isArray(json) && json.Erro) throw new Error(`Acessórias em ${caminho}: ${json.Erro}`)
    return json
  }
}

async function todasPaginas(caminho) {
  const sep = caminho.includes('?') ? '&' : '?'
  const itens = []
  for (let p = 1; p < 1000; p++) {
    const d = await get(`${caminho}${sep}Pagina=${p}`)
    const lista = Array.isArray(d) ? d : d ? [d] : []
    if (!lista.length) break
    itens.push(...lista)
  }
  return itens
}

// ---- datas: a origem mistura dd/mm/aaaa, aaaa-mm-dd e "0000-00-00" ----
function dia(v) {
  if (!v) return null
  const s = String(v).trim()
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m && m[1] !== '0000') return `${m[1]}-${m[2]}-${m[3]}`
  return null
}
const hojeLocal = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
const diasEntre = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000)
const somaDias = (d, n) => new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10)
const idOuNull = (v) => (v === undefined || v === null || String(v).trim() === '' || String(v) === '0' ? null : String(v))

// ---- normalização ----
const usuario = (u) => ({ id: String(u.id), email: String(u.email ?? '').trim().toLowerCase(), nome: u.nome ?? '', ativo: u.status === 'Ativo' })

function processo(x, hoje) {
  const inicio = dia(x.ProcInicio)
  const dataFim = dia(x.ProcConclusao)
  const concluido = x.ProcStatus === 'Concluído'
  return {
    id: String(x.ProcID),
    matriz: x.ProcNome ?? '',
    departamento: x.ProcDepartamento ?? '',
    status: x.ProcStatus ?? '',
    gestorId: idOuNull(x.ProcGestor),
    inicio,
    conclusao: concluido ? dataFim : null,
    previsao: concluido ? null : dataFim,
    diasCorridos: inicio ? Math.max(0, diasEntre(inicio, concluido && dataFim ? dataFim : hoje)) : 0,
    percentual: Number(x.ProcPorcentagem) || 0,
    alteradoEm: x.DtLastDH ?? null,
  }
}

function entregas(empresa) {
  const out = []
  for (const e of empresa.Entregas ?? []) {
    const c = e.Config ?? {}
    if (!c.EntID) continue // sem `config` não há id — não dá para corrigir depois
    out.push({
      id: String(c.EntID),
      obrigacao: e.Nome ?? '',
      tipo: c.Tipo ?? '',
      departamento: c.DptoNome ?? '',
      respEntregaId: idOuNull(c.RespEntregaID),
      respPrazoId: idOuNull(c.RespPrazoID),
      competencia: dia(e.EntCompetencia),
      prazo: dia(e.EntDtPrazo) ?? '',
      entregueEm: dia(e.EntDtEntrega),
      status: e.Status ?? '',
      multa: e.EntMulta === 'S',
      alteradoEm: e.EntLastDH ?? null,
    })
  }
  return out
}

function solicitacao(x, idsEscritorio) {
  const fin = idOuNull(x.SolUsuarioFinalizadorID)
  return {
    id: String(x.SolID),
    tipo: x.SolTipo ?? '',
    departamento: x.DptoNome ?? null,
    status: x.SolStatus ?? '',
    abertaEm: dia(x.SolDHAbertura) ?? '',
    finalizadaEm: dia(x.SolDHFinalizacao),
    // ⚠️ Quando o CLIENTE encerra pela avaliação, o id é dele (LgeID), de outra
    // tabela — pode até coincidir com o número de alguém do escritório.
    finalizadorId: fin && idsEscritorio.has(fin) && x.SolUsuarioFinalizador ? fin : null,
    responsaveis: (x.SolOfficeRespID ?? []).map(String),
    avaliacao: x.SolAvaliacao || null,
  }
}

// ---- a conta por (pessoa, dia) — a MESMA no --seco e na gravação ----
const ENTREGA_ATRASADA = /atrasad/i
function derivarDaily(procs, ents, sols, pessoaDe) {
  const m = new Map()
  const linha = (acId, day) => {
    const nexusUserId = pessoaDe(acId)
    if (!nexusUserId || !day) return null
    const k = `${nexusUserId}|${day}`
    if (!m.has(k)) m.set(k, { nexusUserId, day, processosIniciados: 0, processosConcluidos: 0, diasConclusao: 0, entregas: 0, entregasAtrasadas: 0, solicitacoesFinalizadas: 0 })
    return m.get(k)
  }
  for (const p of procs) {
    if (p.status === 'Excluído') continue
    const a = linha(p.gestorId, p.inicio); if (a) a.processosIniciados++
    if (p.conclusao) { const b = linha(p.gestorId, p.conclusao); if (b) { b.processosConcluidos++; b.diasConclusao += p.diasCorridos } }
  }
  for (const e of ents) {
    if (!e.entregueEm) continue
    const a = linha(e.respEntregaId, e.entregueEm); if (!a) continue
    a.entregas++
    if (ENTREGA_ATRASADA.test(e.status)) a.entregasAtrasadas++
  }
  for (const s of sols) {
    if (!s.finalizadaEm) continue
    const a = linha(s.finalizadorId, s.finalizadaEm); if (a) a.solicitacoesFinalizadas++
  }
  return [...m.values()]
}

async function main() {
  if (!TOKEN) throw new Error('ACESSORIAS_API_TOKEN ausente no .env')
  const hoje = hojeLocal()

  // O banco abre ANTES da coleta: o incremental precisa saber o maior processo
  // já conhecido e desde quando olhar. No --seco não há banco.
  let prisma = null
  if (!seco) prisma = new (await import('@prisma/client')).PrismaClient()
  const maiorConhecido = prisma
    ? Number((await prisma.$queryRawUnsafe(`select coalesce(max(id::int), 0) as m from acessorias_processo`))[0].m)
    : 0
  const wm = prisma ? await prisma.syncWatermark.findUnique({ where: { source: SOURCE } }) : null

  // 1. usuários
  const usuarios = (await todasPaginas('users/ListAll')).map(usuario)
  const idsEscritorio = new Set(usuarios.map((u) => u.id))

  /* 2. processos. ⚠️⚠️ A LISTAGEM PAGINADA DA API NÃO É CONFIÁVEL: repete itens
     e pula outros (30/09/2026 — 320 linhas, 279 distintas; buscando um por um,
     320 distintos, e cada filtro errava de um jeito diferente). Página que
     cabe inteira (≤ 20) não embaralha, mas o Contábil abre ~150 processos no
     dia 1º, então nem fatiar por dia resolve. O que é determinístico é buscar
     PELO NÚMERO — os ids são sequenciais:
       --completo  varre do 1 até 40 números vazios seguidos depois do último;
       incremental os alterados desde a última passagem (lista curta) + os
                   números NOVOS acima do maior conhecido (pega a leva do dia 1º). */
  const procsPorId = new Map()
  const guarda = (x) => { if (x?.ProcID && x.ProcStatus !== 'Excluído') procsPorId.set(String(x.ProcID), processo(x, hoje)) }
  const varrer = async (de, folga) => {
    for (let id = de, vazios = 0; vazios < folga; id++) {
      const d = await get(`processes/${id}`)
      const x = Array.isArray(d) ? d[0] : d
      if (x?.ProcID) { guarda(x); vazios = 0 } else vazios++
    }
  }
  if (completo || !maiorConhecido) {
    await varrer(1, 40)
  } else {
    const desde = new Date(Math.min(Date.now(), wm ? wm.lastSyncedAt.getTime() : Date.now()) - 3600000)
    const dh = desde.toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' })
    for (const x of await todasPaginas(`processes/ListAll?DtLastDH=${encodeURIComponent(dh)}`)) guarda(x)
    await varrer(maiorConhecido + 1, 15)
  }
  const procs = [...procsPorId.values()]

  // 3. solicitações — poucas (8 em 30/09/2026), cabem numa página e não embaralham.
  // ⚠️ Quando passarem de 20, a paginação instável vale aqui também: vai no log.
  const solsCruas = await todasPaginas('requests/ListAll')

  // 4. entregas — só as feitas (`situation=delivered`); a pendência não é trabalho de ninguém ainda
  const ate = somaDias(hoje, 400)
  const filtroEnt = `DtInitial=${DESDE}&DtFinal=${ate}&situation=delivered&config`
  const ents = []
  let empresasVarridas = null
  if (completo) {
    const empresas = await todasPaginas('companies/ListAll')
    empresasVarridas = empresas.length
    for (const emp of empresas) {
      const cnpj = String(emp.Identificador ?? '').replace(/\D/g, '')
      if (!cnpj) continue
      for (const bloco of await todasPaginas(`deliveries/${cnpj}/?${filtroEnt}`)) ents.push(...entregas(bloco))
    }
  } else {
    const ontem = somaDias(hoje, -1)
    for (const bloco of await todasPaginas(`deliveries/ListAll/?${filtroEnt}&DtLastDH=${ontem}%2000:00:00`)) ents.push(...entregas(bloco))
  }

  /* 5. usuário citado que a lista paginada PULOU (mesma instabilidade dos
     processos) é buscado um por um. Sem isso, o trabalho dele não teria dono. */
  const citados = new Set([...procs.map((p) => p.gestorId), ...ents.flatMap((e) => [e.respEntregaId, e.respPrazoId]),
    ...solsCruas.flatMap((s) => [idOuNull(s.SolUsuarioFinalizadorID), ...(s.SolOfficeRespID ?? []).map(String)])])
  let usuariosResgatados = 0
  for (const id of citados) {
    if (!id || idsEscritorio.has(id)) continue
    const d = await get(`users/${id}`)
    const u = Array.isArray(d) ? d[0] : d
    // ⚠️ O finalizador de solicitação pode ser o CLIENTE (LgeID, outra tabela):
    // só entra se a API de usuários do escritório o reconhecer.
    if (u?.id && String(u.id) === id) { usuarios.push(usuario(u)); idsEscritorio.add(id); usuariosResgatados++ }
  }
  const sols = solsCruas.map((x) => solicitacao(x, idsEscritorio))

  const resumo = {
    usuarios: usuarios.length, usuariosResgatados, processos: procs.length, solicitacoes: sols.length,
    entregas: ents.length, empresasVarridas, chamadas, completo,
    ...(solsCruas.length >= 20 ? { aviso: 'solicitações passaram de 20 — a paginação pode estar pulando itens' } : {}),
  }

  if (seco) {
    // Sem banco: casa por e-mail só para mostrar a conta por pessoa.
    const emailDe = new Map(usuarios.map((u) => [u.id, u.email]))
    const daily = derivarDaily(procs, ents, sols, (id) => (id ? emailDe.get(id) ?? `?${id}` : null))
    const porPessoa = {}
    for (const r of daily) {
      const t = (porPessoa[r.nexusUserId] ??= { iniciados: 0, concluidos: 0, dias: 0, entregas: 0, atrasadas: 0, solicitacoes: 0 })
      t.iniciados += r.processosIniciados; t.concluidos += r.processosConcluidos; t.dias += r.diasConclusao
      t.entregas += r.entregas; t.atrasadas += r.entregasAtrasadas; t.solicitacoes += r.solicitacoesFinalizadas
    }
    // Entregas por dia: é aqui que aparece o MUTIRÃO (baixa em lote de prazo velho).
    const entregasPorDia = {}
    for (const r of daily) if (r.entregas) (entregasPorDia[r.nexusUserId] ??= {})[r.day] = `${r.entregas} (${r.entregasAtrasadas} atras.)`
    console.log(JSON.stringify({ seco: true, ...resumo, linhasDaily: daily.length, porPessoa, entregasPorDia }, null, 2))
    return
  }

  try {
    // Casamento pelo e-mail do diretório. O `users.email` daqui vem do Nexus.
    const dir = await prisma.user.findMany({ where: { nexusUserId: { not: null } }, select: { email: true, nexusUserId: true } })
    const nexusPorEmail = new Map(dir.map((u) => [u.email.trim().toLowerCase(), u.nexusUserId]))
    /* ⚠️ No Acessórias a equipe está cadastrada com DOIS domínios da casa
       (`@grupoitamarathy.com.br` e `@itamarathyclassroom.com.br`, 30/09/2026),
       e o diretório pode ter o outro. Fora do e-mail exato, casa pelo que vem
       antes do @ — só entre domínios DA CASA e só se apontar para UMA pessoa.
       Nunca pelo nome: é como o ponto casou "Wendel" com "Edileuza". */
    const porLocal = new Map()
    for (const u of dir) {
      const [local, dominio] = u.email.trim().toLowerCase().split('@')
      if (!DOMINIOS_DA_CASA.has(dominio)) continue
      porLocal.set(local, porLocal.has(local) && porLocal.get(local) !== u.nexusUserId ? AMBIGUO : u.nexusUserId)
    }
    const casar = (email) => {
      if (nexusPorEmail.has(email)) return nexusPorEmail.get(email)
      const [local, dominio] = email.split('@')
      const alvo = DOMINIOS_DA_CASA.has(dominio) ? porLocal.get(local) : undefined
      return alvo && alvo !== AMBIGUO ? alvo : null
    }
    // Vínculo decidido à mão (`vinculo_manual`) não se reescreve — ver o schema.
    const manuais = new Set((await prisma.acessoriasUsuario.findMany({ where: { vinculoManual: true }, select: { id: true } })).map((u) => u.id))
    for (const u of usuarios) {
      const dados = { email: u.email, nome: u.nome, ativo: u.ativo }
      if (!manuais.has(u.id)) dados.nexusUserId = casar(u.email)
      await prisma.acessoriasUsuario.upsert({ where: { id: u.id }, create: { id: u.id, ...dados }, update: dados })
    }
    const nexusDe = new Map((await prisma.acessoriasUsuario.findMany()).map((u) => [u.id, u.nexusUserId]))

    for (const p of procs) {
      if (!p.inicio) continue
      await prisma.acessoriasProcesso.upsert({ where: { id: p.id }, create: p, update: p })
    }
    for (const s of sols) await prisma.acessoriasSolicitacao.upsert({ where: { id: s.id }, create: s, update: s })
    for (const e of ents) await prisma.acessoriasEntrega.upsert({ where: { id: e.id }, create: e, update: e })

    /* ⚠️⚠️ O que SUMIU da origem sai daqui — processo excluído, entrega
       desfeita. Só nas listas que vieram INTEIRAS (solicitações sempre;
       processos e entregas só no --completo, que varre tudo) e com FREIO:
       resposta com menos da metade do que já temos é defeito LÁ, não faxina. */
    const freios = []
    const podar = async (modelo, nome, vistos) => {
      const temos = await prisma[modelo].count()
      if (vistos.size < temos / 2) { freios.push(`${nome}: origem ${vistos.size} × espelho ${temos} — nada apagado`); return 0 }
      const r = await prisma[modelo].deleteMany({ where: { id: { notIn: [...vistos] } } })
      return r.count
    }
    const podados = {
      processos: completo ? await podar('acessoriasProcesso', 'processos', new Set(procs.filter((p) => p.inicio).map((p) => p.id))) : 0,
      solicitacoes: await podar('acessoriasSolicitacao', 'solicitacoes', new Set(sols.map((s) => s.id))),
      entregas: completo ? await podar('acessoriasEntrega', 'entregas', new Set(ents.map((e) => e.id))) : 0,
    }

    // Remonta o diário INTEIRO a partir do que ficou gravado (não só do que veio agora:
    // no incremental, as entregas antigas continuam valendo).
    const [P, E, S] = await Promise.all([
      prisma.acessoriasProcesso.findMany(), prisma.acessoriasEntrega.findMany(), prisma.acessoriasSolicitacao.findMany(),
    ])
    const daily = derivarDaily(P, E, S, (id) => (id ? nexusDe.get(id) ?? null : null))
    await prisma.$transaction([prisma.acessoriasDaily.deleteMany({}), prisma.acessoriasDaily.createMany({ data: daily })])

    await prisma.syncWatermark.upsert({ where: { source: SOURCE }, create: { source: SOURCE, lastSyncedAt: new Date() }, update: { lastSyncedAt: new Date() } })

    // ⚠️ `semCasamento` no log de propósito: é gente cujo trabalho no Acessórias
    // NÃO aparece no painel. Em silêncio, pareceria que ela não fez nada.
    const semCasamento = usuarios.filter((u) => !nexusDe.get(u.id)).map((u) => u.email)
    console.log(JSON.stringify({ ...resumo, linhasDaily: daily.length, podados, freios, semCasamento, em: new Date().toISOString() }))
  } finally {
    await prisma.$disconnect()
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
