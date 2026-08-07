// Backup do banco do Painel de Atendimento (.70).
//
// O painel.db é a ORIGEM da cadeia do WhatsApp que alimenta o TalentCare, e não
// tinha backup nenhum. Ele guarda coisa que o OneCode já não devolve: a varredura
// de 2026-08-07 achou 5 tickets que existem só aqui (a origem os apagou).
//
// SQLite não se copia com `cp` com segurança enquanto há escrita (WAL). `VACUUM
// INTO` produz um snapshot consistente sem parar o serviço, e não precisa do
// binário sqlite3 (que não está instalado nesta VM).
import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'
import path from 'node:path'

const DIR = '/var/www/painel-atendimento/backups'
const KEEP = 14
const prisma = new PrismaClient()

const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
const destino = path.join(DIR, `painel-${stamp}.db`)
fs.mkdirSync(DIR, { recursive: true })

try {
  await prisma.$executeRawUnsafe(`VACUUM INTO '${destino}'`)
  const tam = fs.statSync(destino).size
  if (tam < 1_000_000) throw new Error(`snapshot pequeno demais: ${tam} bytes`)

  // Confere que o snapshot abre e tem os tickets — arquivo ilegível no lugar de
  // backup bom é pior que nenhum.
  const chk = new PrismaClient({ datasources: { db: { url: `file:${destino}` } } })
  const [{ n }] = await chk.$queryRawUnsafe('SELECT COUNT(*) AS n FROM oc_tickets')
  await chk.$disconnect()
  const tickets = Number(n)
  if (tickets < 1000) throw new Error(`snapshot com só ${tickets} tickets`)

  for (const f of fs.readdirSync(DIR)) {
    if (!f.startsWith('painel-') || !f.endsWith('.db')) continue
    const p = path.join(DIR, f)
    const dias = (Date.now() - fs.statSync(p).mtimeMs) / 864e5
    if (dias > KEEP) fs.unlinkSync(p)
  }
  console.log(JSON.stringify({ ok: true, arquivo: path.basename(destino), mb: +(tam / 1048576).toFixed(1), tickets }))
} catch (e) {
  fs.rmSync(destino, { force: true })
  console.error(JSON.stringify({ ok: false, erro: String(e.message) }))
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
