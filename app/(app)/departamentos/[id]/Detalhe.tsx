'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { X } from 'lucide-react'
import { RecorteDoSetor, type SetorRecorte } from '@/lib/ui/recorte-setor'
import { usePeriod } from '@/lib/ui/period'

/* ============================================================
   A JANELA DE DETALHE de um sistema, dentro do relatório do setor.

   ⚠️⚠️ Pedido do dono (11/09/2026): gestor e sub só alcançam o relatório do
   próprio setor, e as páginas de resumo dos sistemas têm muito mais do que o
   cartão (tabela completa por pessoa, rankings por métrica, lista de cursos,
   série diária de atendimentos, saídas externas…). O "Ver detalhes" de cada
   cartão abre AQUI o resumo daquele sistema, só com o setor.

   ⚠️ O conteúdo é a PRÓPRIA página do sistema (`<sistema>/Resumo.tsx`) dentro
   de `RecorteDoSetor` — nunca uma cópia. Ver `lib/ui/recorte-setor.tsx`.

   ⚠️ Carregamento sob demanda (`next/dynamic`): são dez resumos, e o relatório
   não pode pagar o peso dos dez para quem não abre nenhum.

   ⚠️ A janela aberta vai para a URL (`?detalhe=classroom`). Clicar numa pessoa
   dentro dela leva à ficha; o "Voltar" da ficha volta pelo histórico — e sem a
   URL a janela que a pessoa estava lendo sumiria na volta.
   ============================================================ */

const carregando = () => <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: '24px 4px' }}>Carregando…</div>

export const DETALHES = {
  whatsapp: { titulo: 'Painel de Atendimento · WhatsApp', C: dynamic(() => import('../../whatsapp/Resumo'), { loading: carregando }) },
  chat: { titulo: 'Chat Interno', C: dynamic(() => import('../../chat/Resumo'), { loading: carregando }) },
  helpdesk: { titulo: 'HelpDesk', C: dynamic(() => import('../../helpdesk/Resumo'), { loading: carregando }) },
  classroom: { titulo: 'ClassRoom', C: dynamic(() => import('../../classroom/Resumo'), { loading: carregando }) },
  gerencia: { titulo: 'Gerência · mensageria', C: dynamic(() => import('../../gerencia/Resumo'), { loading: carregando }) },
  consultoria: { titulo: 'Consultoria Plus', C: dynamic(() => import('../../consultoria/Resumo'), { loading: carregando }) },
  cide: { titulo: 'CIDE', C: dynamic(() => import('../../cide/Resumo'), { loading: carregando }) },
  radio: { titulo: 'Rádio Itamarathy', C: dynamic(() => import('../../radio/Resumo'), { loading: carregando }) },
  assiduidade: { titulo: 'Assiduidade e disciplina', C: dynamic(() => import('../../assiduidade/Resumo'), { loading: carregando }) },
  turnover: { titulo: 'Turnover e movimentação', C: dynamic(() => import('../../turnover/Resumo'), { loading: carregando }) },
}
export type ChaveDetalhe = keyof typeof DETALHES
const ehChave = (s: string | null): s is ChaveDetalhe => !!s && s in DETALHES

/** Qual janela está aberta — espelhado em `?detalhe=` na URL. */
export function useDetalhe() {
  const [aberto, setAberto] = useState<ChaveDetalhe | null>(null)

  // Ao chegar (inclusive voltando da ficha pelo histórico), reabre o que estava aberto.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('detalhe')
    if (ehChave(q)) setAberto(q)
  }, [])

  /* ⚠️ `replaceState`, não `pushState`: abrir uma janela não é uma página nova.
     Com push, o "voltar" do navegador fecharia a janela em vez de sair da tela,
     e cada abrir-e-fechar empilharia duas entradas no histórico. */
  const escreve = (chave: ChaveDetalhe | null) => {
    const u = new URL(window.location.href)
    if (chave) u.searchParams.set('detalhe', chave); else u.searchParams.delete('detalhe')
    window.history.replaceState(null, '', u.pathname + u.search + u.hash)
  }
  const abrir = useCallback((chave: ChaveDetalhe) => { setAberto(chave); escreve(chave) }, [])
  const fechar = useCallback(() => { setAberto(null); escreve(null) }, [])
  return { aberto, abrir, fechar }
}

export function JanelaDetalhe({ chave, setor, onFechar }: { chave: ChaveDetalhe; setor: SetorRecorte; onFechar: () => void }) {
  const { label } = usePeriod()
  const painel = useRef<HTMLDivElement>(null)
  const { titulo, C } = DETALHES[chave]

  // Esc fecha; o foco entra na janela, para o teclado (e o leitor de tela) saberem onde estão.
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', h)
    painel.current?.focus()
    return () => window.removeEventListener('keydown', h)
  }, [onFechar])

  return (
    <div onClick={onFechar}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: 'min(3vh, 24px) min(2vw, 24px)', zIndex: 60 }}>
      <div ref={painel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="detalhe-titulo"
        onClick={(e) => e.stopPropagation()} className="cpop"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-2)', width: 'min(1500px, 100%)', maxHeight: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', outline: 'none' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '18px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 3 }}>
              Detalhe do sistema · <b style={{ color: 'var(--text)' }}>{setor.nome}</b>
            </div>
            <div id="detalhe-titulo" style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.4px' }}>{titulo}</div>
            {/* ⚠️ Quem está dentro da conta, dito na cara: sem isto a janela parece
                a página da empresa, e o gestor lê um total do setor como da casa. */}
            <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginTop: 4 }}>
              Período: <b style={{ color: 'var(--text-dim)' }}>{label}</b>
              {' · '}{chave === 'turnover'
                ? `todas as pessoas que passaram por ${setor.nome}, inclusive quem saiu`
                : `só as pessoas ativas de ${setor.nome} — as mesmas do cartão`}
            </div>
          </div>
          <button onClick={onFechar} aria-label="Fechar" title="Fechar (Esc)" className="tc-btn"
            style={{ flex: 'none', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={17} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: 24 }}>
          <RecorteDoSetor setor={setor} incluiDesligados={chave === 'turnover'}>
            <C />
          </RecorteDoSetor>
        </div>
      </div>
    </div>
  )
}

/** O botão que abre a janela — o mesmo em todos os cartões, no mesmo lugar. */
export function BotaoDetalhe({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="tc-btn"
      title="Abrir o resumo completo deste sistema, só com este setor"
      style={{ marginLeft: 'auto', flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, height: 28, padding: '0 11px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-dim)', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
      Ver detalhes <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1 }}>›</span>
    </button>
  )
}
