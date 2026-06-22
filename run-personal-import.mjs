// Importa cadastro (admissão/nascimento) de um JSON já extraído do xls → staging
// + aplica os casados com confiança. Uso: node --env-file=.env run-personal-import.mjs emp.json
import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'

const prisma = new PrismaClient()
const FILE = process.argv[2]

const norm = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
const STOP = new Set(['de', 'da', 'do', 'dos', 'das', 'e'])
const toks = (s) => norm(s).split(' ').filter((t) => t && !STOP.has(t))
const parseBR = (s) => { const m = (s || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null }

function classify(rt, et) {
  const se = new Set(et); let inter = 0
  for (const t of new Set(rt)) if (se.has(t)) inter++
  return { exact: rt.join(' ') === et.join(' '), first: rt[0] && et[0] && rt[0] === et[0], last: rt.length && et.length && rt[rt.length - 1] === et[et.length - 1], inter }
}

async function main() {
  const recs = JSON.parse(fs.readFileSync(FILE, 'utf8'))
  const emps = (await prisma.user.findMany({ where: { origin: 'nexus' }, select: { nexusUserId: true, name: true, entryDate: true } }))
    .filter((e) => e.nexusUserId).map((e) => ({ id: e.nexusUserId, name: e.name, entryDate: e.entryDate, toks: toks(e.name) }))

  await prisma.personalStaging.deleteMany({})
  let strong = 0, review = 0, none = 0
  for (const r of recs) {
    const rt = toks(r.nome)
    let best = null, bk = [-1]
    for (const e of emps) {
      const c = classify(rt, e.toks)
      const key = [c.exact ? 1 : 0, c.first && c.last ? 1 : 0, c.inter, c.first ? 1 : 0, c.last ? 1 : 0]
      if (key > bk) { bk = key; best = { e, c } }
    }
    let confidence = 'none'
    if (best) {
      const { exact, first, last, inter } = best.c
      if (exact || (first && inter >= 2) || inter >= 3) confidence = 'strong'
      else if ((first || last) && inter >= 1) confidence = 'review'
    }
    const matched = confidence === 'strong' ? best.e.id : null
    await prisma.personalStaging.create({
      data: { nome: r.nome, norm: norm(r.nome), birthRaw: r.nasc || null, admRaw: r.adm || null, sexo: r.sexo || null, situacao: r.sit || null, suggestionNexusId: confidence === 'none' ? null : best.e.id, confidence, matchedNexusId: matched, status: matched ? 'applied' : 'pending' },
    })
    if (confidence === 'strong') {
      strong++
      const birth = parseBR(r.nasc), adm = parseBR(r.adm)
      await prisma.user.update({ where: { nexusUserId: matched }, data: { birthDate: birth ?? undefined, entryDate: best.e.entryDate ? undefined : adm ?? undefined } })
    } else if (confidence === 'review') review++
    else none++
  }
  console.log(JSON.stringify({ total: recs.length, strong, review, none }))
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
