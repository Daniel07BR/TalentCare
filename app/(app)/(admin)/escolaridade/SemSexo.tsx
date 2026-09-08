'use client'
import { useRouter } from 'next/navigation'
import { UserRoundSearch } from 'lucide-react'
import Avatar from '../../Avatar'

/* ============================================================
   QUEM ESTÁ SEM SEXO INFORMADO (pedido do dono, 08/09/2026).

   ⚠️⚠️ ESTA LISTA EXISTE PORQUE A AUSÊNCIA JÁ CHEGA A UMA TELA. O comparativo
   por gênero e o resumo de cada setor contam "19 / 1 · 1 não informado" — o
   "não informado" aparece, mas em nenhum lugar dava para saber DE QUEM ele é,
   e o que não tem nome não se resolve.

   ⚠️ O valor vem da PLANILHA DE RH (`run-personal-import.mjs` →
   `/api/admin/personal-link`), não do Nexus e não do AD. Não há edição por aqui
   de propósito: escrever à mão um campo que uma importação reescreve é combinar
   com o import quem ganha, e o import sempre roda por último. O caminho é
   completar a planilha e reimportar — a lista diz isso, em vez de oferecer um
   botão que o próximo arquivo desfaz.
   ============================================================ */

export type PessoaSemSexo = {
  id: string; nome: string; dept: string; cargo: string; hasAvatar: boolean
}

export default function SemSexo({ pessoas, totalAtivos }: {
  pessoas: PessoaSemSexo[]
  totalAtivos: number
}) {
  const router = useRouter()

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '32px auto 0' }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Sem sexo informado</h2>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2, lineHeight: 1.55 }}>
          <b>{pessoas.length}</b> de {totalAtivos} pessoas ativas não têm o campo preenchido. Ele vem da{' '}
          <b>planilha de RH</b>, não do Nexus — para corrigir, complete a planilha e reimporte o cadastro.
        </div>
      </div>

      {pessoas.length === 0 ? (
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, fontSize: 13, color: 'var(--text-dim)' }}>
          Todas as {totalAtivos} pessoas ativas têm o sexo informado.
        </div>
      ) : (
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          {pessoas.map((p) => (
            <button key={p.id} onClick={() => router.push(`/funcionarios/${p.id}`)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-soft)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
              <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.nome.split(' ').map((x) => x[0]).slice(0, 2).join('')} color="var(--text-mute)" size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.nome}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-mute)' }}>{p.cargo} · {p.dept}</div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-mute)' }}>
                <UserRoundSearch size={14} /> não informado
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
