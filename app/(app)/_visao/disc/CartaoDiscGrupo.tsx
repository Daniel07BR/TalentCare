'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Shapes } from 'lucide-react'
import { corDe, fatias, tintaSobre, type Notas } from '@/lib/disc/calculo'
import { FATORES, PERFIS, type Fator } from '@/lib/disc/perfis'
import { Cartao } from '../ui'
import { FaixaDisc } from './JanelaDisc'
import d from './disc.module.css'

/* ============================================================
   O DISC DA CASA, setor a setor — o cartão do painel principal (Diretoria).

   Só AGREGADO (a rota não manda nome de ninguém): quantas pessoas de cada
   perfil predominante há em cada setor (empate vale meia em cada cor). O clique leva ao setor, onde estão as
   pessoas.
   ============================================================ */

type Setor = { id: string; nome: string; total: number; comDisc: number; empates: number; contagem: Record<Fator, number>; pessoas: Notas }
type Resposta = { setores: Setor[]; total: number; comDisc: number }

export function CartaoDiscGrupo() {
  const [r, setR] = useState<Resposta | null>(null)
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'negado' | 'erro'>('carregando')
  useEffect(() => {
    let vivo = true
    fetch('/api/disc/grupo', { cache: 'no-store' })
      .then(async (x) => {
        if (x.status === 401 || x.status === 403) { if (vivo) setEstado('negado'); return }
        if (!x.ok) throw new Error(String(x.status))
        const j = (await x.json()) as Resposta
        if (vivo) { setR(j); setEstado('ok') }
      })
      .catch(() => vivo && setEstado('erro'))
    return () => { vivo = false }
  }, [])

  if (estado === 'negado') return null
  const comDados = r?.setores.filter((s) => s.comDisc > 0) ?? []
  const semDados = r?.setores.filter((s) => s.comDisc === 0) ?? []

  // A mistura da CASA: pessoas por perfil predominante, somadas de todos os setores.
  const casa = Object.fromEntries(FATORES.map((f) => [f, 0])) as Notas
  for (const s of comDados) for (const f of FATORES) casa[f] += s.pessoas[f]

  return (
    <Cartao titulo="Perfil DISC por departamento" Icone={Shapes} className={d.cores}
      sub={r ? <><b style={{ color: 'var(--n-text-2)' }}>{r.comDisc} de {r.total}</b> pessoas com DISC registrado · retrato da última aplicação, não acompanha o filtro</> : undefined}>
      {estado !== 'ok' || !r ? (
        <div style={{ fontSize: 12.5, color: estado === 'erro' ? 'var(--n-red)' : 'var(--n-text-3)' }}>
          {estado === 'erro' ? 'Não foi possível ler o DISC dos setores.' : 'Carregando…'}
        </div>
      ) : comDados.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--n-text-2)', lineHeight: 1.5 }}>
          Nenhum resultado DISC registrado ainda. A chefia de cada setor registra no botão <b>DISC</b>, no topo da ficha de cada pessoa.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12.5, fontWeight: 800, minWidth: 150 }}>Grupo Itamarathy</span>
            <span style={{ flex: '1 1 300px', minWidth: 0 }}><FaixaDisc n={casa} altura={30} /></span>
            <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {FATORES.map((f) => (
                <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--n-text-2)' }}>
                  <span className={d.letra} style={{ background: corDe(f), color: tintaSobre(f), width: 18, height: 18, fontSize: 10 }}>{f}</span>{PERFIS[f].nome}
                </span>
              ))}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {comDados.map((s) => {
              const top = fatias(s.pessoas)[0]
              return (
                <Link key={s.id} href={`/departamentos/${s.id}`} className={d.pessoa}
                  style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 170px) minmax(0, 1fr) auto', gap: 12 }}
                  title={`Abrir o ${s.nome}`}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.nome}</span>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--n-text-3)' }}>{s.comDisc} de {s.total} · mais {PERFIS[top.fator].nome}</span>
                  </span>
                  <FaixaDisc n={s.pessoas} altura={20} />
                  <span style={{ display: 'flex', gap: 6 }} title="Quantas pessoas predominam em cada perfil (empate conta nos dois)">
                    {FATORES.map((f) => (
                      <span key={f} style={{ minWidth: 26, textAlign: 'center', fontSize: 12, fontWeight: 800, padding: '2px 6px', borderRadius: 7, background: s.contagem[f] ? corDe(f) : 'var(--n-card-2)', color: s.contagem[f] ? tintaSobre(f) : 'var(--n-text-3)' }}>
                        {s.contagem[f]}
                      </span>
                    ))}
                  </span>
                </Link>
              )
            })}
          </div>
          {semDados.length > 0 && (
            <div style={{ fontSize: 11.5, color: 'var(--n-text-3)', lineHeight: 1.5 }}>
              Ainda sem nenhum registro: {semDados.map((s) => s.nome).join(', ')}.
            </div>
          )}
        </div>
      )}
    </Cartao>
  )
}
