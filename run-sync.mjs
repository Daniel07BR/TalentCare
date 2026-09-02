// Sync de diretório Nexus → TalentCare (CLI). Rode: node --env-file=.env run-sync.mjs
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()
const NEXUS_BASE_URL = process.env.NEXUS_BASE_URL
const NEXUS_API_KEY = process.env.NEXUS_API_KEY
const ADMIN_EMAILS = (process.env.TALENTCARE_ADMIN_EMAILS ?? '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

const norm = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/**
 * ⚠️⚠️ ESTA FUNÇÃO É CÓPIA DE `lib/nexus.ts`. Mexeu lá, mexa aqui.
 *
 * A cópia existe porque o CLI roda com `node --env-file` puro, sem o bundler do
 * Next, e não consegue importar do `lib/` (TypeScript, alias `@/`). Duas cópias
 * da mesma régua é exatamente o defeito que a auditoria do Nexus custou caro —
 * então elas ficam idênticas, e este aviso existe para isso.
 *
 * Em 02/09/2026 as duas JÁ tinham divergido: `lib/nexus.ts` ganhou GESTOR e
 * COLABORADOR e esta aqui continuava só com ADMIN/SEM_PERMISSAO. Com o acesso
 * aberto, quem rodasse por último venceria — e o cron roda por último sempre.
 */
const ACESSO_ABERTO = process.env.TALENTCARE_ACESSO_ABERTO === 'on'
const CARGOS_GESTAO = ['gestor', 'sub-encarregado']
const mapRole = (email, setor, cargo, temVinculo = false) => {
  if (email && ADMIN_EMAILS.includes(email.toLowerCase())) return 'ADMIN'
  if (norm(setor).includes('diretoria')) return 'ADMIN'
  if (!ACESSO_ABERTO) return 'SEM_PERMISSAO'
  // O VÍNCULO ganha do cargo: quem avalia alguém alcança a fila.
  if (temVinculo) return 'GESTOR'
  if (CARGOS_GESTAO.includes(norm(cargo))) return 'GESTOR'
  return 'COLABORADOR'
}
const resolveRole = (computed, current) => (current === 'ADMIN' ? 'ADMIN' : computed)

async function resolveDepartment(name, nexusId) {
  if (!name && !nexusId) return null
  if (nexusId) {
    const byId = await prisma.department.findFirst({ where: { nexusDepartmentId: nexusId } })
    if (byId) return byId
  }
  if (name) {
    const byName = await prisma.department.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })
    if (byName) {
      if (nexusId && !byName.nexusDepartmentId) {
        await prisma.department.update({ where: { id: byName.id }, data: { nexusDepartmentId: nexusId } })
      }
      return byName
    }
    return prisma.department.create({ data: { name, nexusDepartmentId: nexusId } })
  }
  return null
}

async function main() {
  const res = await fetch(`${NEXUS_BASE_URL}/api/integrations/employees?includePassword=true&includeAvatar=true`, { headers: { 'X-API-Key': NEXUS_API_KEY } })
  if (!res.ok) throw new Error(`Nexus ${res.status}: ${await res.text()}`)
  const employees = await res.json()
  const nexusIds = new Set(employees.map((e) => e.id))
  // Quem é avaliador de algum setor — entra na classe de acesso (ver mapRole).
  const vinculados = new Set(
    (await prisma.setorAvaliador.findMany({ select: { userId: true } })).map((v) => v.userId),
  )
  let created = 0, updated = 0, deactivated = 0, admins = 0

  for (const nu of employees) {
    let local = await prisma.user.findUnique({ where: { nexusUserId: nu.id } })
    if (!local && nu.username) {
      local = await prisma.user.findFirst({
        where: { OR: [
          { domainAccount: { equals: nu.username, mode: 'insensitive' } },
          { windowsUser: { equals: nu.username, mode: 'insensitive' } },
        ] },
      })
    }
    if (!local && nu.email) {
      local = await prisma.user.findFirst({ where: { email: { equals: nu.email, mode: 'insensitive' } } })
    }
    const computed = mapRole(nu.email, nu.department, nu.role, local ? vinculados.has(local.id) : false)
    if (computed === 'ADMIN') admins++
    const isActive = nu.status === 'active'
    const dept = await resolveDepartment(nu.department, nu.departmentId)

    if (local) {
      const finalRole = resolveRole(computed, local.role)
      // Data de saída real do Nexus (terminationDate) tem prioridade; sem ela,
      // mantém a inferência antiga (carimba na transição / backfill por updatedAt).
      const nexusLeft = nu.terminationDate ? new Date(nu.terminationDate) : null
      let leftAt = local.leftAt
      if (!isActive) {
        if (nexusLeft) leftAt = nexusLeft
        else if (local.active) leftAt = new Date()
        else if (!local.leftAt) leftAt = nu.updatedAt ? new Date(nu.updatedAt) : new Date()
      } else { leftAt = null }
      await prisma.user.update({ where: { id: local.id }, data: {
        nexusUserId: nu.id, origin: 'nexus', name: nu.name, email: nu.email,
        domainAccount: nu.username, windowsUser: nu.username,
        phone: nu.phone ?? undefined, active: isActive, role: finalRole, leftAt,
        jobTitle: nu.role ?? undefined, avatarUrl: nu.avatar ?? undefined,
        departmentId: dept?.id ?? undefined,
        // Admissão não sobrescreve correção local (planilha RH > hireDate do Nexus).
        entryDate: local.entryDate ?? (nu.hireDate ? new Date(nu.hireDate) : undefined),
        passwordHash: nu.passwordHash ?? undefined,
      } })
      updated++
    } else {
      const pw = nu.passwordHash ?? (await bcrypt.hash(crypto.randomUUID(), 10))
      await prisma.user.create({ data: {
        name: nu.name, email: nu.email, passwordHash: pw, role: computed, active: isActive,
        leftAt: isActive ? null : (nu.terminationDate ? new Date(nu.terminationDate) : (nu.updatedAt ? new Date(nu.updatedAt) : new Date())),
        jobTitle: nu.role ?? null, avatarUrl: nu.avatar ?? null,
        nexusUserId: nu.id, origin: 'nexus', domainAccount: nu.username ?? null,
        windowsUser: nu.username ?? null, phone: nu.phone ?? null, departmentId: dept?.id ?? null,
        entryDate: nu.hireDate ? new Date(nu.hireDate) : null,
      } })
      created++
    }

    // FORMAÇÃO: o Nexus é a fonte. ⚠️ Só sobrescreve quando ele TEM a lista —
    // sem isso, pessoa ainda não preenchida lá apagaria o que existe aqui.
    // Mantido em sincronia com lib/nexus.ts: este CLI duplica a lógica de lá.
    if (Array.isArray(nu.educationItems) && nu.educationItems.length) {
      await prisma.employeeEducation.upsert({
        where: { nexusUserId: nu.id },
        create: {
          nexusUserId: nu.id, level: nu.educationLevel ?? null, detail: nu.educationDetail ?? null,
          raw: { items: nu.educationItems }, source: 'nexus',
        },
        update: {
          level: nu.educationLevel ?? null, detail: nu.educationDetail ?? null,
          raw: { items: nu.educationItems }, source: 'nexus',
        },
      })
    }
  }

  /**
   * ⚠️⚠️ FREIO NA INATIVAÇÃO EM MASSA.
   *
   * Este bloco desliga quem sumiu do diretório. Se o Nexus devolver 200 com uma
   * lista curta — um deploy pela metade, um filtro novo, um erro de paginação —
   * ele desligaria a empresa inteira, e o log diria "sucesso". Foi assim que a
   * lógica de órfão do ClassRoom desativou 8 pessoas ativas de verdade.
   *
   * O freio: se a resposta cobre menos de 80% de quem já está ativo aqui, NÃO
   * inativa ninguém e grita no log. Perder um desligamento por uma hora é
   * barato; desligar 120 pessoas do painel de RH não é.
   *
   * ⚠️ O corte é sobre o TAMANHO da resposta, não sobre quantos seriam
   * desligados: uma demissão em massa real (que existe) tem de passar, e uma
   * resposta truncada tem de parar — e só o tamanho da origem distingue as duas.
   */
  const ativosAqui = await prisma.user.count({
    where: { nexusUserId: { not: null }, origin: 'nexus', active: true },
  })
  const cobertura = ativosAqui > 0 ? employees.length / ativosAqui : 1
  if (cobertura < 0.8) {
    console.error(JSON.stringify({
      alerta: 'resposta_curta_demais_nao_inativei',
      recebidos: employees.length, ativosAqui, cobertura: Number(cobertura.toFixed(2)),
    }))
    // O `.finally` do rodapé desconecta; sair daqui é só não inativar ninguém.
    console.log(JSON.stringify({ total: employees.length, created, updated, deactivated: 0, admins, freio: true }))
    return
  }

  const orphans = await prisma.user.findMany({
    where: { nexusUserId: { not: null }, origin: 'nexus', active: true, NOT: { nexusUserId: { in: [...nexusIds] } } },
  })
  for (const o of orphans) {
    await prisma.user.update({ where: { id: o.id }, data: { active: false, leftAt: o.leftAt ?? new Date() } })
    deactivated++
  }

  console.log(JSON.stringify({ total: employees.length, created, updated, deactivated, admins }))
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
