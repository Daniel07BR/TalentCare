'use client'
import { useRouter } from 'next/navigation'
import { UserRound, ShieldCheck, Users2 } from 'lucide-react'
import Avatar from '../../../Avatar'
import { Cartao } from './ui'
import type { SecaoProps } from './tipos'

const iniciais = (n: string) => n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()

/* Quem responde pelo setor — do VÍNCULO gravado (`setor_avaliador`), a mesma
   origem do relatório atual. No conceito os rostos têm o mesmo tamanho; a
   hierarquia fica no cargo escrito embaixo. */
export function Lideranca({ m }: SecaoProps) {
  const router = useRouter()
  const chefes = [...m.chefia].sort((a, b) => (a.nivel === 'gestor' ? 0 : 1) - (b.nivel === 'gestor' ? 0 : 1))
  return (
    <Cartao titulo="Liderança do setor" Icone={UserRound}>
      {chefes.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
          <span style={{ width: 56, height: 56, borderRadius: '50%', border: '1px dashed var(--n-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.setor.pelaDiretoria ? 'var(--n-text-3)' : 'var(--n-amber)' }}>
            {m.setor.pelaDiretoria ? <ShieldCheck size={22} /> : <Users2 size={22} />}
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--n-text-2)' }}>{m.setor.pelaDiretoria ? 'Responde à Diretoria' : 'Sem chefia definida'}</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 18px' }}>
          {chefes.map((c) => {
            const gestor = c.nivel === 'gestor'
            const nome = gestor ? c.nome.split(' ').slice(0, 2).join(' ') : c.nome.split(' ')[0]
            const papel = gestor ? c.cargo : 'Sub-encarregado'
            return (
              <button key={c.id} type="button" onClick={() => router.push(`/funcionarios/${c.id}`)} title={`${c.nome} — abrir a ficha`}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', color: 'inherit', textAlign: 'center', width: 88 }}>
                <span style={{ display: 'inline-flex', borderRadius: '50%', padding: 3, background: gestor ? 'var(--n-blue-soft)' : 'var(--n-card-2)' }}>
                  <Avatar id={c.id} hasAvatar={c.hasAvatar} initials={iniciais(c.nome)} color={gestor ? 'var(--n-blue)' : 'var(--n-purple)'} size={64} />
                </span>
                <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nome}</div>
                <div style={{ fontSize: 10.5, color: 'var(--n-text-3)' }}>{c.deOutroSetor ? `${papel} · outro setor` : papel}</div>
              </button>
            )
          })}
        </div>
      )}
    </Cartao>
  )
}
