'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { X } from 'lucide-react'
import { RecorteDoSetor, type SetorRecorte } from '@/lib/ui/recorte-setor'
import { usePeriod } from '@/lib/ui/period'
import EsqueletoResumo from '../../EsqueletoResumo'

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

/* ⚠️ Enquanto o código do resumo baixa, o MESMO esqueleto de quando os números
   ainda não chegaram — a janela não troca de cara duas vezes. */
const carregando = () => <EsqueletoResumo />

/* Os módulos de cada resumo, à parte do `dynamic`, para poder PRÉ-CARREGAR ao
   passar o mouse no sistema: quando o clique chega, o código já está aqui. */
const MODULOS = {
  whatsapp: () => import('../../whatsapp/Resumo'),
  chat: () => import('../../chat/Resumo'),
  helpdesk: () => import('../../helpdesk/Resumo'),
  classroom: () => import('../../classroom/Resumo'),
  gerencia: () => import('../../gerencia/Resumo'),
  consultoria: () => import('../../consultoria/Resumo'),
  cide: () => import('../../cide/Resumo'),
  radio: () => import('../../radio/Resumo'),
  assiduidade: () => import('../../assiduidade/Resumo'),
  turnover: () => import('../../turnover/Resumo'),
}

export const DETALHES = {
  whatsapp: { titulo: 'Painel de Atendimento · WhatsApp', C: dynamic(MODULOS.whatsapp, { loading: carregando }) },
  chat: { titulo: 'Chat Interno', C: dynamic(MODULOS.chat, { loading: carregando }) },
  helpdesk: { titulo: 'HelpDesk', C: dynamic(MODULOS.helpdesk, { loading: carregando }) },
  classroom: { titulo: 'ClassRoom', C: dynamic(MODULOS.classroom, { loading: carregando }) },
  gerencia: { titulo: 'Gerência · mensageria', C: dynamic(MODULOS.gerencia, { loading: carregando }) },
  consultoria: { titulo: 'Consultoria Plus', C: dynamic(MODULOS.consultoria, { loading: carregando }) },
  cide: { titulo: 'CIDE', C: dynamic(MODULOS.cide, { loading: carregando }) },
  radio: { titulo: 'Rádio Itamarathy', C: dynamic(MODULOS.radio, { loading: carregando }) },
  assiduidade: { titulo: 'Assiduidade e disciplina', C: dynamic(MODULOS.assiduidade, { loading: carregando }) },
  turnover: { titulo: 'Turnover e movimentação', C: dynamic(MODULOS.turnover, { loading: carregando }) },
}
/** Começa a baixar o código do resumo — chame no `onMouseEnter`/`onFocus` do sistema. */
export function precarregarDetalhe(chave: keyof typeof MODULOS) {
  void MODULOS[chave]().catch(() => {})
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
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'min(3vh, 24px) min(2vw, 24px)', zIndex: 60 }}>
      <div ref={painel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="detalhe-titulo"
        onClick={(e) => e.stopPropagation()} className="janela-detalhe"
        /* ⚠️ ALTURA FIXA desde o primeiro quadro: a janela nascia do tamanho de
           "Carregando…" e saltava para o tamanho da página — era o "pisca" que o
           dono leu como erro. Agora ela abre inteira e o conteúdo entra dentro. */
        style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-2)', width: 'min(1500px, 100%)', height: 'min(88vh, 980px)', maxHeight: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', outline: 'none' }}>

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
            {/* `entrada`: cada seção do resumo sobe um pouco depois da de cima
                (globals.css) — a página se monta de cima para baixo. */}
            <div className="entrada"><C /></div>
          </RecorteDoSetor>
        </div>
      </div>
    </div>
  )
}

/** O botão que abre a janela — o mesmo em todos os cartões, no mesmo lugar. */
export function BotaoDetalhe({ onClick, chave }: { onClick: () => void; chave?: ChaveDetalhe }) {
  return (
    <button type="button" onClick={onClick} className="tc-btn"
      onMouseEnter={chave ? () => precarregarDetalhe(chave) : undefined} onFocus={chave ? () => precarregarDetalhe(chave) : undefined}
      title="Abrir o resumo completo deste sistema, só com este setor"
      style={{ marginLeft: 'auto', flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, height: 28, padding: '0 11px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-dim)', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
      Ver detalhes <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1 }}>›</span>
    </button>
  )
}
