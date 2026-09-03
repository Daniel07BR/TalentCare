import 'server-only'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth/config'

/* ============================================================
   O ALCANCE DE DADO de quem está lendo — a régua das rotas AGREGADAS.

   ⚠️⚠️ Estas rotas (`/api/chat-metrics`, `/api/helpdesk-metrics` e as outras
   nove) devolviam a EMPRESA INTEIRA para qualquer sessão autenticada. Enquanto
   só a Diretoria entrava, o dano era contido; era esta a dívida que impedia
   ligar `TALENTCARE_ACESSO_ABERTO` — no dia em que 87 pessoas entrassem, um
   gestor do Fiscal puxaria o painel do Contábil trocando a URL, e nada
   apareceria em log nenhum.

   ⚠️ O middleware não resolve isto: ele conhece o CAMINHO, e o caminho é o mesmo
   para todo setor. Régua de conteúdo é aqui.

   ⚠️ E ela vive num arquivo só, como a régua da avaliação: a mesma pergunta
   respondida em onze rotas diferentes viraria onze respostas diferentes no dia
   em que alguém mudasse uma delas.
   ============================================================ */

export type Alcance =
  /** Diretoria e administração: a empresa toda. */
  | { tipo: 'tudo' }
  /**
   * Gestor, sub-encarregado, colaborador: só a gente que ele alcança.
   * As quatro chaves existem porque as fontes casam por chaves diferentes —
   * `nexusUserId` na maioria, `name` no WhatsApp, `personKey` no ponto,
   * `nexusDepartmentId` nos agregados por setor.
   */
  | {
      tipo: 'recorte'
      userIds: string[]
      nexusIds: string[]
      /** `nexusUserId ?? id` — a chave do ponto e da disciplina. */
      personKeys: string[]
      nomes: string[]
      departmentIds: string[]
      nexusDepartmentIds: string[]
    }

/** `null` = sem sessão. A rota deve responder 401. */
export async function alcanceDeQuemLe(): Promise<Alcance | null> {
  const session = await auth()
  if (!session?.user) return null
  const uid = (session.user as { id?: string }).id
  if (!uid) return null

  const eu = await prisma.user.findUnique({
    where: { id: uid },
    select: { id: true, role: true, departmentId: true },
  })
  if (!eu) return null
  if (eu.role === 'ADMIN') return { tipo: 'tudo' }

  /*
   * ⚠️⚠️ SÓ OS SETORES QUE ELE AVALIA — o setor DELE não entra por ser dele.
   *
   * A primeira versão somava `eu.departmentId`, e o ensaio contra o banco
   * mostrou o efeito: a Ana Carolina, `Colaborador` do Fiscal, alcançaria as
   * **31 pessoas do setor** — atividade, atrasos e advertências de todo mundo —
   * só por sentar lá. O dado do setor não é dela porque ela trabalha nele; é de
   * quem responde por ele.
   *
   * O middleware já barra o COLABORADOR nestas rotas, e é exatamente por isso
   * que a régua de conteúdo tinha de barrar também: confiar só na porta é o
   * defeito que a auditoria do relatório de setor encontrou.
   */
  const vinculos = await prisma.setorAvaliador.findMany({
    where: { userId: uid },
    select: { departmentId: true },
  })
  const departmentIds = [...new Set(vinculos.map((v) => v.departmentId))]

  const gente = await prisma.user.findMany({
    where: departmentIds.length
      // ⚠️ `OR` com o próprio id: quem não tem setor (nem vínculo) ainda alcança
      // a si mesmo — a página de desempenho dele depende disso.
      ? { OR: [{ departmentId: { in: departmentIds } }, { id: uid }] }
      : { id: uid },
    select: { id: true, nexusUserId: true, name: true, department: { select: { nexusDepartmentId: true } } },
  })

  return {
    tipo: 'recorte',
    userIds: gente.map((g) => g.id),
    nexusIds: gente.map((g) => g.nexusUserId).filter((v): v is string => !!v),
    personKeys: gente.map((g) => g.nexusUserId ?? g.id),
    nomes: gente.map((g) => g.name),
    departmentIds,
    nexusDepartmentIds: [...new Set(gente.map((g) => g.department?.nexusDepartmentId).filter((v): v is string => !!v))],
  }
}

/* ── Os filtros prontos, para a rota não montar cada um do seu jeito ──────── */

/** `where` por `nexusUserId` — a maioria dos espelhos. */
export const porNexus = (a: Alcance) =>
  a.tipo === 'tudo' ? {} : { nexusUserId: { in: a.nexusIds } }

/** `where` por `personKey` — ponto e disciplina (cobre STAFF sem Nexus). */
export const porPersonKey = (a: Alcance) =>
  a.tipo === 'tudo' ? {} : { personKey: { in: a.personKeys } }

/** `where` por `name` — o WhatsApp, cuja origem não tem id do Nexus. */
export const porNome = (a: Alcance) =>
  a.tipo === 'tudo' ? {} : { name: { in: a.nomes } }

/** `where` por `nexusDepartmentId` — os agregados por setor. */
export const porDeptNexus = (a: Alcance) =>
  a.tipo === 'tudo' ? {} : { nexusDepartmentId: { in: a.nexusDepartmentIds } }

/** `where` por `dept` (nome do setor) — o espelho do WhatsApp usa o nome. */
export const porDeptNome = (a: Alcance, nomesDeSetor: string[]) =>
  a.tipo === 'tudo' ? {} : { dept: { in: nomesDeSetor } }
