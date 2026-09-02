import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { quemEh, podeGerirAvaliadores } from '@/lib/avaliacoes/regua'
import { isHiddenDept } from '@/lib/hidden-depts'
import { recalcularAcesso } from '@/lib/nexus'

/* ============================================================
   QUEM AVALIA cada setor.

   ⚠️⚠️ O cargo do Nexus (`Gestor`, `Sub-encarregado`) só SUGERE. Quem decide é
   gente, e a decisão fica gravada em `setor_avaliador`. Derivar a régua do cargo
   na hora pareceria mais limpo e seria pior: no dia em que um setor ganhasse um
   segundo "Gestor", ou alguém fosse promovido, o poder de avaliar mudaria de
   mão sozinho, sem autor e sem aviso.
   ============================================================ */

/** Cargos que a tela oferece como sugestão de avaliador. */
const CARGOS_SUGERIDOS = ['gestor', 'sub-encarregado']
const norm = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const quem = await quemEh((session.user as { id: string }).id)
  if (!quem || !podeGerirAvaliadores(quem)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const [depts, pessoas, vinculos] = await Promise.all([
    prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.user.findMany({
      where: { origin: { in: ['nexus', 'staff'] }, active: true },
      select: { id: true, name: true, jobTitle: true, departmentId: true, avatarUrl: true },
      orderBy: { name: 'asc' },
    }),
    prisma.setorAvaliador.findMany({ select: { departmentId: true, userId: true } }),
  ])

  const vinculadosPorSetor = new Map<string, Set<string>>()
  for (const v of vinculos) {
    const s = vinculadosPorSetor.get(v.departmentId) ?? new Set<string>()
    s.add(v.userId)
    vinculadosPorSetor.set(v.departmentId, s)
  }

  const nomeDe = new Map(depts.map((d) => [d.id, d.name]))

  const setores = depts
    // Diretoria e Sistemas não são população avaliada, então não têm fila.
    .filter((d) => !isHiddenDept(d.name))
    .map((d) => {
      const doSetor = pessoas.filter((p) => p.departmentId === d.id)
      const ligados = vinculadosPorSetor.get(d.id) ?? new Set<string>()
      const sugeridos = doSetor.filter((p) => CARGOS_SUGERIDOS.includes(norm(p.jobTitle)))
      return {
        id: d.id,
        nome: d.name,
        pessoas: doSetor.length,
        /*
         * Quem já está gravado como avaliador — de QUALQUER setor.
         *
         * ⚠️⚠️ Filtrar por `doSetor` (a equipe daquele setor) escondia justamente
         * o caso que existe: a Rosemeire é da Cozinha e avalia a Limpeza. O
         * vínculo estaria gravado e a tela mostraria "Ninguém avalia" — o pior
         * dos dois mundos, porque quem olhasse desfaria e refaria sem entender.
         */
        avaliadores: pessoas.filter((p) => ligados.has(p.id))
          .map((p) => ({
            id: p.id, nome: p.name, cargo: p.jobTitle, hasAvatar: !!p.avatarUrl,
            // De onde a pessoa é, quando não é deste setor. A tela mostra, senão
            // "Rosemeire · Colaborador" na Limpeza parece cadastro errado.
            deOutroSetor: p.departmentId !== d.id ? (nomeDe.get(p.departmentId ?? '') ?? 'Sem setor') : null,
          })),
        // Sugestão pelo cargo, ainda não confirmada.
        sugestoes: sugeridos.filter((p) => !ligados.has(p.id))
          .map((p) => ({ id: p.id, nome: p.name, cargo: p.jobTitle, hasAvatar: !!p.avatarUrl })),
        // ⚠️ Setor SEM avaliador e SEM sugestão: ninguém no Nexus tem cargo de
        // chefia ali. São os que exigem uma escolha à mão — hoje Limpeza, TI,
        // Cozinha, Consultoria, Entregas e Pousada. Sem isso, essas pessoas
        // ficariam na fila de ninguém e nunca seriam avaliadas.
        equipe: doSetor.map((p) => ({ id: p.id, nome: p.name, cargo: p.jobTitle, hasAvatar: !!p.avatarUrl })),
      }
    })
    // Os que precisam de decisão vêm primeiro.
    .sort((a, b) => (a.avaliadores.length === 0 ? 0 : 1) - (b.avaliadores.length === 0 ? 0 : 1) || b.pessoas - a.pessoas)

  return NextResponse.json({
    setores,
    /*
     * ⚠️⚠️ TODA a gente ativa, e não só a do setor. Descoberto em 02/09/2026, na
     * primeira vez que a tela foi usada de verdade: a Limpeza não tem ninguém de
     * chefia, e quem vai avaliá-la é a Rosemeire, que é da COZINHA. Oferecer só
     * "a equipe do setor" tornava isso impossível pela tela — e a rota sempre
     * aceitou, então o limite era só do formulário. Setor pequeno quase nunca
     * tem o próprio avaliador dentro dele; é a regra, não a exceção.
     */
    todos: pessoas.map((p) => ({
      id: p.id, nome: p.name, cargo: p.jobTitle, hasAvatar: !!p.avatarUrl,
      setor: nomeDe.get(p.departmentId ?? '') ?? 'Sem setor',
    })),
    semAvaliador: setores.filter((s) => s.avaliadores.length === 0).length,
    pessoasSemAvaliador: setores.filter((s) => s.avaliadores.length === 0).reduce((a, s) => a + s.pessoas, 0),
  })
}

// Liga ou desliga um avaliador de um setor.
//
// ⚠️⚠️ Existe a ida E a volta na mesma rota (`ligar: false`). Estado que só um
// caminho escreve é o defeito que se descobre tarde: alguém sai da chefia, o
// vínculo fica, e a pessoa segue podendo avaliar o antigo setor.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const quem = await quemEh((session.user as { id: string }).id)
  if (!quem || !podeGerirAvaliadores(quem)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = (await req.json()) as { departmentId?: string; userId?: string; ligar?: boolean }
  if (!body.departmentId || !body.userId) {
    return NextResponse.json({ error: 'departmentId e userId são obrigatórios' }, { status: 400 })
  }

  if (body.ligar === false) {
    await prisma.setorAvaliador.deleteMany({
      where: { departmentId: body.departmentId, userId: body.userId },
    })
    // ⚠️ A VOLTA também mexe no acesso: quem deixou de avaliar o último setor
    // dele deixa de alcançar a fila. Sem esta linha, o vínculo sumia e a porta
    // continuava aberta — estado que só um caminho atualiza.
    const papel = await recalcularAcesso(body.userId)
    return NextResponse.json({ ok: true, ligado: false, papel })
  }

  const alvo = await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true, active: true } })
  if (!alvo) return NextResponse.json({ error: 'pessoa não encontrada' }, { status: 404 })
  // ⚠️ Desligado não avalia: o vínculo é poder sobre a carreira de alguém e não
  // pode sobreviver à saída da pessoa.
  if (!alvo.active) return NextResponse.json({ error: 'Pessoa desligada não pode ser avaliadora.' }, { status: 422 })

  await prisma.setorAvaliador.upsert({
    where: { departmentId_userId: { departmentId: body.departmentId, userId: body.userId } },
    create: { departmentId: body.departmentId, userId: body.userId, createdById: quem.id },
    update: {},
  })
  // ⚠️⚠️ O acesso é recalculado NA HORA. O sync de diretório roda quando roda
  // (no .78, só a mão), e sem isto nomear alguém avaliador só teria efeito na
  // porta depois do próximo sync — a pessoa bateria num 403 sem ninguém
  // entender por quê.
  const papel = await recalcularAcesso(body.userId)
  return NextResponse.json({ ok: true, ligado: true, papel })
}
