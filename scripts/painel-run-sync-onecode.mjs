// ETL OneCode → SQLite, INCREMENTAL (CLI/cron).
//   node --env-file=.env run-sync-onecode.mjs          → incremental (do cursor pra frente)
//   node --env-file=.env run-sync-onecode.mjs --full   → reconciliação completa
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = process.env.ONECODE_BASE_URL ?? 'https://api-grupoitamarathy.onecode.chat'
const KEY = process.env.ONECODE_API_KEY ?? ''
const PAGE = 1000
const FULL = process.argv.includes('--full')

async function ocFetch(path, timeoutMs = 20000) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${KEY}` },
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`OneCode ${res.status} ${path}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}
const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o }

async function getAllPaged(path, key, pageSize) {
  const out = []; let page = 1
  for (;;) {
    const sep = path.includes('?') ? '&' : '?'
    const d = await ocFetch(`${path}${sep}page=${page}&pageSize=${pageSize}`)
    const items = d[key] ?? []; out.push(...items)
    const lastPage = Number(d.lastPage ?? d.pageCount ?? 1)
    if (page >= lastPage || items.length === 0) break
    page++
  }
  return out
}

function mapRow(t) {
  const created = new Date(t.createdAt), updated = new Date(t.updatedAt)
  const handleSeconds = t.status === 'closed' ? Math.max(0, Math.round((updated.getTime() - created.getTime()) / 1000)) : null
  return {
    id: t.id, status: t.status, createdAt: created, updatedAt: updated,
    userId: t.userId ?? null, queueId: t.queueId ?? null, connectionId: t.whatsappId ?? null,
    contactId: t.contactId ?? null, isGroup: !!t.isGroup, handleSeconds,
  }
}

async function syncCatalogs() {
  const queues = await getAllPaged('/api/queues', 'queues', 100)
  await prisma.$transaction([
    prisma.ocQueue.deleteMany({}),
    prisma.ocQueue.createMany({ data: queues.map((q) => ({ id: q.id, name: q.name, color: q.color ?? null })) }),
  ])
  const users = await getAllPaged('/api/users', 'users', 200)
  await prisma.$transaction([
    prisma.ocUser.deleteMany({}),
    prisma.ocUser.createMany({ data: users.map((u) => ({ id: u.id, name: u.name, email: u.email ?? null, profile: u.profile ?? null, enabled: u.enabled ?? true, status: u.status ?? null })) }),
  ])
  const contacts = await getAllPaged('/api/contacts', 'contacts', 500)
  await prisma.$transaction([
    prisma.ocContact.deleteMany({}),
    ...chunk(contacts, 500).map((part) => prisma.ocContact.createMany({ data: part.map((c) => ({ id: c.id, name: c.name, number: c.number ?? null, email: c.email ?? null, isGroup: !!c.isGroup })) })),
  ])
  return { queues: queues.length, users: users.length, contacts: contacts.length }
}

// Reconciliação COMPLETA e NÃO DESTRUTIVA (o que roda no domingo).
//
// A versão anterior fazia `deleteMany({})` e SÓ ENTÃO repovoava, em ~206 idas à
// rede ao longo de ~3 minutos, fora de transação. Duas formas de perder tudo:
//   1. qualquer falha de rede no meio deixava a tabela truncada até o domingo
//      seguinte — e o delete já estava commitado;
//   2. a API pagina por OFFSET sobre uma lista ORDENADA POR ID DESC e VIVA: um
//      ticket novo empurra as linhas para offsets maiores e a mesma linha volta
//      numa página seguinte. `createMany` sem skipDuplicates estoura no id
//      repetido, matando o processo com a tabela pela metade.
// Ela só sobrevivia porque roda 04:30 de domingo, quando quase nada é criado —
// segurança por sorte de horário, não por desenho.
//
// Aqui não existe delete. Converge por id: cria o que falta, atualiza o que
// mudou, ignora o resto. Uma falha no meio deixa o espelho MAIS completo, nunca
// menos. Duplicata de paginação é esperada e descartada em memória.
async function fullReconcile() {
  const locais = await prisma.ocTicket.findMany({ select: { id: true, updatedAt: true } })
  const localUpd = new Map(locais.map((t) => [t.id, +t.updatedAt]))

  let page = 1, lastPage = 1, lidos = 0, atualizados = 0, maxId = 0
  const vistos = new Set()
  const paraCriar = []

  do {
    const d = await ocFetch(`/api/tickets?page=${page}&pageSize=${PAGE}`)
    lastPage = Number(d.lastPage ?? 1)
    const tickets = d.tickets ?? []
    if (!tickets.length) break
    for (const t of tickets) {
      if (vistos.has(t.id)) continue // mesma linha em duas páginas (offset deslocou)
      vistos.add(t.id)
      const row = mapRow(t)
      maxId = Math.max(maxId, row.id)
      const antes = localUpd.get(row.id)
      if (antes === undefined) paraCriar.push(row)
      else if (antes !== +row.updatedAt) {
        await prisma.ocTicket.update({ where: { id: row.id }, data: row })
        atualizados++
      }
    }
    lidos += tickets.length
    page++
  } while (page <= lastPage)

  for (const part of chunk(paraCriar, 500)) await prisma.ocTicket.createMany({ data: part })

  // Linhas que existem aqui e não vieram da API. NÃO são apagadas: este espelho
  // alimenta relatório histórico e, para vários dias, já é o melhor registro que
  // existe (o TalentCare tem números MAIORES que a origem devolve hoje). Some
  // do relatório o que a origem perdeu, e ninguém consegue reconstruir. Reporta.
  const soLocal = [...localUpd.keys()].filter((id) => !vistos.has(id))
  return { total: vistos.size, maxId, lidos, novos: paraCriar.length, atualizados, soLocal: soLocal.length }
}

// A ordem de /api/tickets já mudou uma vez sem aviso (era id crescente, hoje vem
// decrescente) e a varredura antiga, presa numa das duas, passou dias devolvendo
// "0 novos" sem erro nenhum. Por isso agora a ordem é DETECTADA a cada execução.
async function detectOrder() {
  const d = await ocFetch(`/api/tickets?page=1&pageSize=2`)
  const ids = (d.tickets ?? []).map((t) => t.id)
  const desc = ids.length < 2 ? true : ids[0] > ids[1]
  return { desc, count: Number(d.count ?? 0) }
}

async function incrementalTail(lastId) {
  const { desc, count } = await detectOrder()
  const lastPage = Math.max(1, Math.ceil(count / PAGE))
  // desc: os mais novos estão na página 1 → varre pra frente.
  // asc:  os mais novos estão na última página → varre pra trás.
  const pages = desc
    ? Array.from({ length: lastPage }, (_, i) => i + 1)
    : Array.from({ length: lastPage }, (_, i) => lastPage - i)

  let added = 0, maxId = lastId
  for (const p of pages) {
    const d = await ocFetch(`/api/tickets?page=${p}&pageSize=${PAGE}`)
    const tickets = d.tickets ?? []
    if (!tickets.length) break
    const fresh = tickets.filter((t) => t.id > lastId)
    for (const t of fresh) {
      const row = mapRow(t)
      await prisma.ocTicket.upsert({ where: { id: row.id }, create: row, update: row })
      added++; maxId = Math.max(maxId, t.id)
    }
    // Página com algum id já conhecido = alcançamos o que já temos.
    if (fresh.length < tickets.length) break
  }
  return { added, maxId, apiCount: count, order: desc ? 'desc' : 'asc' }
}

async function refreshActive() {
  const active = await prisma.ocTicket.findMany({ where: { status: { in: ['open', 'pending'] } }, select: { id: true } })
  let refreshed = 0
  for (const { id } of active) {
    try {
      const t = await ocFetch(`/api/tickets/${id}`, 12000)
      const row = mapRow(t)
      await prisma.ocTicket.upsert({ where: { id: row.id }, create: row, update: row })
      refreshed++
    } catch {}
  }
  return refreshed
}

async function main() {
  const t0 = Date.now()
  const cat = await syncCatalogs()
  const s = await prisma.syncState.findUnique({ where: { key: 'onecode' } })
  let cursor = 0
  try { cursor = JSON.parse(s?.value ?? '{}').lastTicketId ?? 0 } catch {}
  const firstRun = !cursor

  let mode, newTickets = 0, refreshedActive = 0, lastTicketId = cursor
  let apiCount = null, order = null, reconc = null
  if (FULL || firstRun) {
    mode = 'full'
    const r = await fullReconcile()
    newTickets = r.novos; lastTicketId = r.maxId
    reconc = { lidos: r.lidos, unicos: r.total, atualizados: r.atualizados, soLocal: r.soLocal }
  } else {
    mode = 'incremental'
    const tail = await incrementalTail(cursor); newTickets = tail.added; lastTicketId = tail.maxId
    apiCount = tail.apiCount; order = tail.order
    refreshedActive = await refreshActive()
  }

  const totalTickets = await prisma.ocTicket.count()
  const lastSyncAt = new Date().toISOString()
  const durationMs = Date.now() - t0
  // gap = quanto a origem tem a mais que o espelho. Diferente de zero por várias
  // execuções seguidas = a varredura parou de achar o que existe (foi assim que
  // passamos dias parados sem ninguém notar).
  const gap = apiCount == null ? null : apiCount - totalTickets
  const value = JSON.stringify({ mode, lastTicketId, lastSyncAt, tickets: totalTickets, newTickets, refreshedActive, apiCount, gap, order, reconc, durationMs, ...cat })
  await prisma.syncState.upsert({ where: { key: 'onecode' }, create: { key: 'onecode', value }, update: { value } })
  console.log(JSON.stringify({ mode, newTickets, refreshedActive, totalTickets, apiCount, gap, order, ...(reconc ?? {}), ...cat, durationMs }))
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
