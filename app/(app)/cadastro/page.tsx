import { prisma } from '@/lib/db/prisma'
import EducationLinker from '../escolaridade/EducationLinker'

export const dynamic = 'force-dynamic'

export default async function CadastroPage() {
  const [staging, emps] = await Promise.all([
    prisma.personalStaging.findMany({ orderBy: [{ nome: 'asc' }] }),
    prisma.user.findMany({
      where: { origin: 'nexus' },
      select: { nexusUserId: true, name: true, department: { select: { name: true } } },
      orderBy: { name: 'asc' },
    }),
  ])

  const options = emps
    .filter((e) => e.nexusUserId)
    .map((e) => ({ id: e.nexusUserId as string, label: e.name + (e.department?.name ? ` · ${e.department.name}` : '') }))
  const nameById = Object.fromEntries(options.map((o) => [o.id, o.label]))

  const rows = staging.map((s) => ({
    id: s.id, nome: s.nome,
    level: s.birthRaw ? `Nasc. ${s.birthRaw}` : null,
    detail: [s.admRaw ? `Admissão ${s.admRaw}` : null, s.sexo, s.situacao].filter(Boolean).join(' · ') || null,
    confidence: s.confidence, status: s.status,
    suggestionNexusId: s.suggestionNexusId, matchedNexusId: s.matchedNexusId,
  }))

  return <EducationLinker rows={rows} options={options} nameById={nameById} endpoint="/api/admin/personal-link" kicker="Importação · cadastro (RH)" title="Cadastro — vínculo (admissão & nascimento)" />
}
