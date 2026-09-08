import { prisma } from '@/lib/db/prisma'
import { isHiddenDept } from '@/lib/hidden-depts'
import EducationLinker from './EducationLinker'
import EducationManual, { type ManualPerson } from './EducationManual'
import SemSexo from './SemSexo'

export const dynamic = 'force-dynamic'

export default async function EscolaridadePage() {
  const [staging, emps, edu] = await Promise.all([
    prisma.educationStaging.findMany({ orderBy: [{ nome: 'asc' }] }),
    prisma.user.findMany({
      where: { origin: 'nexus' },
      select: {
        id: true, nexusUserId: true, name: true, active: true, gender: true, jobTitle: true,
        avatarUrl: true, foraDoDiretorio: true,
        domainAccount: true, windowsUser: true, department: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.employeeEducation.findMany({ select: { nexusUserId: true, level: true, detail: true, raw: true } }),
  ])

  const visiveis = emps.filter((e) => !isHiddenDept(e.department?.name))

  const options = visiveis
    .filter((e) => e.nexusUserId)
    .map((e) => ({ id: e.nexusUserId as string, label: e.name + (e.department?.name ? ` · ${e.department.name}` : '') }))
  const nameById = Object.fromEntries(options.map((o) => [o.id, o.label]))

  const rows = staging.map((s) => ({
    id: s.id, nome: s.nome, level: s.level, detail: s.detail, sexo: s.sexo,
    confidence: s.confidence, status: s.status,
    suggestionNexusId: s.suggestionNexusId, matchedNexusId: s.matchedNexusId,
  }))

  const eduMap = new Map(edu.map((e) => [e.nexusUserId, e]))
  /* ⚠️ Mesmo recorte da lista de sexo: ativos e dentro do diretório. Sem o
     `foraDoDiretorio`, a lista de "sem escolaridade" traria gente que o
     painel não mostra — pendência que ninguém pode fechar. */
  const people: ManualPerson[] = visiveis
    .filter((e) => e.nexusUserId && e.active && !e.foraDoDiretorio)
    .map((e) => {
      const cur = eduMap.get(e.nexusUserId as string)
      return {
        id: e.nexusUserId as string, name: e.name,
        username: e.domainAccount ?? e.windowsUser ?? null,
        dept: e.department?.name ?? '—',
        level: cur?.level ?? '', detail: cur?.detail ?? '',
        raw: cur?.raw ?? null,
      }
    })

  /* ⚠️⚠️ QUEM ESTÁ SEM SEXO INFORMADO (pedido do dono, 08/09/2026). O número
     "não informado" já aparecia no comparativo por gênero e no resumo de cada
     setor — mas em nenhum lugar dava para saber DE QUEM ele era, e o que não
     tem nome não se resolve.
     ⚠️ Mesmo recorte do painel: ativos, fora do diretório de fora, setores
     ocultos de fora. Uma lista de pendência com gente que o painel nem mostra
     nunca esvazia. */
  const ativos = visiveis.filter((e) => e.active && !e.foraDoDiretorio)
  const semSexo = ativos
    .filter((e) => !e.gender || !e.gender.trim())
    .map((e) => ({
      id: e.nexusUserId ?? e.id, nome: e.name,
      dept: e.department?.name ?? '—',
      cargo: e.jobTitle ?? 'Colaborador',
      hasAvatar: !!e.avatarUrl,
    }))

  return (
    <>
      <EducationLinker rows={rows} options={options} nameById={nameById} />
      <EducationManual people={people} />
      <SemSexo pessoas={semSexo} totalAtivos={ativos.length} />
    </>
  )
}
