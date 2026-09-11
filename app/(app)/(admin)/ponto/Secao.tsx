import { prisma } from '@/lib/db/prisma'
import { isHiddenDept } from '@/lib/hidden-depts'
import PontoLinker, { type PontoRow, type PontoOption } from './PontoLinker'

export const dynamic = 'force-dynamic'

export default async function PontoPage() {
  const [staging, emps] = await Promise.all([
    prisma.pontoStaging.findMany({ where: { status: 'pending' }, orderBy: [{ advertencias: 'desc' }, { atrasos: 'desc' }] }),
    prisma.user.findMany({
      where: { origin: { in: ['nexus', 'staff'] } },
      select: { id: true, nexusUserId: true, name: true, active: true, department: { select: { name: true } } },
      orderBy: { name: 'asc' },
    }),
  ])

  const visiveis = emps.filter((e) => !isHiddenDept(e.department?.name))
  const options: PontoOption[] = visiveis.map((e) => ({ id: e.id, label: e.name + (e.department?.name ? ` · ${e.department.name}` : '') + (e.active ? '' : ' (inativo)') }))
  // suggestionPersonKey = nexusUserId ?? id → mapeia p/ user.id (chave do dropdown).
  const personKeyToId = new Map(visiveis.map((e) => [e.nexusUserId ?? e.id, e.id]))

  const rows: PontoRow[] = staging.map((s) => ({
    id: s.id, nome: s.nome, depto: s.depto, email: s.email,
    atrasos: s.atrasos, advertencias: s.advertencias,
    suggestionUserId: s.suggestionPersonKey ? (personKeyToId.get(s.suggestionPersonKey) ?? '') : '',
  }))

  return <PontoLinker rows={rows} options={options} />
}
