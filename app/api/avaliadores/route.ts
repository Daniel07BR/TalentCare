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
    prisma.department.findMany({ select: { id: true, name: true, avaliadoPelaDiretoria: true }, orderBy: { name: 'asc' } }),
    prisma.user.findMany({
      where: { origin: { in: ['nexus', 'staff'] }, active: true },
      select: { id: true, name: true, jobTitle: true, departmentId: true, avatarUrl: true },
      orderBy: { name: 'asc' },
    }),
    prisma.setorAvaliador.findMany({ select: { departmentId: true, userId: true, nivel: true } }),
  ])

  const vinculadosPorSetor = new Map<string, Map<string, string>>()
  for (const v of vinculos) {
    const s = vinculadosPorSetor.get(v.departmentId) ?? new Map<string, string>()
    s.set(v.userId, v.nivel)
    vinculadosPorSetor.set(v.departmentId, s)
  }

  const nomeDe = new Map(depts.map((d) => [d.id, d.name]))

  const setores = depts
    // Diretoria e Sistemas não são população avaliada, então não têm fila.
    .filter((d) => !isHiddenDept(d.name))
    .map((d) => {
      const doSetor = pessoas.filter((p) => p.departmentId === d.id)
      const ligados = vinculadosPorSetor.get(d.id) ?? new Map<string, string>()
      const sugeridos = doSetor.filter((p) => CARGOS_SUGERIDOS.includes(norm(p.jobTitle)))
      return {
        id: d.id,
        nome: d.name,
        pessoas: doSetor.length,
        // Setor cuja avaliação cabe à Diretoria: tem dono, e o dono é ela.
        pelaDiretoria: d.avaliadoPelaDiretoria,
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
            // 'gestor' | 'sub' — a hierarquia dentro do setor.
            nivel: ligados.get(p.id) ?? 'gestor',
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
    // Os que precisam de decisão vêm primeiro — e setor marcado "pela Diretoria"
    // JÁ TEM decisão, então não é um deles.
    .sort((a, b) => (a.avaliadores.length === 0 && !a.pelaDiretoria ? 0 : 1) - (b.avaliadores.length === 0 && !b.pelaDiretoria ? 0 : 1) || b.pessoas - a.pessoas)

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
    semAvaliador: setores.filter((s) => s.avaliadores.length === 0 && !s.pelaDiretoria).length,
    pessoasSemAvaliador: setores.filter((s) => s.avaliadores.length === 0 && !s.pelaDiretoria).reduce((a, s) => a + s.pessoas, 0),
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

  const body = (await req.json()) as { departmentId?: string; userId?: string; ligar?: boolean; nivel?: string }
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

  const alvo = await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true, active: true, jobTitle: true } })
  if (!alvo) return NextResponse.json({ error: 'pessoa não encontrada' }, { status: 404 })
  // ⚠️ Desligado não avalia: o vínculo é poder sobre a carreira de alguém e não
  // pode sobreviver à saída da pessoa.
  if (!alvo.active) return NextResponse.json({ error: 'Pessoa desligada não pode ser avaliadora.' }, { status: 422 })

  /*
   * O NÍVEL: 'sub' quando pedido, ou sugerido pelo cargo do Nexus.
   *
   * ⚠️ `gestor` é o padrão porque quem é escolhido para um setor sem chefia é,
   * por definição, o topo dele — a Rosemeire tem cargo `Colaborador` e é o topo
   * da Limpeza e da Cozinha. `sub` é a exceção que se marca.
   */
  const nivel = body.nivel === 'sub' || (!body.nivel && norm(alvo.jobTitle) === 'sub-encarregado')
    ? 'sub'
    : 'gestor'
  await prisma.setorAvaliador.upsert({
    where: { departmentId_userId: { departmentId: body.departmentId, userId: body.userId } },
    create: { departmentId: body.departmentId, userId: body.userId, nivel, createdById: quem.id },
    // Reclicar com outro nível TROCA o nível — é como a tela corrige um engano
    // sem obrigar a desligar e religar.
    update: body.nivel ? { nivel } : {},
  })
  // ⚠️⚠️ O acesso é recalculado NA HORA. O sync de diretório roda quando roda
  // (no .78, só a mão), e sem isto nomear alguém avaliador só teria efeito na
  // porta depois do próximo sync — a pessoa bateria num 403 sem ninguém
  // entender por quê.
  const papel = await recalcularAcesso(body.userId)
  return NextResponse.json({ ok: true, ligado: true, papel })
}

/**
 * Marca (ou desmarca) um setor como AVALIADO PELA DIRETORIA.
 *
 * ⚠️ Tem a ida E a volta na mesma rota. Marca que só se põe é marca que ninguém
 * confere depois — e um setor que ganhou gestor continuaria eternamente "da
 * Diretoria", com dois donos e nenhum responsável.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const quem = await quemEh((session.user as { id: string }).id)
  if (!quem || !podeGerirAvaliadores(quem)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const body = (await req.json()) as { departmentId?: string; pelaDiretoria?: boolean }
  if (!body.departmentId) return NextResponse.json({ error: 'departmentId é obrigatório' }, { status: 400 })

  await prisma.department.update({
    where: { id: body.departmentId },
    data: { avaliadoPelaDiretoria: body.pelaDiretoria !== false },
  })
  return NextResponse.json({ ok: true, pelaDiretoria: body.pelaDiretoria !== false })
}

/**
 * APLICAR AS SUGESTÕES de todos os setores que ainda não têm vínculo nenhum.
 *
 * ⚠️⚠️ Existe porque a exigência de confirmar setor por setor virou ATRITO real
 * (02/09/2026): o dono perguntou "por que várias pessoas estão sem avaliador, se
 * o sistema já sabe o gestor e os sub-encarregados dele?" — e ele tinha razão. O
 * cargo do Nexus já dizia; o que faltava era um caminho para dizer "sim, use o
 * cargo" de uma vez. Sem este botão, a única saída era um script — e uma régua
 * que só se preenche por script é uma régua que fica vazia.
 *
 * ⚠️ Só toca em setor SEM NENHUM vínculo e que não está marcado "cabe à
 * Diretoria". Nunca reescreve uma decisão já tomada por gente: a promoção de
 * alguém continua NÃO mudando a régua sozinha, que é o ponto de tudo isto.
 *
 * Nível: `Sub-encarregado` → `sub`; qualquer outro cargo de chefia → `gestor`.
 */
export async function PUT() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const quem = await quemEh((session.user as { id: string }).id)
  if (!quem || !podeGerirAvaliadores(quem)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const [depts, vinculos, pessoas] = await Promise.all([
    prisma.department.findMany({ select: { id: true, name: true, avaliadoPelaDiretoria: true } }),
    prisma.setorAvaliador.findMany({ select: { departmentId: true } }),
    prisma.user.findMany({
      where: { origin: { in: ['nexus', 'staff'] }, active: true, foraDoDiretorio: false },
      select: { id: true, jobTitle: true, departmentId: true },
    }),
  ])
  const comVinculo = new Set(vinculos.map((v) => v.departmentId))

  let criados = 0
  const semChefia: string[] = []
  for (const d of depts) {
    if (isHiddenDept(d.name)) continue
    if (comVinculo.has(d.id) || d.avaliadoPelaDiretoria) continue
    const equipe = pessoas.filter((p) => p.departmentId === d.id)
    if (equipe.length === 0) continue
    const chefes = equipe.filter((p) => CARGOS_SUGERIDOS.includes(norm(p.jobTitle)))
    // ⚠️ Setor sem ninguém de chefia volta NOMEADO na resposta, e não em
    // silêncio: é ele que continua precisando de uma escolha à mão, e a tela
    // tem de poder dizer quais são.
    if (chefes.length === 0) { semChefia.push(d.name); continue }
    for (const c of chefes) {
      const nivel = norm(c.jobTitle) === 'sub-encarregado' ? 'sub' : 'gestor'
      await prisma.setorAvaliador.upsert({
        where: { departmentId_userId: { departmentId: d.id, userId: c.id } },
        create: { departmentId: d.id, userId: c.id, nivel, createdById: quem.id },
        update: { nivel },
      })
      await recalcularAcesso(c.id)
      criados++
    }
  }
  return NextResponse.json({ ok: true, criados, semChefia })
}
