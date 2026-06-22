import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { mapRole, resolveRole } from '@/lib/nexus'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const NEXUS_BASE_URL = process.env.NEXUS_BASE_URL!
const NEXUS_API_KEY = process.env.NEXUS_API_KEY!
const APP_URL = process.env.APP_URL!

export async function GET(req: NextRequest) {
  const ticket = req.nextUrl.searchParams.get('nexus_ticket')
  if (!ticket) return NextResponse.redirect(new URL('/login', APP_URL))

  try {
    const res = await fetch(`${NEXUS_BASE_URL}/api/integrations/sso/resolve`, {
      method: 'POST',
      headers: { 'X-API-Key': NEXUS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket }),
    })
    if (!res.ok) return NextResponse.redirect(new URL('/login?error=nexus_error', APP_URL))

    const data = await res.json()
    if (!data.authenticated) {
      return NextResponse.redirect(new URL('/login?error=session_expired', APP_URL))
    }

    // Acesso decidido pelo CARGO/SETOR aqui (não pela permissão do Nexus): o resolve
    // devolve a identidade mesmo com authorized:false. Quem não for ADMIN vira
    // SEM_PERMISSAO e é barrado abaixo.
    const nx = data.user
    const nexusUserId = nx.id

    let local = await prisma.user.findUnique({ where: { nexusUserId } })
    if (!local && nx.username) {
      local = await prisma.user.findFirst({
        where: {
          OR: [
            { domainAccount: { equals: nx.username, mode: 'insensitive' } },
            { windowsUser: { equals: nx.username, mode: 'insensitive' } },
          ],
        },
      })
    }

    // Departamento
    let dept = nx.departmentId
      ? await prisma.department.findFirst({ where: { nexusDepartmentId: nx.departmentId } })
      : null
    if (!dept && nx.department) {
      dept = await prisma.department.findFirst({ where: { name: { equals: nx.department, mode: 'insensitive' } } })
      if (dept && nx.departmentId && !dept.nexusDepartmentId) {
        await prisma.department.update({ where: { id: dept.id }, data: { nexusDepartmentId: nx.departmentId } })
      }
    }
    if (!dept && nx.department) {
      dept = await prisma.department.create({ data: { name: nx.department, nexusDepartmentId: nx.departmentId ?? null } })
    }

    const computed = mapRole(nx.email, nx.department)

    if (local) {
      const finalRole = resolveRole(computed, local.role)
      await prisma.user.update({
        where: { id: local.id },
        data: {
          nexusUserId,
          origin: 'nexus',
          name: nx.name,
          email: nx.email,
          active: true,
          role: finalRole,
          jobTitle: nx.role ?? undefined,
          avatarUrl: nx.avatar ?? undefined,
          domainAccount: nx.username ?? undefined,
          windowsUser: nx.username ?? undefined,
          phone: nx.phone ?? undefined,
          departmentId: dept?.id ?? undefined,
          // Espelha a senha do Nexus (login local offline); só se veio hash.
          passwordHash: nx.passwordHash ?? undefined,
        },
      })
    } else {
      const randomPw = nx.passwordHash ?? (await bcrypt.hash(crypto.randomUUID(), 10))
      local = await prisma.user.create({
        data: {
          name: nx.name,
          email: nx.email,
          passwordHash: randomPw,
          role: computed,
          jobTitle: nx.role ?? null,
          avatarUrl: nx.avatar ?? null,
          active: true,
          nexusUserId,
          origin: 'nexus',
          domainAccount: nx.username ?? null,
          windowsUser: nx.username ?? null,
          phone: nx.phone ?? null,
          departmentId: dept?.id ?? null,
        },
      })
    }

    const fresh = await prisma.user.findUnique({ where: { id: local.id } })
    if (!fresh || fresh.role === 'SEM_PERMISSAO') {
      return NextResponse.redirect(new URL('/acesso-negado', APP_URL))
    }

    // HMAC handoff → /login auto-submit
    const ts = Date.now().toString()
    const sig = crypto.createHmac('sha256', process.env.AUTH_SECRET!).update(`${fresh.id}:${ts}`).digest('hex')
    const loginUrl = new URL('/login', APP_URL)
    loginUrl.searchParams.set('sso_uid', fresh.id)
    loginUrl.searchParams.set('sso_ts', ts)
    loginUrl.searchParams.set('sso_sig', sig)
    loginUrl.searchParams.set('callbackUrl', '/dashboard')
    return NextResponse.redirect(loginUrl)
  } catch (err) {
    console.error('[SSO] erro:', err)
    return NextResponse.redirect(new URL('/login?error=nexus_error', APP_URL))
  }
}
