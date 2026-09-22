'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Shapes } from 'lucide-react'
import { corDe, nomeDoPerfil, predominantes, tintaSobre, type Notas } from '@/lib/disc/calculo'
import { FATORES, PERFIS, type Fator } from '@/lib/disc/perfis'
import Avatar from '../../Avatar'
import { Cartao } from '../ui'
import { FaixaDisc, QuadroPerfis } from './JanelaDisc'
import d from './disc.module.css'

/* ============================================================
   O PERFIL DISC DO SETOR — "para terem noção da característica do setor"
   (pedido do dono, 22/09/2026).

   À esquerda, a MISTURA e QUANTOS de cada perfil (clicar abre quem são). À
   direita, o QUADRO DOS PERFIS da janela da pessoa, aberto no perfil que mais
   aparece no setor (pedido do dono: "deixe lá o quadro que já existe dentro do
   resumo da pessoa").

   ⚠️⚠️ A MISTURA CONTA PESSOAS, pelo perfil predominante — e não a média das
   notas. A primeira versão fazia a média das fatias, e o dono pegou na hora:
   "por que 22% no Dominante se ninguém foi classificado como Dominante?". A
   média estava certa como conta e errada como leitura: todo mundo tem um pouco
   de D, e a barra pintava de vermelho um setor sem nenhum Dominante. Agora a
   barra e a lista embaixo dela dizem a MESMA coisa.

   ⚠️⚠️ EMPATE: na LISTA a pessoa aparece nos DOIS perfis (é quem ela é); na
   BARRA ela vale MEIA em cada um, para a barra fechar 100% das pessoas. O
   rodapé diz isso. Mandar a pessoa para um só seria desempatar por ordem
   alfabética o que o teste deixou empatado.

   ⚠️ Não aparece para quem não é da régua (403): gestor de outro setor não
   chega aqui, e o COLABORADOR nem chega à página.
   ============================================================ */

type Pessoa = { id: string; nome: string; cargo: string; hasAvatar: boolean; notas: Notas | null; aplicadoEm: string | null }
type Resposta = { setor: { id: string; nome: string }; ocultas: number; pessoas: Pessoa[] }

const iniciais = (nome: string) => nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

export function CartaoDiscSetor({ deptId }: { deptId: string }) {
  const [r, setR] = useState<Resposta | null>(null)
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'negado' | 'erro'>('carregando')
  const [aberto, setAberto] = useState<Fator | 'sem' | null>(null)

  useEffect(() => {
    let vivo = true
    fetch(`/api/disc/setor?dept=${encodeURIComponent(deptId)}`, { cache: 'no-store' })
      .then(async (x) => {
        if (x.status === 401 || x.status === 403 || x.status === 404) { if (vivo) setEstado('negado'); return }
        if (!x.ok) throw new Error(String(x.status))
        const j = (await x.json()) as Resposta
        if (vivo) { setR(j); setEstado('ok') }
      })
      .catch(() => vivo && setEstado('erro'))
    return () => { vivo = false }
  }, [deptId])

  if (estado === 'negado') return null
  if (estado !== 'ok' || !r) {
    return (
      <Cartao titulo="Perfil DISC do setor" Icone={Shapes} className={d.cores}>
        <div style={{ fontSize: 12.5, color: estado === 'erro' ? 'var(--n-red)' : 'var(--n-text-3)' }}>
          {estado === 'erro' ? 'Não foi possível ler o DISC do setor.' : 'Carregando…'}
        </div>
      </Cartao>
    )
  }

  const com = r.pessoas.filter((p): p is Pessoa & { notas: Notas } => !!p.notas)
  const sem = r.pessoas.filter((p) => !p.notas)
  const porFator = Object.fromEntries(FATORES.map((f) => [f, com.filter((p) => predominantes(p.notas).includes(f))])) as Record<Fator, typeof com>
  const empates = com.filter((p) => predominantes(p.notas).length > 1).length
  /* Pessoas por perfil, com o empate dividido: a barra soma exatamente `com.length`. */
  const peso = Object.fromEntries(FATORES.map((f) => [f, 0])) as Notas
  for (const p of com) { const pr = predominantes(p.notas); for (const f of pr) peso[f] += 1 / pr.length }
  const pctPessoas = (f: Fator) => (com.length ? (peso[f] / com.length) * 100 : 0)
  // Os perfis por quantidade de gente — os que mais aparecem abrem o quadro, com estrela.
  const ordem = [...FATORES].sort((a, b) => peso[b] - peso[a] || FATORES.indexOf(a) - FATORES.indexOf(b))
  const maisComum = ordem.filter((f) => peso[f] > 0 && peso[f] === peso[ordem[0]])
  const maxLinha = Math.max(1, ...FATORES.map((f) => porFator[f].length))

  const sub = (
    <>
      <b style={{ color: 'var(--n-text-2)' }}>{com.length} de {r.pessoas.length}</b> com DISC registrado · retrato da última aplicação, não acompanha o filtro
      {r.ocultas > 0 && <> · {r.ocultas === 1 ? '1 pessoa fica' : `${r.ocultas} pessoas ficam`} fora do seu acesso</>}
    </>
  )

  const listaDe = (gente: Pessoa[]) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 0 8px 36px' }}>
      {gente.map((p) => (
        <Link key={p.id} href={`/funcionarios/${p.id}`} className={d.pessoa} title="Abrir a ficha (o botão DISC fica no topo)">
          <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={iniciais(p.nome)} color="var(--n-text-3)" size={28} radius={8} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</span>
            <span style={{ display: 'block', fontSize: 11, color: 'var(--n-text-3)' }}>
              {p.notas ? nomeDoPerfil(predominantes(p.notas)) : p.cargo}
            </span>
          </span>
          {p.notas && <span style={{ width: 90, flex: 'none' }}><FaixaDisc n={p.notas} altura={12} /></span>}
        </Link>
      ))}
    </div>
  )

  return (
    <Cartao titulo="Perfil DISC do setor" Icone={Shapes} sub={sub} className={d.cores}>
      {com.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--n-text-2)', lineHeight: 1.5 }}>
          Nenhum resultado DISC registrado ainda. O registro é feito no botão <b>DISC</b>, no topo da ficha de cada pessoa.
          {sem.length > 0 && (
            <>
              <button type="button" className={d.linhaSetor} onClick={() => setAberto(aberto === 'sem' ? null : 'sem')} style={{ marginTop: 10 }}>
                <span className={d.letra} style={{ background: 'var(--n-card-2)', color: 'var(--n-text-3)' }}>–</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Quem falta registrar</span>
                <span className="cnum" style={{ fontWeight: 800 }}>{sem.length}</span>
              </button>
              {aberto === 'sem' && listaDe(sem)}
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.7px', textTransform: 'uppercase', color: 'var(--n-text-3)', marginBottom: 8 }}>A mistura do setor · pessoas por perfil predominante</div>
            <FaixaDisc n={peso} altura={32} />
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {FATORES.map((f) => {
                const q = porFator[f].length
                return (
                  <div key={f}>
                    <button type="button" className={d.linhaSetor} onClick={() => q && setAberto(aberto === f ? null : f)} disabled={!q}
                      style={{ cursor: q ? 'pointer' : 'default' }} aria-expanded={aberto === f}>
                      <span className={d.letra} style={{ background: corDe(f), color: tintaSobre(f) }}>{f}</span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{PERFIS[f].nome}</span>
                        <span style={{ fontSize: 11.5, color: 'var(--n-text-3)' }}> · {PERFIS[f].apelido}{q > 0 && <> · {Math.round(pctPessoas(f))}% do setor</>}</span>
                        <span style={{ display: 'block', height: 5, background: 'var(--n-card-2)', borderRadius: 99, overflow: 'hidden', marginTop: 5 }}>
                          <span style={{ display: 'block', width: `${(q / maxLinha) * 100}%`, height: '100%', background: corDe(f), borderRadius: 99 }} />
                        </span>
                      </span>
                      <span style={{ textAlign: 'right' }}>
                        <span className="cnum" style={{ fontSize: 16, fontWeight: 800 }}>{q}</span>
                        <span style={{ display: 'block', fontSize: 10.5, color: 'var(--n-text-3)' }}>{q === 1 ? 'pessoa' : 'pessoas'}</span>
                      </span>
                    </button>
                    {aberto === f && listaDe(porFator[f])}
                  </div>
                )
              })}
              {sem.length > 0 && (
                <div>
                  <button type="button" className={d.linhaSetor} onClick={() => setAberto(aberto === 'sem' ? null : 'sem')} aria-expanded={aberto === 'sem'}>
                    <span className={d.letra} style={{ background: 'var(--n-card-2)', color: 'var(--n-text-3)' }}>–</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-text-2)' }}>Sem DISC registrado</span>
                    <span className="cnum" style={{ fontSize: 16, fontWeight: 800, color: 'var(--n-text-2)', textAlign: 'right' }}>{sem.length}</span>
                  </button>
                  {aberto === 'sem' && listaDe(sem)}
                </div>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--n-text-3)', marginTop: 8, lineHeight: 1.45 }}>
              Conta pelo perfil predominante de cada pessoa.{empates > 0 && <> {empates === 1 ? '1 pessoa empatou' : `${empates} pessoas empataram`} em dois perfis: {empates === 1 ? 'aparece' : 'aparecem'} nas duas listas e {empates === 1 ? 'vale' : 'valem'} meia em cada cor da barra.</>}
            </div>
          </div>

          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.7px', textTransform: 'uppercase', color: 'var(--n-text-3)' }}>Como lidar com cada perfil</div>
            <div className={d.bloco} style={{ padding: 14 }}>
              <QuadroPerfis ordem={ordem} destaques={maisComum}
                notaFora={(f) => peso[f] > 0 ? `${porFator[f].length} ${porFator[f].length === 1 ? 'pessoa' : 'pessoas'} no setor` : 'ninguém do setor com este perfil predominante'} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--n-text-3)', lineHeight: 1.45 }}>
              ★ o perfil que mais aparece no setor. Nenhuma mistura é melhor que outra; um setor com muitos iguais tende a ter os mesmos pontos cegos.
            </div>
          </div>
        </div>
      )}
    </Cartao>
  )
}
