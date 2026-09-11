'use client'
import { useRouter } from 'next/navigation'
import { CalendarDays } from 'lucide-react'
import Avatar from '../../../Avatar'
import { Cartao, LinkAcao } from '../../../_visao/ui'
import { dataLonga, ultimasSaidas } from './derivar'
import type { ComDetalhe } from './tipos'

const iniciais = (n: string) => n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()

/** Quem saiu nos últimos 12 meses. "Ver todas" abre o Turnover do setor. */
export function UltimasSaidas({ m, abrir }: ComDetalhe) {
  const router = useRouter()
  const lista = ultimasSaidas(m)
  return (
    <Cartao titulo="Últimas saídas (rotatividade)" Icone={CalendarDays} sub="Últimos 12 meses"
      acao={lista.length > 0 && <LinkAcao onClick={() => abrir('turnover')}>Ver todas</LinkAcao>}>
      {lista.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--n-text-2)' }}>Ninguém saiu deste setor nos últimos 12 meses.</div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {lista.slice(0, 6).map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => router.push(`/funcionarios/${p.id}`)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '6px 4px', background: 'none', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', color: 'inherit', textAlign: 'left', minHeight: 44 }}>
                <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={iniciais(p.nome)} color="var(--n-text-3)" size={34} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</span>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--n-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.cargo}</span>
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--n-text-2)', whiteSpace: 'nowrap' }}>{dataLonga(p.quando)}</span>
              </button>
            </li>
          ))}
          {lista.length > 6 && <li style={{ fontSize: 11, color: 'var(--n-text-3)', padding: '4px 4px 0' }}>e mais {lista.length - 6} — em “Ver todas”</li>}
        </ul>
      )}
    </Cartao>
  )
}
