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
 * que 87 pessoas entrarem e virem os próprios números, tirar o acesso de volta
 * não desfaz o que foi visto.
 *
 * ✅ As duas dívidas que a bloqueavam foram fechadas em 03/09/2026: o dataset do
 * cliente deixou de levar o histórico disciplinar da empresa (`lib/data/source.ts`)
 * e as 11 rotas agregadas passaram a ser recortadas por setor (`lib/alcance.ts`).
 *
 * ⚠️ O que falta agora não é código: é o caminho do gestor ter sido percorrido
 * por uma pessoa de verdade. Para isso existe a lista de ensaio abaixo.
 *
 * Ligar com `TALENTCARE_ACESSO_ABERTO=on` no `.env` e um novo sync de diretório.
 */
const ACESSO_ABERTO = process.env.TALENTCARE_ACESSO_ABERTO === 'on'

/**
 * ⚠️ A LISTA DE ENSAIO: e-mails que entram como se a chave estivesse ligada,
 * enquanto ela está desligada para todos os outros.
 *
 * Existe porque a única forma honesta de conferir o caminho do gestor é uma
 * PESSOA DE VERDADE entrando com a senha dela e olhando. Simular com a conta da
 * Diretoria não prova nada — é justamente a régua que se quer testar. E ligar a
 * chave geral para conferir uma coisa poria 87 pessoas dentro, o que não se
 * desfaz.
 *
 * ⚠️ É nominal e revogável: tirar o e-mail daqui e rodar o sync devolve a pessoa
 * a `SEM_PERMISSAO`. Nada aqui sobrevive por esquecimento — o sync recalcula
 * `GESTOR`/`COLABORADOR` a cada rodada.
 */
const ACESSO_TESTE = (process.env.TALENTCARE_ACESSO_TESTE ?? '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

/** Cargos do Nexus que abrem o painel do próprio setor. */
const CARGOS_GESTAO = ['gestor', 'sub-encarregado']

/**
 * Setor "Diretoria" ou email na allowlist → ADMIN. Depois disso, depende da
 * chave acima.
 *
 * ⚠️⚠️ `temVinculo` NÃO é opcional na prática, e foi o defeito descoberto em
 * 02/09/2026, na primeira vez que alguém usou a tela de verdade: a Rosemeire
 * (Cozinha) foi nomeada avaliadora da Limpeza e da Cozinha, e o cargo dela é
 * `Colaborador`. Sem esta linha, no dia em que o acesso abrisse ela seria
 * barrada da própria fila que administra — a porta diria "colaborador" enquanto
 * o vínculo dizia "avaliadora".
 *
 * A lição: quem MANDA é o vínculo. O cargo é só o atalho para quem não tem
 * vínculo nenhum. Quem avalia alguém alcança a fila, seja qual for o cargo.
 */
export function mapRole(
  email: string | null,
  setor: string | null,
  cargo?: string | null,
  temVinculo = false,
): UserRole {
  if (email && ADMIN_EMAILS.includes(email.toLowerCase())) return 'ADMIN'
  if (norm(setor).includes('diretoria')) return 'ADMIN'
  const emEnsaio = !!email && ACESSO_TESTE.includes(email.toLowerCase())
  if (!ACESSO_ABERTO && !emEnsaio) return 'SEM_PERMISSAO'
  // ⚠️ O cargo decide só a PORTA (que telas), nunca o conteúdo. Quem avalia quem
  // continua vindo de `setor_avaliador`, confirmado por gente — ver
  // `lib/avaliacoes/regua.ts`. Um Gestor sem vínculo entra no painel do setor e
  // não avalia ninguém, e é isso mesmo.
  if (temVinculo) return 'GESTOR'
  if (CARGOS_GESTAO.includes(norm(cargo))) return 'GESTOR'
  return 'COLABORADOR'
}

/**
 * Recalcula e grava a classe de acesso de UMA pessoa.
 *
 * ⚠️ Existe porque o vínculo muda pela tela e o sync de diretório roda quando
 * roda (hoje, no .78, só a mão). Sem isto, nomear alguém avaliador só teria
 * efeito na porta depois do próximo sync — e a pessoa bateria num 403 sem
 * ninguém entender por quê.
 *
 * ⚠️ Os DOIS caminhos (aqui e o sync) usam `mapRole`, a mesma função. Dois
 * escritores da mesma coisa só é seguro quando os dois derivam do mesmo lugar.
 */
export async function recalcularAcesso(userId: string): Promise<UserRole | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, jobTitle: true, role: true, department: { select: { name: true } } },
  })
  if (!u) return null
  const temVinculo = (await prisma.setorAvaliador.count({ where: { userId } })) > 0
  const computed = mapRole(u.email, u.department?.name ?? null, u.jobTitle, temVinculo)
  const finalRole = resolveRole(computed, u.role)
  if (finalRole !== u.role) {
    await prisma.user.update({ where: { id: userId }, data: { role: finalRole } })
  }
  return finalRole
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
  // Quem é avaliador de algum setor. Carregado UMA vez: entra na classe de
  // acesso de cada pessoa (ver `mapRole`), e consultar por linha custaria uma
  // ida ao banco por funcionário.
  const vinculados = new Set(
    (await prisma.setorAvaliador.findMany({ select: { userId: true } })).map((v) => v.userId),
  )

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

      // ⚠️ O vínculo entra na conta: quem avalia alguém alcança a fila, seja
      // qual for o cargo dele no Nexus (ver `mapRole`).
      const temVinculo = local ? vinculados.has(local.id) : false
      const computed = mapRole(nu.email, nu.department, nu.role, temVinculo)
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
            // Reapareceu no diretório → deixa de estar fora dele. É a VOLTA que
            // faz a marca ser confiável; sem ela, quem voltasse ficaria fora da
            // avaliação para sempre.
            foraDoDiretorio: false,
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
    await prisma.user.update({
      where: { id: o.id },
      // ⚠️ `foraDoDiretorio` é o que separa "sumiu do diretório" de "foi
      // desligado". O `leftAt` carimbado aqui é o instante em que percebemos a
      // ausência, e não uma data de saída de verdade — sem a marca, a fila de
      // avaliação lê essa data inventada como "estava ativa no mês".
      data: { active: false, leftAt: o.leftAt ?? new Date(), foraDoDiretorio: true },
    })
    result.deactivated++
  }

  return result
}
