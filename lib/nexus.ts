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

// "Dono" do sistema = e-mail na allowlist manual (quem administra/constrói o
// TalentCare), distinto da Diretoria que ganha ADMIN só pelo setor. Usado p/
// liberar a área de administração no menu.
export function isOwnerEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase())
}

/**
 * ⚠️⚠️ A CHAVE QUE ABRE O SISTEMA PARA A EMPRESA INTEIRA.
 *
 * Desligada = só a Diretoria e a allowlist entram, e os outros 86 continuam
 * `SEM_PERMISSAO` (existem na lista, não acessam) — que é o comportamento de
 * sempre. Ligada = Gestor e Sub-encarregado viram `GESTOR` e todo o resto vira
 * `COLABORADOR`, com acesso à própria página de desempenho.
 *
 * Fica atrás de uma chave porque abrir é irreversível na prática: no instante em
 * que 88 pessoas entrarem e virem os próprios números, tirar o acesso de volta
 * não desfaz o que foi visto. E porque falta uma coisa antes (ver o README da
 * área): as rotas de dado agregado — `/api/chat-metrics`, `/api/helpdesk-metrics`
 * e as outras seis — hoje devolvem a EMPRESA INTEIRA para qualquer sessão
 * autenticada. Enquanto isso não for recortado por setor, um Gestor consegue
 * puxar o painel dos outros setores pela URL.
 *
 * Ligar com `TALENTCARE_ACESSO_ABERTO=on` no `.env` e um novo sync de diretório.
 */
const ACESSO_ABERTO = process.env.TALENTCARE_ACESSO_ABERTO === 'on'

/** Cargos do Nexus que abrem o painel do próprio setor. */
const CARGOS_GESTAO = ['gestor', 'sub-encarregado']

// Setor "Diretoria" ou email na allowlist → ADMIN. Depois disso, depende da
// chave acima.
export function mapRole(email: string | null, setor: string | null, cargo?: string | null): UserRole {
  if (email && ADMIN_EMAILS.includes(email.toLowerCase())) return 'ADMIN'
  if (norm(setor).includes('diretoria')) return 'ADMIN'
  if (!ACESSO_ABERTO) return 'SEM_PERMISSAO'
  // ⚠️ O cargo decide só a PORTA (que telas), nunca o conteúdo. Quem avalia quem
  // continua vindo de `setor_avaliador`, confirmado por gente — ver
  // `lib/avaliacoes/regua.ts`. Um Gestor sem vínculo entra no painel do setor e
  // não avalia ninguém, e é isso mesmo.
  if (CARGOS_GESTAO.includes(norm(cargo))) return 'GESTOR'
  return 'COLABORADOR'
}

// Preserva elevação manual: nunca rebaixa um ADMIN no sync.
//
// ⚠️ Só o ADMIN é preservado. GESTOR e COLABORADOR são recalculados a cada sync
// de propósito: eles vêm do cargo, e cargo muda no Nexus. Preservar os três
// deixaria alguém que saiu da chefia com a porta do setor aberta para sempre —
// e ninguém iria conferir.
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
  // Data de saída/desligamento definida no Nexus (fonte real de turnover). null se
  // ainda ativo ou se foi inativado sem data. Espelhada em User.leftAt.
  terminationDate: string | null
  educationItems?: { tipo: string; curso: string; cursando: boolean }[] | null
  educationLevel?: string | null
  educationDetail?: string | null
  updatedAt: string | null
  // Foto (data URI webp base64) quando pedida com ?includeAvatar=true; null se sem foto.
  avatar: string | null
  // Hash bcrypt da senha Nexus (?includePassword=true). O Nexus é dono da senha;
  // espelhamos aqui para o login local funcionar mesmo com o Nexus offline.
  // null = funcionário ainda sem senha definida no Nexus.
  passwordHash: string | null
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

  const res = await fetch(`${NEXUS_BASE_URL}/api/integrations/employees?includePassword=true&includeAvatar=true`, {
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

      const computed = mapRole(nu.email, nu.department, nu.role)
      const isActive = nu.status === 'active'
      const dept = await resolveDepartment(nu.department, nu.departmentId)

      if (local) {
        const finalRole = resolveRole(computed, local.role)
        // Data de saída (turnover): a data REAL definida no Nexus tem prioridade.
        // Sem ela, mantém o comportamento antigo: carimba na transição ativo→inativo
        // e faz backfill dos já inativos via updatedAt. Limpa se voltou a ativo.
        const nexusLeft = nu.terminationDate ? new Date(nu.terminationDate) : null
        let leftAt = local.leftAt
        if (!isActive) {
          if (nexusLeft) leftAt = nexusLeft
          else if (local.active) leftAt = new Date()
          else if (!local.leftAt) leftAt = nu.updatedAt ? new Date(nu.updatedAt) : new Date()
        } else {
          leftAt = null
        }
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
            leftAt,
            role: finalRole,
            jobTitle: nu.role ?? undefined,
            avatarUrl: nu.avatar ?? undefined,
            departmentId: dept?.id ?? undefined,
            // Admissão: NÃO sobrescreve valor já existente (correção manual / planilha RH
            // prevalece; o hireDate do Nexus é pouco confiável). Só preenche se vazio.
            entryDate: local.entryDate ?? (nu.hireDate ? new Date(nu.hireDate) : undefined),
            // Espelha a senha do Nexus quando definida (só atualiza se veio hash).
            passwordHash: nu.passwordHash ?? undefined,
          },
        })
        result.updated++
      } else {
        // Sem hash do Nexus ainda → placeholder aleatório inutilizável (coluna NOT NULL).
        const randomPw = nu.passwordHash ?? (await bcrypt.hash(crypto.randomUUID(), 10))
        await prisma.user.create({
          data: {
            name: nu.name,
            email: nu.email,
            passwordHash: randomPw,
            role: computed,
            jobTitle: nu.role ?? null,
            avatarUrl: nu.avatar ?? null,
            active: isActive,
            leftAt: isActive
              ? null
              : (nu.terminationDate ? new Date(nu.terminationDate) : (nu.updatedAt ? new Date(nu.updatedAt) : new Date())),
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
      // FORMAÇÃO: o Nexus virou a fonte (é o diretório de pessoas) e os 75
      // registros curados aqui foram migrados para lá antes desta troca.
      // ⚠️ Só sobrescreve quando o Nexus TEM formação: sem isso, uma pessoa
      // ainda não preenchida lá apagaria o que existe aqui — e escolaridade é
      // dado que ninguém reconstrói da origem.
      if (Array.isArray(nu.educationItems) && nu.educationItems.length) {
        await prisma.employeeEducation.upsert({
          where: { nexusUserId: nu.id },
          create: {
            nexusUserId: nu.id,
            level: nu.educationLevel ?? null,
            detail: nu.educationDetail ?? null,
            // `raw.items` é o que o editor local relê (loadItems) — grava no
            // mesmo formato para a tela continuar abrindo os níveis certos.
            raw: { items: nu.educationItems },
            source: 'nexus',
          },
          update: {
            level: nu.educationLevel ?? null,
            detail: nu.educationDetail ?? null,
            raw: { items: nu.educationItems },
            source: 'nexus',
          },
        })
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
    await prisma.user.update({ where: { id: o.id }, data: { active: false, leftAt: o.leftAt ?? new Date() } })
    result.deactivated++
  }

  return result
}
