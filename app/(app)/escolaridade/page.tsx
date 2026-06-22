import { prisma } from '@/lib/db/prisma'
import EducationLinker from './EducationLinker'
import EducationManual, { type ManualPerson } from './EducationManual'

export const dynamic = 'force-dynamic'

export default async function EscolaridadePage() {
  const [staging, emps, edu] = await Promise.all([
    prisma.educationStaging.findMany({ orderBy: [{ nome: 'asc' }] }),
    prisma.user.findMany({
      where: { origin: 'nexus' },
      select: { nexusUserId: true, name: true, active: true, domainAccount: true, windowsUser: true, department: { select: { name: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.employeeEducation.findMany({ select: { nexusUserId: true, level: true, detail: true } }),
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

  const eduMap = new Map(edu.map((e) => [e.nexusUserId, e]))
  const people: ManualPerson[] = emps
    .filter((e) => e.nexusUserId && e.active)
    .map((e) => {
      const cur = eduMap.get(e.nexusUserId as string)
      return {
        id: e.nexusUserId as string, name: e.name,
        username: e.domainAccount ?? e.windowsUser ?? null,
        dept: e.department?.name ?? '—',
        level: cur?.level ?? '', detail: cur?.detail ?? '',
      }
    })

  return (
    <>
      <EducationLinker rows={rows} options={options} nameById={nameById} />
      <EducationManual people={people} />
    </>
  )
}
