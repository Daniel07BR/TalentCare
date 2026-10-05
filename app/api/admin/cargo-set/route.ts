import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { podeAdministrar } from '@/lib/nexus'

/**
 * Gravava o CARGO OFICIAL de uma pessoa (14/09/2026, `users.cargo_oficial`).
 *
 * ⚠️⚠️ Desde 05/10/2026 o cargo vem do FLUXO — o cargo do vínculo na ficha de RH do DP, lido pelo
 * `run-ficha-sync.mjs`; quando o TalentCare e o vínculo discordavam, o DP decide na tela
 * "Divergências". Gravar aqui seria desfeito no próximo sync, então a rota recusa e diz onde.
 * O código antigo está no histórico do git.
 */
export async function POST() {
  const session = await auth()
  if (!(await podeAdministrar(session?.user?.email))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  return NextResponse.json(
    {
      error: 'Agora o cargo se corrige no Fluxo, na Administração de Funcionários do Grupo (DP).',
      onde: 'https://fluxo.grupoitamarathy.local/itamarathy/areas/departamento-pessoal/funcionarios-do-grupo',
    },
    { status: 409 },
  )
}
