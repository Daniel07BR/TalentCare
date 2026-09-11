import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { quemEh, podeGerirServicos } from '@/lib/avaliacoes/regua'
import { EVENTOS, competenciaAtual } from '@/lib/servicos/pontuacao'

/* ============================================================
   A RÉGUA DE PONTUAÇÃO DO SETOR — cada um define a sua.

   ⚠️⚠️ NUNCA SE EDITA UMA RÉGUA. Salvar cria uma VERSÃO nova, com a competência
   a partir da qual ela vale. Editar no lugar reescreveria o passado: afrouxar o
   peso do atraso em dezembro mudaria também a nota de novembro, que a pessoa já
   leu e sobre a qual já conversou com o gestor.

   É o mesmo princípio do `AvaliacaoVersao`: "uma nota que se reescreve em
   silêncio depois de a pessoa ler não é registro — é negociação, e vence quem
   insiste mais". Aqui pesa ainda mais, porque quem edita a régua é o gestor do
   próprio time (decisão do dono, 03/09/2026) — o registro de autor, data e
   vigência é o que separa "mudamos o critério" de "mudei a nota dele".
   ============================================================ */

export async function GET(req: NextRequest) {
  const session = await auth()
  const uid = (session?.user as { id?: string } | undefined)?.id
  const quem = uid ? await quemEh(uid) : null
  if (!quem) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const departmentId = req.nextUrl.searchParams.get('departmentId') ?? ''
  if (!podeGerirServicos(quem, departmentId)) {
    return NextResponse.json({ error: 'Você não administra este setor.' }, { status: 403 })
  }

  const versoes = await prisma.pontuacaoRegra.findMany({
    where: { departmentId },
    include: { itens: true },
    orderBy: { vigenteDesde: 'desc' },
  })
  const autores = await prisma.user.findMany({
    where: { id: { in: [...new Set(versoes.map((v) => v.criadoPor))] } },
    select: { id: true, name: true },
  })
  const nomePorId = new Map(autores.map((a) => [a.id, a.name]))

  return NextResponse.json({
    eventos: EVENTOS,
    competenciaAtual: competenciaAtual(),
    /** Quem pode alterar a régua GERAL (Configurações): o dono e a Diretoria. */
    podeAlterar: quem.role === 'ADMIN',
    versoes: versoes.map((v) => ({
      id: v.id, base: v.base, fatorPorMinuto: v.fatorPorMinuto, vigenteDesde: v.vigenteDesde, motivo: v.motivo,
      criadoEm: v.criadoEm, criadoPor: nomePorId.get(v.criadoPor) ?? '—',
      itens: v.itens.map((i) => ({ evento: i.evento, pontos: i.pontos })),
    })),
  })
}

/* ⚠️⚠️ A RÉGUA DO SETOR NÃO SE EDITA MAIS AQUI (11/09/2026, decisão do dono): ela
   é GERADA pela régua geral de Configurações (`/api/regra-geral`), que só o dono
   e a Diretoria alteram. Um gestor gravando a do setor por esta rota desfaria a
   regra universal em silêncio — por isso ela recusa, e diz onde é agora. A
   gravação antiga (versão por setor, vigência ≥ mês corrente) está no histórico
   do git e virou `lib/servicos/regra-geral-servidor.ts`. */
export async function POST() {
  return NextResponse.json({
    error: 'A régua de pontuação agora é geral, para todos os setores — ela é definida em Configurações → Régua de pontuação, pelo dono do sistema e pela Diretoria. O setor segue ajustando o tempo médio das tarefas.',
  }, { status: 410 })
}
