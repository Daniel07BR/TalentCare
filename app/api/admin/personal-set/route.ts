import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { podeAdministrar } from '@/lib/nexus'

/**
 * Editava nascimento e admissão de uma pessoa, por nexus_user_id.
 *
 * ⚠️⚠️ Desde 05/10/2026 nascimento e admissão vêm do FLUXO — a ficha de RH do DP ("Administração de
 * Funcionários do Grupo"), lida pelo `run-ficha-sync.mjs`. Gravar aqui seria desfeito no próximo
 * sync, então a rota recusa e diz onde corrigir. O código antigo está no histórico do git.
 */
export async function POST() {
  const session = await auth()
  if (!(await podeAdministrar(session?.user?.email))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  return NextResponse.json(
    {
      error: 'Agora nascimento e admissão se corrige no Fluxo, na Administração de Funcionários do Grupo (DP).',
      onde: 'https://fluxo.grupoitamarathy.local/itamarathy/areas/departamento-pessoal/funcionarios-do-grupo',
    },
    { status: 409 },
  )
}
