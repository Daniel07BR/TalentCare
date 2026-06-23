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
const mapRole = (email, setor) => {
  if (email && ADMIN_EMAILS.includes(email.toLowerCase())) return 'ADMIN'
  if (norm(setor).includes('diretoria')) return 'ADMIN'
  return 'SEM_PERMISSAO'
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
    const computed = mapRole(nu.email, nu.department)
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
        entryDate: nu.hireDate ? new Date(nu.hireDate) : undefined,
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
