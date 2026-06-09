import { prisma } from '@/lib/db/prisma'
import type { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// Integração de DIRETÓRIO Nexus → TalentCare.
// Modelo (igual ao HelpDesk): PRESENÇA = todos (fonte /api/integrations/employees);
// ACESSO = decidido pelo CARGO/SETOR aqui no TalentCare. Por ora só Diretoria e a
// allowlist (TALENTCARE_ADMIN_EMAILS) viram ADMIN; o resto fica SEM_PERMISSAO.

const NEXUS_BASE_URL = process.env.NEXUS_BASE_URL!
const NEXUS_API_KEY = process.env.NEXUS_API_KEY!

const ADMIN_EMAILS = (process.env.TALENTCARE_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export const norm = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// Setor "Diretoria" ou email na allowlist → ADMIN. Caso contrário, SEM_PERMISSAO
// (a pessoa existe no sistema p/ aparecer na lista, mas não acessa).
export function mapRole(email: string | null, setor: string | null): UserRole {
  if (email && ADMIN_EMAILS.includes(email.toLowerCase())) return 'ADMIN'
  if (norm(setor).includes('diretoria')) return 'ADMIN'
  return 'SEM_PERMISSAO'
}

// Preserva elevação manual: nunca rebaixa um ADMIN para SEM_PERMISSAO no sync.
export function resolveRole(computed: UserRole, current: UserRole): UserRole {
  if (current === 'ADMIN') return 'ADMIN'
  return computed
}

interface NexusEmployee {
  id: string
  username: string | null
  name: string
  email: string
  phone: string | null
  role: string | null
  department: string | null
  departmentId: string | null
  status: string
  hireDate: string | null
}

export interface SyncResult {
  created: number
  updated: number
  deactivated: number
  errors: string[]
}

async function resolveDepartment(name: string | null, nexusId: string | null) {
  if (!name && !nexusId) return null
  if (nexusId) {
    const byId = await prisma.department.findFirst({ where: { nexusDepartmentId: nexusId } })
    if (byId) return byId
  }
  if (name) {
    const byName = await prisma.department.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    })
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

export async function syncFromNexus(): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, deactivated: 0, errors: [] }

  const res = await fetch(`${NEXUS_BASE_URL}/api/integrations/employees`, {
    headers: { 'X-API-Key': NEXUS_API_KEY },
  })
  if (!res.ok) {
    result.errors.push(`Nexus API ${res.status}: ${await res.text()}`)
    return result
  }

  const employees: NexusEmployee[] = await res.json()
  const nexusIds = new Set(employees.map((e) => e.id))

  for (const nu of employees) {
    try {
      let local = await prisma.user.findUnique({ where: { nexusUserId: nu.id } })
      if (!local && nu.username) {
        local = await prisma.user.findFirst({
          where: {
            OR: [
              { domainAccount: { equals: nu.username, mode: 'insensitive' } },
              { windowsUser: { equals: nu.username, mode: 'insensitive' } },
            ],
          },
        })
      }
      if (!local && nu.email) {
        local = await prisma.user.findFirst({
          where: { email: { equals: nu.email, mode: 'insensitive' } },
        })
      }

      const computed = mapRole(nu.email, nu.department)
      const isActive = nu.status === 'active'
      const dept = await resolveDepartment(nu.department, nu.departmentId)

      if (local) {
        const finalRole = resolveRole(computed, local.role)
        await prisma.user.update({
          where: { id: local.id },
          data: {
            nexusUserId: nu.id,
            origin: 'nexus',
            name: nu.name,
            email: nu.email,
            domainAccount: nu.username,
            windowsUser: nu.username,
            phone: nu.phone ?? undefined,
            active: isActive,
            role: finalRole,
            departmentId: dept?.id ?? undefined,
            entryDate: nu.hireDate ? new Date(nu.hireDate) : undefined,
          },
        })
        result.updated++
      } else {
        const randomPw = await bcrypt.hash(crypto.randomUUID(), 10)
        await prisma.user.create({
          data: {
            name: nu.name,
            email: nu.email,
            passwordHash: randomPw,
            role: computed,
            active: isActive,
            nexusUserId: nu.id,
            origin: 'nexus',
            domainAccount: nu.username ?? null,
            windowsUser: nu.username ?? null,
            phone: nu.phone ?? null,
            departmentId: dept?.id ?? null,
            entryDate: nu.hireDate ? new Date(nu.hireDate) : null,
          },
        })
        result.created++
      }
    } catch (err) {
      result.errors.push(`${nu.name} (${nu.id}): ${(err as Error).message}`)
    }
  }

  // Quem é nexus-origin e sumiu do diretório → inativa (não deleta).
  const orphans = await prisma.user.findMany({
    where: { nexusUserId: { not: null }, origin: 'nexus', active: true, NOT: { nexusUserId: { in: [...nexusIds] } } },
  })
  for (const o of orphans) {
    await prisma.user.update({ where: { id: o.id }, data: { active: false } })
    result.deactivated++
  }

  return result
}
