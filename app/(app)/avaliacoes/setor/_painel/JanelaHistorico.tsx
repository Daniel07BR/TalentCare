'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { X, ChevronRight } from 'lucide-react'
import { competenciaLabel } from '@/lib/avaliacoes/criterios'
import s from '../../../_visao/visao.module.css'
import p from './painel.module.css'
import { Selo, cor, type NivelKey } from './graficos'

/* ============================================================
   A JANELA "HISTÓRICO" (02/10/2026) — pedido do Daniel: "o botão histórico
   abrir uma nova janela listando todas as avaliações já feitas, para clicar e
   acessar". Abre POR CIMA da janela da pessoa; cada linha leva à tela daquela
   avaliação (para ler, corrigir ou anexar o documento assinado).

   Todas, sem limite de meses (`/api/avaliacoes/[id]/historico`). Só o nome do
   nível. Rascunho só para quem pode avaliar.
   ============================================================ */

type Item = {
  competencia: string; status: string; nivel: NivelKey | null; versao: number
  publicadaEm: string | null; avaliador: string; ciente: boolean; comentou: boolean; concluidaEm: string | null
}

export function JanelaHistorico({ pessoaId, nome, onFechar }: { pessoaId: string; nome: string; onFechar: () => void }) {
  const [itens, setItens] = useState<Item[] | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let vivo = true
    fetch(`/api/avaliacoes/${pessoaId}/historico`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j: { avaliacoes: Item[] }) => vivo && setItens(j.avaliacoes))
      .catch(() => vivo && setErro(true))
    return () => { vivo = false }
  }, [pessoaId])

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); onFechar() } }
    // Captura: fecha ESTA janela antes de a da pessoa ouvir o mesmo Esc.
    window.addEventListener('keydown', tecla, true)
    return () => window.removeEventListener('keydown', tecla, true)
  }, [onFechar])

  const assinadas = itens?.filter((i) => i.concluidaEm).length ?? 0

  return createPortal(
    <div className={`${s.paleta} ${p.niveis} ${p.fundoJanela}`} style={{ zIndex: 1010, background: 'rgba(15, 23, 42, .35)' }} onClick={onFechar} role="presentation">
      <div className={p.janela} style={{ width: 'min(680px, 100%)' }} role="dialog" aria-modal="true" aria-label={`Histórico de ${nome}`} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={p.fechar} onClick={onFechar} aria-label="Fechar"><X size={18} /></button>
        <header style={{ marginBottom: 14, paddingRight: 40 }}>
          <h2 className={p.janelaNome}>Histórico de avaliações</h2>
          <div className={p.janelaSub}>
            {nome}{itens ? ` · ${itens.length} ${itens.length === 1 ? 'avaliação' : 'avaliações'} · ${assinadas} ${assinadas === 1 ? 'assinada' : 'assinadas'}` : ''}
          </div>
        </header>

        {!itens ? (
          <div className={p.vazio}>{erro ? 'Não foi possível carregar.' : 'Carregando…'}</div>
        ) : itens.length === 0 ? (
          <div className={p.vazio}>Nenhuma avaliação feita ainda.</div>
        ) : (
          <div className={p.historico}>
            {itens.map((i) => {
              const rascunho = i.status !== 'publicada'
              return (
                <Link key={i.competencia} href={`/avaliacoes/${pessoaId}?competencia=${i.competencia}`} className={p.historicoItem}
                  style={{ ['--c' as string]: rascunho ? 'var(--n-border)' : cor(i.nivel) }}>
                  <span className={p.historicoMes}>{competenciaLabel(i.competencia)}</span>
                  {rascunho
                    ? <span className={p.sinal} style={{ ['--c' as string]: 'var(--lv-parte)' }}>rascunho</span>
                    : <Selo nivel={i.nivel} />}
                  <span className={p.historicoMeta}>
                    {rascunho ? `salvo por ${i.avaliador}` : `por ${i.avaliador}${i.publicadaEm ? ` em ${new Date(i.publicadaEm).toLocaleDateString('pt-BR')}` : ''}${i.versao > 1 ? ` · v${i.versao}` : ''}`}
                  </span>
                  <span className={p.historicoEstado}>
                    {!rascunho && (i.concluidaEm ? '🔒 assinada' : '✎ falta assinar')}
                    {!rascunho && (i.ciente ? ' · ✓ ciência' : ' · sem ciência')}
                    {i.comentou && ' · 💬'}
                  </span>
                  <ChevronRight size={16} color="var(--n-text-3)" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
