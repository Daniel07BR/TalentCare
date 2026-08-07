// Importa o dump do sistema de ponto "Nexo" (axis_db, MySQL) → espelho de
// ASSIDUIDADE (atrasos) + eventos de DISCIPLINA (advertências) no TalentCare.
//
// NÃO é pull S2S (não há sistema vivo): é import idempotente de ARQUIVO, no mesmo
// espírito de run-education-import.mjs / run-personal-import.mjs. Re-rodar dá o
// mesmo resultado (as tabelas-espelho são 100% deste dump → wipe + rebuild).
//
// O dump tem só ATRASO e ADVERTÊNCIA (sem falta, sem suspensão, sem CPF). Casamento
// de pessoa = por NOME normalizado, usando o roster de usuários do Nexo (tabela
// `users`) e o DEPARTAMENTO como desempatador. Atrasos ABONADOS (nexo_abonos) não
// punem a assiduidade — entram separados.
//
// Uso: node --env-file=.env run-ponto-import.mjs [<dir-com-os-.sql>]
//   default: /home/suporte/ponto-dump/extracted
import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'
import path from 'node:path'

const prisma = new PrismaClient()
const DIR = process.argv[2] || '/home/suporte/ponto-dump/extracted'

/* ---------- nomes (mesma normalização da escolaridade/cadastro) ---------- */
const norm = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
const STOP = new Set(['de', 'da', 'do', 'dos', 'das', 'e'])
const toks = (s) => norm(s).split(' ').filter((t) => t && !STOP.has(t))
// depto: normaliza e tira pontuação ("T.i" -> "ti", "Imóveis" -> "imoveis")
const normDept = (s) => norm(s).replace(/[^a-z0-9]/g, '')

/* ---------- parser de INSERT do mysqldump ---------- */
// Devolve uma lista de linhas (cada linha = array de campos string|null).
function parseInserts(sql, table) {
  const rows = []
  const marker = 'INSERT INTO `' + table + '` VALUES '
  let pos = 0
  while ((pos = sql.indexOf(marker, pos)) !== -1) {
    let i = pos + marker.length
    // varre tuplas (..),(..),..; até o ';' que fecha o statement
    let field = ''
    let row = null
    let inQ = false
    let started = false
    for (; i < sql.length; i++) {
      const c = sql[i]
      if (inQ) {
        if (c === '\\') { field += sql[i + 1] ?? ''; i++ }
        else if (c === "'") inQ = false
        else field += c
      } else if (c === "'") { inQ = true }
      else if (c === '(') { row = []; field = ''; started = true }
      else if (c === ',' && row) { pushField(row, field); field = '' }
      else if (c === ')' && row) { pushField(row, field); rows.push(row); row = null; field = '' }
      else if (c === ';' && started && !row) { break }
      else if (row) { field += c }
    }
    pos = i + 1
  }
  return rows
}
// distingue NULL (sem aspas) de string vazia ''. Como já consumimos aspas no scan,
// reconstruímos: campo cru "NULL" => null; senão a string (sem aspas) literal.
function pushField(row, raw) {
  const t = raw.trim()
  row.push(t === 'NULL' ? null : raw)
}

// Reparse correto de aspas: o scanner acima já remove aspas e processa escapes,
// mas perde a diferença entre 'NULL' (string) e NULL (token). Para os nossos
// campos isso não importa (datas/ids/nomes), e tratamos null por ausência.

/* ---------- minutos de atraso ---------- */
function toMin(t) {
  if (!t) return null
  const m = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(t.trim())
  if (!m) return null
  return (+m[1]) * 60 + (+m[2])
}
function atrasoMin(horario, prev) {
  const a = toMin(horario), b = toMin(prev)
  if (a == null || b == null || b === 0) return 0 // sem previsto → não dá p/ medir
  const d = a - b
  if (d <= 0) return 0
  return Math.min(d, 1440) // clamp (ruído de turno invertido)
}

/* ---------- match nome → pessoa do TalentCare ---------- */
function classify(rt, et) {
  const se = new Set(et)
  let inter = 0
  for (const t of rt) if (se.has(t)) inter++
  const exact = rt.join(' ') === et.join(' ')
  const first = rt[0] && et[0] && rt[0] === et[0]
  const last = rt.length && et.length && rt[rt.length - 1] === et[et.length - 1]
  return { exact, first, last, inter }
}

async function main() {
  const read = (f) => fs.readFileSync(path.join(DIR, f), 'utf8')
  const sqlAtraso = read('axis_db_nexo_atraso.sql')
  const sqlAdv = read('axis_db_nexo_advertencia.sql')
  const sqlAbono = read('axis_db_nexo_abonos.sql')
  const sqlUsers = read('axis_db_users.sql')

  // Roster do Nexo: id -> { nome, email, depto }
  const usersRows = parseInserts(sqlUsers, 'users')
  const roster = new Map()
  for (const r of usersRows) {
    const id = r[0]?.trim()
    if (!id) continue
    roster.set(id, { nome: r[1] ?? '', email: r[2] ?? '', depto: r[4] ?? '' })
  }

  // Ocorrências
  const atrasos = parseInserts(sqlAtraso, 'nexo_atraso').map((r) => ({
    id: r[0]?.trim(), day: (r[1] ?? '').trim(), userId: (r[3] ?? '').trim(),
    nome: r[4] ?? '', horario: r[5], prev: r[6],
  })).filter((a) => a.day && a.userId)
  const adverts = parseInserts(sqlAdv, 'nexo_advertencia').map((r) => ({
    id: r[0]?.trim(), day: (r[1] ?? '').trim(), userId: (r[3] ?? '').trim(),
    nome: r[4] ?? '', motivo: (r[5] ?? '').trim() || null,
  })).filter((a) => a.day && a.userId)
  // Atrasos abonados: conjunto de atraso_id
  const abonadoIds = new Set(parseInserts(sqlAbono, 'nexo_abonos').map((r) => r[1]?.trim()).filter(Boolean))

  // Pessoas do TalentCare (Nexus + STAFF). personKey = nexus_user_id ?? id.
  const people = (await prisma.user.findMany({
    where: { origin: { in: ['nexus', 'staff'] } },
    include: { department: { select: { name: true } } },
  })).map((u) => ({
    personKey: u.nexusUserId ?? u.id,
    name: u.name,
    toks: toks(u.name),
    dept: normDept(u.department?.name ?? ''),
  }))

  // Casa cada usuário do Nexo (que tem ocorrência) a uma pessoa.
  const occByNexo = new Map() // nexoId -> { atrasos, advert }
  for (const a of atrasos) {
    const o = occByNexo.get(a.userId) || { atrasos: 0, advert: 0 }
    o.atrasos++; occByNexo.set(a.userId, o)
  }
  for (const a of adverts) {
    const o = occByNexo.get(a.userId) || { atrasos: 0, advert: 0 }
    o.advert++; occByNexo.set(a.userId, o)
  }

  // Ocorrências CRUAS por nexoId (p/ guardar nas não-casadas → vínculo manual em /ponto).
  const occByNexoId = new Map()
  const occGet = (id) => { let o = occByNexoId.get(id); if (!o) { o = { atrasos: [], adverts: [] }; occByNexoId.set(id, o) } return o }
  for (const a of atrasos) occGet(a.userId).atrasos.push({ day: a.day, minutos: abonadoIds.has(a.id) ? 0 : atrasoMin(a.horario, a.prev), abonado: abonadoIds.has(a.id) })
  for (const a of adverts) occGet(a.userId).adverts.push({ sourceId: a.id, day: a.day, motivo: a.motivo })

  // Vínculos MANUAIS (tela /ponto) têm prioridade — sobrevivem a re-cargas.
  const overrides = new Map((await prisma.pontoMatch.findMany()).map((m) => [m.nexoUserId, m.personKey]))

  const matchOf = new Map() // nexoId -> { personKey, confidence }
  const stagingRows = []
  for (const [nexoId, counts] of occByNexo) {
    // Override manual: atribui direto, sem heurística.
    if (overrides.has(nexoId)) {
      const i0 = roster.get(nexoId) || { nome: '', depto: '', email: '' }
      matchOf.set(nexoId, { personKey: overrides.get(nexoId), confidence: 'manual' })
      stagingRows.push({
        nexoUserId: nexoId, nome: i0.nome || '', norm: norm(i0.nome || ''), depto: i0.depto || null, email: i0.email || null,
        atrasos: counts.atrasos, advertencias: counts.advert,
        suggestionPersonKey: overrides.get(nexoId), confidence: 'manual',
        matchedPersonKey: overrides.get(nexoId), status: 'applied', occ: null,
      })
      continue
    }
    const info = roster.get(nexoId) || { nome: '', depto: '' }
    const nome = info.nome || ''
    const rt = toks(nome)
    const nd = normDept(info.depto)
    let best = null, bestKey = [-1]
    for (const p of people) {
      const c = classify(rt, p.toks)
      const deptMatch = nd && p.dept && (nd === p.dept || nd.startsWith(p.dept) || p.dept.startsWith(nd)) ? 1 : 0
      const key = [c.exact ? 1 : 0, c.first && c.last ? 1 : 0, c.inter, deptMatch, c.first ? 1 : 0, c.last ? 1 : 0]
      if (cmp(key, bestKey) > 0) { bestKey = key; best = { p, c, deptMatch } }
    }
    let confidence = 'none'
    if (best) {
      const { exact, first, last, inter } = best.c
      const dm = best.deptMatch
      if (exact || (first && inter >= 2) || inter >= 3 || (dm && first && inter >= 1) || (dm && last && inter >= 2)) confidence = 'strong'
      else if ((first || last) && inter >= 1) confidence = 'review'
    }
    const matched = confidence === 'strong' ? best.p.personKey : null
    if (matched) matchOf.set(nexoId, { personKey: matched, confidence })
    stagingRows.push({
      nexoUserId: nexoId, nome, norm: norm(nome), depto: info.depto || null, email: info.email || null,
      atrasos: counts.atrasos, advertencias: counts.advert,
      suggestionPersonKey: best ? best.p.personKey : null, confidence,
      matchedPersonKey: matched, status: matched ? 'applied' : 'pending',
      // guarda as ocorrências cruas só das NÃO casadas (p/ aplicar o vínculo manual sem o dump).
      occ: matched ? null : (occByNexoId.get(nexoId) ?? { atrasos: [], adverts: [] }),
    })
  }

  // Agrega atrasos por (personKey, day): conta abonados à parte e soma minutos.
  const daily = new Map() // `${pk} ${day}` -> { atrasos, abon, minutos }
  for (const a of atrasos) {
    const mt = matchOf.get(a.userId)
    if (!mt) continue
    const k = mt.personKey + ' ' + a.day
    const d = daily.get(k) || { atrasos: 0, abon: 0, minutos: 0 }
    if (abonadoIds.has(a.id)) d.abon++
    else { d.atrasos++; d.minutos += atrasoMin(a.horario, a.prev) }
    daily.set(k, d)
  }

  // Eventos de disciplina (advertências) das pessoas casadas.
  const eventos = []
  for (const a of adverts) {
    const mt = matchOf.get(a.userId)
    if (!mt) continue
    eventos.push({ personKey: mt.personKey, source: 'nexo', sourceId: a.id, data: a.day, tipo: 'advertencia', motivo: a.motivo, dias: null })
  }

  /* ---------- TRAVA ANTI-PERDA (antes de qualquer delete) ----------
     Este import é wipe+rebuild: ele APAGA assiduidade_daily e as advertências
     do Nexo e regrava a partir do dump. Se o dump não estiver no lugar (o
     caminho padrão aponta para o .75, não para o .78) ou vier parcial, o wipe
     destrói histórico que NÃO existe em nenhuma outra fonte — o dump original
     é apagado depois da carga por conter PII.
     Regra: nunca encolher sozinho. Só passa se o que vai gravar for pelo menos
     90% do que já existe, ou se vier `--forcar` explícito. */
  const forcar = process.argv.includes('--forcar')
  const jaTem = await prisma.assiduidadeDaily.count()
  const vaiGravar = daily.size
  if (!forcar && jaTem > 0 && vaiGravar < jaTem * 0.9) {
    console.error(JSON.stringify({
      erro: 'import_encolheria_o_historico',
      jaTem, vaiGravar, dir: DIR,
      dica: 'O dump em ' + DIR + ' cobre menos que o banco. Confira se o dump está completo e no lugar certo. Para sobrescrever mesmo assim: --forcar',
    }, null, 1))
    process.exit(1)
  }

  /* ---------- grava (wipe + rebuild = idempotente) ---------- */
  await prisma.$transaction([
    prisma.assiduidadeDaily.deleteMany({}),
    prisma.disciplinaEvento.deleteMany({ where: { source: 'nexo' } }),
    prisma.pontoStaging.deleteMany({}),
  ])

  let dailyN = 0
  for (const [k, d] of daily) {
    const [personKey, day] = k.split(' ')
    await prisma.assiduidadeDaily.create({
      data: { personKey, day, atrasos: d.atrasos, atrasosAbon: d.abon, minutosAtraso: d.minutos },
    })
    dailyN++
  }
  if (eventos.length) await prisma.disciplinaEvento.createMany({ data: eventos })
  if (stagingRows.length) await prisma.pontoStaging.createMany({ data: stagingRows })

  const matchedPeople = new Set([...matchOf.values()].map((m) => m.personKey)).size
  const review = stagingRows.filter((s) => s.confidence === 'review')
  const none = stagingRows.filter((s) => s.confidence === 'none')
  console.log(JSON.stringify({
    atrasosLidos: atrasos.length, advertLidas: adverts.length, abonados: abonadoIds.size,
    rosterNexo: roster.size, usuariosComOcorrencia: occByNexo.size,
    pessoasCasadas: matchedPeople, dailyLinhas: dailyN, eventos: eventos.length,
    revisar: review.length, semPalpite: none.length,
  }, null, 2))
  if (review.length) console.log('REVISAR:', review.map((r) => `${r.nome} [${r.depto}]`).join(' | '))
  if (none.length) console.log('SEM PALPITE:', none.map((r) => `${r.nome} [${r.depto}]`).join(' | '))
}

function cmp(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? -1, y = b[i] ?? -1
    if (x !== y) return x < y ? -1 : 1
  }
  return 0
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
