import { prisma } from '@/lib/db/prisma'
import EducationLinker from './EducationLinker'

export const dynamic = 'force-dynamic'

export default async function EscolaridadePage() {
  const [staging, emps] = await Promise.all([
    prisma.educationStaging.findMany({ orderBy: [{ nome: 'asc' }] }),
    prisma.user.findMany({
      where: { origin: 'nexus' },
      select: { nexusUserId: true, name: true, jobTitle: true, department: { select: { name: true } } },
      orderBy: { name: 'asc' },
    }),
  ])

  const options = emps
    .filter((e) => e.nexusUserId)
    .map((e) => ({ id: e.nexusUserId as string, label: e.name + (e.department?.name ? ` · ${e.department.name}` : '') }))
  const nameById = Object.fromEntries(options.map((o) => [o.id, o.label]))

  const rows = staging.map((s) => ({
    id: s.id, nome: s.nome, level: s.level, detail: s.detail, sexo: s.sexo,
    confidence: s.confidence, status: s.status,
    suggestionNexusId: s.suggestionNexusId, matchedNexusId: s.matchedNexusId,
  }))

  return <EducationLinker rows={rows} options={options} nameById={nameById} />
}
