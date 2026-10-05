// A FICHA DE RH vem do FLUXO (.70) desde 05/10/2026 — admissão, nascimento, sexo e escolaridade.
// Rode: node --env-file=.env run-ficha-sync.mjs [--ensaio]
//
// ⚠️⚠️ Decisão do Daniel: o Nexus é IDENTIDADE (usuário do servidor, setor, liberação, foto) e o
// Fluxo do DP é a FONTE da ficha de RH. O DP preenche lá (Administração de Funcionários do
// Grupo); aqui só se LÊ — os editores de datas e de formação da ficha ficaram somente-leitura.
// Roda logo DEPOIS do `run-sync.mjs` (diretório, :45) no cron.
//
// ⚠️⚠️ Vazio NÃO apaga: só grava o campo que a ficha do Fluxo TEM. A planilha do DP (nascimento)
// não roda de novo — um `null` aqui apagaria o que ninguém reconstrói.
// ⚠️ O CARGO não vem daqui (ainda): `cargoOficial` segue editado no TalentCare até o Daniel decidir
// entre ele e o cargo do vínculo do Fluxo (45 divergiam em 05/10/2026).
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = process.env.FLUXO_BASE_URL
const KEY = process.env.FLUXO_API_KEY
const ENSAIO = process.argv.includes('--ensaio')

/** 'M'|'F' do Fluxo → o texto deste banco (o mesmo `mapSexo` do sync do Nexus). */
const SEXO = { M: 'Masculino', F: 'Feminino' }
const dia = (d) => (d ? new Date(`${d}T12:00:00Z`) : undefined)
const igualDia = (a, b) => (!a && !b) || (a && b && a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10))

async function main() {
  if (!BASE || !KEY) throw new Error('FLUXO_BASE_URL/FLUXO_API_KEY ausentes no .env')
  const res = await fetch(`${BASE}/api/integrations/talent-fichas`, { headers: { 'X-API-Key': KEY } })
  if (!res.ok) throw new Error(`Fluxo ${res.status}: ${await res.text()}`)
  const { fichas = [] } = await res.json()

  const conta = { fichas: fichas.length, semPessoa: 0, admissao: 0, nascimento: 0, sexo: 0, escolaridade: 0 }
  for (const f of fichas) {
    const u = await prisma.user.findFirst({ where: { nexusUserId: f.nexusUserId }, select: { id: true, entryDate: true, birthDate: true, gender: true } })
    if (!u) { conta.semPessoa++; continue }
    const dados = {}
    if (f.admissao && !igualDia(u.entryDate, dia(f.admissao))) { dados.entryDate = dia(f.admissao); conta.admissao++ }
    if (f.nascimento && !igualDia(u.birthDate, dia(f.nascimento))) { dados.birthDate = dia(f.nascimento); conta.nascimento++ }
    if (f.sexo && SEXO[f.sexo] && u.gender !== SEXO[f.sexo]) { dados.gender = SEXO[f.sexo]; conta.sexo++ }
    if (!ENSAIO && Object.keys(dados).length) await prisma.user.update({ where: { id: u.id }, data: dados })

    const e = f.escolaridade
    if (e && Array.isArray(e.itens) && e.itens.length) {
      const atual = await prisma.employeeEducation.findUnique({ where: { nexusUserId: f.nexusUserId } })
      const mudou = !atual || atual.level !== (e.nivel ?? null) || atual.detail !== (e.detalhe ?? null)
        || JSON.stringify(atual.raw?.items ?? []) !== JSON.stringify(e.itens)
      if (mudou) {
        conta.escolaridade++
        // `raw.items` é o que a ficha relê — o mesmo formato do Nexus e do Fluxo
        const linha = { level: e.nivel ?? null, detail: e.detalhe ?? null, raw: { items: e.itens }, source: 'fluxo' }
        if (!ENSAIO) {
          await prisma.employeeEducation.upsert({
            where: { nexusUserId: f.nexusUserId },
            create: { nexusUserId: f.nexusUserId, ...linha },
            update: linha,
          })
        }
      }
    }
  }
  console.log(new Date().toISOString(), ENSAIO ? '[ENSAIO]' : '', JSON.stringify(conta))
}

main()
  .catch((err) => { console.error(new Date().toISOString(), 'falhou:', err.message); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
