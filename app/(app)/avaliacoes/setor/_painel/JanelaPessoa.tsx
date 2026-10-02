'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { X, ClipboardPen, History, Maximize2 } from 'lucide-react'
import { competenciaAnterior, competenciaLabel } from '@/lib/avaliacoes/criterios'
import Avatar from '../../../Avatar'
import s from '../../../_visao/visao.module.css'
import p from './painel.module.css'
import { LinhaNivel, MapaPontos, Selo, type NivelKey } from './graficos'
import { JanelaHistorico } from './JanelaHistorico'
import { itensDoCombinado } from '@/lib/avaliacoes/metodo'

/* ============================================================
   A JANELA DA PESSOA (02/10/2026) — pedido do Daniel: "clicar no funcionário e
   abrir uma janela centralizada, personalizada com resultados e gráficos dele,
   com o botão de realizar a avaliação do mês".

   Lê a mesma rota da página da pessoa (`/api/avaliacoes/painel/pessoa`) e
   mostra o essencial: último resultado, rumo, assinadas, a média no tempo, os
   três pontos mês a mês e o último recado/combinado. Dali: AVALIAR o mês, ou o
   histórico completo.

   ⚠️ Portal no <body> com a paleta reaplicada (`s.paleta` + `p.niveis`): dentro
   da página, um ancestral com `transform` (a animação de entrada) prenderia o
   `position: fixed` e a janela sairia fora do centro.
   ⚠️ O botão "Avaliar" só aparece para quem PODE avaliar a pessoa (`posso`,
   mesma régua da fila e da rota).
   ============================================================ */

type Av = {
  competencia: string; nivel: NivelKey | null
  notas: { criterio: string; label: string; nivel: NivelKey | null; justificativa: string | null }[]
  recado: string | null; combinado: string | null; concluidaEm: string | null
  gestao: { emRisco: boolean | null; prontoParaMais: boolean | null; querNaEquipe: boolean | null } | null
}
type Dados = {
  pessoa: { id: string; nome: string; cargo: string; setor: string; hasAvatar: boolean }
  meses: string[]; avaliacoes: Av[]
}

const iniciais = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()
const ORDEM = ['abaixo', 'parte', 'atende', 'acima']

export function JanelaPessoa({ setorEndereco, pessoaEndereco, posso, url, onFechar }: {
  setorEndereco: string; pessoaEndereco: string; posso: boolean; url: string; onFechar: () => void
}) {
  const [d, setD] = useState<Dados | null>(null)
  const [erro, setErro] = useState(false)
  // A janela "Histórico", por cima desta. Ela mesma trata o Esc dela.
  const [historico, setHistorico] = useState(false)

  useEffect(() => {
    let vivo = true
    fetch(`/api/avaliacoes/painel/pessoa?setor=${encodeURIComponent(setorEndereco)}&pessoa=${encodeURIComponent(pessoaEndereco)}&meses=12`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j: Dados) => vivo && setD(j))
      .catch(() => vivo && setErro(true))
    return () => { vivo = false }
  }, [setorEndereco, pessoaEndereco])

  // Esc fecha; a página de trás não rola enquanto a janela está aberta.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', tecla)
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', tecla); document.body.style.overflow = antes }
  }, [onFechar])

  const competencia = competenciaAnterior()
  const doMes = d?.avaliacoes.find((a) => a.competencia === competencia) ?? null
  const ultima = d?.avaliacoes[0] ?? null
  const anterior = d?.avaliacoes[1] ?? null
  const rumo = ultima && anterior ? Math.sign(ORDEM.indexOf(ultima.nivel ?? '') - ORDEM.indexOf(anterior.nivel ?? '')) : null
  const porMes = new Map((d?.avaliacoes ?? []).map((a) => [a.competencia, a]))

  return createPortal(
    <div className={`${s.paleta} ${p.niveis} ${p.fundoJanela}`} onClick={onFechar} role="presentation">
      <div className={p.janela} role="dialog" aria-modal="true" aria-label={d ? `Avaliações de ${d.pessoa.nome}` : 'Avaliações'} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={p.fechar} onClick={onFechar} aria-label="Fechar"><X size={18} /></button>

        {!d ? (
          <div className={p.vazio}>{erro ? 'Não foi possível carregar.' : 'Carregando…'}</div>
        ) : (
          <>
            <header className={p.janelaTopo}>
              <Avatar id={d.pessoa.id} hasAvatar={d.pessoa.hasAvatar} initials={iniciais(d.pessoa.nome)} color="var(--n-blue)" size={56} radius={16} />
              <div style={{ minWidth: 0 }}>
                <h2 className={p.janelaNome}>{d.pessoa.nome}</h2>
                <div className={p.janelaSub}>{d.pessoa.cargo} · {d.pessoa.setor}</div>
              </div>
            </header>

            <div className={p.janelaTiles}>
              <div className={p.janelaTile}>
                <span className={p.tileRotulo}>Último resultado</span>
                {ultima ? <Selo nivel={ultima.nivel} /> : <span className={p.tileNota}>sem avaliação</span>}
                {ultima && <span className={p.tileNota} style={{ textTransform: 'capitalize' }}>{competenciaLabel(ultima.competencia)}</span>}
              </div>
              <div className={p.janelaTile}>
                <span className={p.tileRotulo}>Rumo</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: rumo === 1 ? 'var(--lv-atende)' : rumo === -1 ? 'var(--lv-abaixo)' : 'var(--n-text)' }}>
                  {rumo === 1 ? '↑ Subiu' : rumo === -1 ? '↓ Caiu' : rumo === 0 ? '→ Manteve' : '—'}
                </span>
              </div>
              <div className={p.janelaTile}>
                <span className={p.tileRotulo}>Meses · assinadas</span>
                <span style={{ fontSize: 18, fontWeight: 800 }}>{d.avaliacoes.length}<span style={{ color: 'var(--n-text-3)', fontWeight: 600 }}> · {d.avaliacoes.filter((a) => a.concluidaEm).length} 🔒</span></span>
              </div>
              {ultima?.gestao && (
                <div className={p.janelaTile}>
                  <span className={p.tileRotulo}>Gestão</span>
                  <span className={p.sinais}>
                    {ultima.gestao.emRisco && <span className={p.sinal} style={{ ['--c' as string]: 'var(--lv-abaixo)' }}>em risco</span>}
                    {ultima.gestao.prontoParaMais && <span className={p.sinal} style={{ ['--c' as string]: 'var(--lv-acima)' }}>pronto p/ mais</span>}
                    {ultima.gestao.querNaEquipe === false && <span className={p.sinal} style={{ ['--c' as string]: 'var(--lv-parte)' }}>retenção?</span>}
                    {!ultima.gestao.emRisco && !ultima.gestao.prontoParaMais && ultima.gestao.querNaEquipe !== false && <span className={p.tileNota}>sem alerta</span>}
                  </span>
                </div>
              )}
            </div>

            {d.avaliacoes.length > 0 && (
              <>
                <section className={p.janelaBloco}>
                  <h3 className={p.janelaTitulo}>A evolução ao longo do tempo</h3>
                  <LinhaNivel pontos={d.meses.map((c) => ({ competencia: c, nivel: porMes.get(c)?.nivel ?? null }))} />
                </section>
                <section className={p.janelaBloco}>
                  <h3 className={p.janelaTitulo}>Os três pontos, mês a mês</h3>
                  <MapaPontos meses={d.meses.slice(-6)} rotuloLarg={150} linhas={(ultima?.notas ?? []).map((cr) => ({
                    label: cr.label,
                    celulas: Object.fromEntries(d.meses.filter((c) => porMes.has(c)).map((c) => [c, { nivel: porMes.get(c)!.notas.find((x) => x.criterio === cr.criterio)?.nivel ?? null }])),
                  }))} />
                </section>
                {(ultima?.recado || ultima?.combinado) && (
                  <div className={p.textos} style={{ marginBottom: 16 }}>
                    {ultima.recado && <div className={p.texto} style={{ ['--t' as string]: 'var(--lv-acima)' }}><b>Último recado</b>{ultima.recado}</div>}
                    {ultima.combinado && <div className={p.texto} style={{ ['--t' as string]: 'var(--lv-atende)' }}><b>Combinados</b><ol style={{ margin: 0, paddingLeft: 18, whiteSpace: 'normal' }}>{itensDoCombinado(ultima.combinado).map((c, i) => <li key={i}>{c}</li>)}</ol></div>}
                  </div>
                )}
              </>
            )}

            {/* "Expandir gráficos" leva à página inteira da pessoa; "Histórico" abre a
                lista de TODAS as avaliações (Daniel, 02/10/2026). */}
            <footer className={p.janelaAcoes}>
              <Link href={url} className={p.botaoSec}><Maximize2 size={15} /> Expandir gráficos</Link>
              <button type="button" onClick={() => setHistorico(true)} className={p.botaoSec} style={{ cursor: 'pointer', fontFamily: 'inherit' }}>
                <History size={15} /> Histórico
              </button>
              {posso && (
                <Link href={`/avaliacoes/${d.pessoa.id}?competencia=${competencia}`} className={p.botaoPri}>
                  <ClipboardPen size={15} />
                  {doMes ? `Abrir a avaliação de ${competenciaLabel(competencia)}` : `Avaliar ${competenciaLabel(competencia)}`}
                </Link>
              )}
            </footer>
            {historico && <JanelaHistorico pessoaId={d.pessoa.id} nome={d.pessoa.nome} onFechar={() => setHistorico(false)} />}
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
