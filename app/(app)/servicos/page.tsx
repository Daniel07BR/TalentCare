import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { quemEh, setoresQueGere } from '@/lib/avaliacoes/regua'
import { isHiddenDept } from '@/lib/hidden-depts'
import ServicosClient from './ServicosClient'

export const dynamic = 'force-dynamic'

/**
 * A área onde o setor sobe a planilha de serviços dele.
 *
 * ⚠️⚠️ A régua roda AQUI, no servidor, e de novo em cada rota. O
 * `docs/AVALIACOES.md` é explícito: confiar só na porta deixa alguém puxar o
 * setor do vizinho trocando o `?id=`; confiar só na régua de conteúdo deixa a
 * tela aparecer para quem não devia vê-la. As duas precisam existir.
 */
export default async function ServicosPage() {
  const session = await auth()
  const uid = (session?.user as { id?: string } | undefined)?.id
  const quem = uid ? await quemEh(uid) : null
  if (!quem) redirect('/login')

  const gere = setoresQueGere(quem)
  const setores = (await prisma.department.findMany({
    where: gere === 'todos' ? {} : { id: { in: gere } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })).filter((d) => !isHiddenDept(d.name))

  /* ⚠️ Sem setor nenhum, a tela DIZ por quê. Uma página em branco faz a pessoa
     achar que o sistema quebrou e abrir chamado — o `/portal` do Nexus já
     ensinou isso. */
  if (!setores.length) {
    return (
      <div className="tc-anim" style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, letterSpacing: '-.5px' }}>Serviços do setor</h1>
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
          Esta área é de quem responde por um setor. Você não tem vínculo de avaliador em nenhum —
          por isso não há planilha para subir aqui. Se isso estiver errado, quem acerta é a Diretoria,
          na tela de avaliadores.
        </div>
      </div>
    )
  }

  const lotes = await prisma.importLote.findMany({
    where: { departmentId: { in: setores.map((s) => s.id) } },
    orderBy: { enviadoEm: 'desc' },
    take: 20,
  })
  const autores = await prisma.user.findMany({
    where: { id: { in: [...new Set(lotes.map((l) => l.enviadoPor))] } },
    select: { id: true, name: true },
  })
  const nomePorId = new Map(autores.map((a) => [a.id, a.name]))

  return (
    <ServicosClient
      setores={setores}
      lotes={lotes.map((l) => ({
        id: l.id, departmentId: l.departmentId, arquivo: l.arquivo,
        diaDe: l.diaDe, diaAte: l.diaAte, linhas: l.linhas,
        linhasSemVinculo: l.linhasSemVinculo, ativo: l.ativo,
        enviadoEm: l.enviadoEm.toISOString(),
        enviadoPor: nomePorId.get(l.enviadoPor) ?? '—',
      }))}
    />
  )
}
