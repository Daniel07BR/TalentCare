// Importa a planilha de escolaridade → staging + aplica os casados com confiança.
// Uso: node --env-file=.env run-education-import.mjs "<arquivo.csv>"
import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'

const prisma = new PrismaClient()
const FILE = process.argv[2]

const norm = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
const STOP = new Set(['de', 'da', 'do', 'dos', 'das', 'e'])
const toks = (s) => norm(s).split(' ').filter((t) => t && !STOP.has(t))

function parseCsv(text) {
  const rows = []
  let field = '', row = [], inQ = false
  text = text.replace(/^﻿/, '')
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') inQ = false
      else field += c
    } else if (c === '"') inQ = true
    else if (c === ';') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c === '\r') { /* skip */ }
    else field += c
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
}

function deriveLevel(niveis, r) {
  const s = norm(niveis)
  const has = (k) => (r[k] ?? '').trim()
  if (has('Doutorado (curso)') || s.includes('doutorado')) return 'Doutorado'
  if (has('Mestrado (curso)') || s.includes('mestrado')) return 'Mestrado'
  if (has('MBA (curso)') || /\bmba\b/.test(s)) return 'MBA'
  if (has('Pós-graduação (curso)') || s.includes('pos') || s.includes('pós')) return 'Pós-graduação'
  if (s.includes('graduacao') && s.includes('completa') && !s.includes('incompleta')) return 'Superior Completo'
  if (s.includes('cursando')) return 'Superior (cursando)'
  if (s.includes('incompleta')) return 'Superior Incompleto'
  if (has('Médio técnico (curso)') || s.includes('tecnico')) return 'Médio Técnico'
  if (s.includes('medio completo')) return 'Ensino Médio'
  if (s.includes('fundamental')) return 'Ensino Fundamental'
  return null
}

function detailOf(r) {
  const p = []
  const g = (r['Graduação curso'] ?? '').trim()
  const anos = (r['Anos p/ concluir'] ?? '').trim()
  if (g) p.push(`Graduação: ${g}${anos ? ` (${anos} anos p/ concluir)` : ''}`)
  for (const [k, label] of [['Extensão (curso)', 'Extensão'], ['Pós-graduação (curso)', 'Pós'], ['MBA (curso)', 'MBA'], ['Mestrado (curso)', 'Mestrado'], ['Doutorado (curso)', 'Doutorado'], ['Médio técnico (curso)', 'Médio técnico']]) {
    const v = (r[k] ?? '').trim()
    if (v) p.push(`${label}: ${v}`)
  }
  return p.join(' · ')
}

function classify(rt, et) {
  const sr = new Set(rt), se = new Set(et)
  let inter = 0
  for (const t of sr) if (se.has(t)) inter++
  const exact = rt.join(' ') === et.join(' ')
  const first = rt[0] && et[0] && rt[0] === et[0]
  const last = rt.length && et.length && rt[rt.length - 1] === et[et.length - 1]
  return { exact, first, last, inter }
}

async function main() {
  const rows = parseCsv(fs.readFileSync(FILE, 'utf8'))
  const header = rows[0].map((h) => h.trim())
  const recs = rows.slice(1).filter((r) => r.length > 1 && r[header.indexOf('Nome')]?.trim()).map((r) => {
    const o = {}
    header.forEach((h, i) => (o[h] = r[i] ?? ''))
    return o
  })

  const emps = (await prisma.user.findMany({ where: { origin: 'nexus' }, select: { nexusUserId: true, name: true } }))
    .filter((e) => e.nexusUserId)
    .map((e) => ({ id: e.nexusUserId, name: e.name, toks: toks(e.name) }))

  await prisma.educationStaging.deleteMany({})
  let strong = 0, review = 0, none = 0, applied = 0
  for (const r of recs) {
    const nome = r['Nome'].trim()
    const niveis = r['Escolaridade (níveis)'] ?? ''
    const level = deriveLevel(niveis, r)
    if (!level) continue // sem escolaridade → não importa
    const rt = toks(nome)
    let best = null, bestKey = [-1]
    for (const e of emps) {
      const c = classify(rt, e.toks)
      const key = [c.exact ? 1 : 0, c.first && c.last ? 1 : 0, c.inter, c.first ? 1 : 0, c.last ? 1 : 0]
      if (key > bestKey) { bestKey = key; best = { e, c } }
    }
    let confidence = 'none'
    if (best) {
      const { exact, first, inter } = best.c
      if (exact || (first && inter >= 2) || inter >= 3) confidence = 'strong'
      else if ((best.c.first || best.c.last) && inter >= 1) confidence = 'review'
    }
    const raw = { niveis, sexo: r['Sexo'] ?? '', obs: r['Observações'] ?? '', respondido: r['Respondido'] ?? '', detalhe: detailOf(r) }
    const suggestion = confidence === 'none' ? null : best.e.id
    const matched = confidence === 'strong' ? best.e.id : null
    await prisma.educationStaging.create({
      data: { nome, norm: norm(nome), level, sexo: r['Sexo'] ?? null, detail: detailOf(r) || null, raw, suggestionNexusId: suggestion, confidence, matchedNexusId: matched, status: matched ? 'applied' : 'pending' },
    })
    if (confidence === 'strong') {
      strong++
      await prisma.employeeEducation.upsert({
        where: { nexusUserId: matched },
        create: { nexusUserId: matched, level, sexo: r['Sexo'] ?? null, detail: detailOf(r) || null, raw },
        update: { level, sexo: r['Sexo'] ?? null, detail: detailOf(r) || null, raw },
      })
      applied++
    } else if (confidence === 'review') review++
    else none++
  }
  console.log(JSON.stringify({ total: recs.length, comEscolaridade: strong + review + none, strong, review, none, applied }))
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
