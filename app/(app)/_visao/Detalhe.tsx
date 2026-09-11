'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { X } from 'lucide-react'
import { RecorteDoSetor, RecorteDaFila, EmJanela, type SetorRecorte } from '@/lib/ui/recorte-setor'
import { usePeriod } from '@/lib/ui/period'
import { useTalentData } from '@/lib/ui/data'
import EsqueletoResumo from '../EsqueletoResumo'

/* ============================================================
   A JANELA DE DETALHE de um sistema — no relatório do setor (recortada) e no
   painel principal (a casa inteira, ou um setor pela barra dele).

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
  whatsapp: () => import('../whatsapp/Resumo'),
  chat: () => import('../chat/Resumo'),
  helpdesk: () => import('../helpdesk/Resumo'),
  classroom: () => import('../classroom/Resumo'),
  gerencia: () => import('../gerencia/Resumo'),
  consultoria: () => import('../consultoria/Resumo'),
  cide: () => import('../cide/Resumo'),
  radio: () => import('../radio/Resumo'),
  assiduidade: () => import('../assiduidade/Resumo'),
  turnover: () => import('../turnover/Resumo'),
  formacao: () => import('../formacao/Resumo'),
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
  formacao: { titulo: 'Escolaridade', C: dynamic(MODULOS.formacao, { loading: carregando }) },
}
/** Começa a baixar o código do resumo — chame no `onMouseEnter`/`onFocus` do sistema. */
export function precarregarDetalhe(chave: keyof typeof MODULOS) {
  void MODULOS[chave]().catch(() => {})
}
export type ChaveDetalhe = keyof typeof DETALHES
const ehChave = (s: string | null): s is ChaveDetalhe => !!s && s in DETALHES

/** Qual janela está aberta — espelhado em `?detalhe=` (e `&detalheSetor=`) na URL.
 *
 *  ⚠️ O painel principal abre a MESMA janela de dois jeitos: a casa inteira (o
 *  bloco do sistema) e um setor só (a barra daquele setor). O setor vai junto na
 *  URL, senão voltar da ficha reabriria a janela da casa no lugar da do setor.
 *  No relatório do setor o `setorId` é ignorado — o setor é o da página. */
export function useDetalhe() {
  const [estado, setEstado] = useState<{ chave: ChaveDetalhe; setorId: string | null; fila: string | null } | null>(null)

  // Ao chegar (inclusive voltando da ficha pelo histórico), reabre o que estava aberto.
  useEffect(() => {
    const u = new URLSearchParams(window.location.search)
    const q = u.get('detalhe')
    if (ehChave(q)) setEstado({ chave: q, setorId: u.get('detalheSetor'), fila: u.get('detalheFila') })
  }, [])

  /* ⚠️ `replaceState`, não `pushState`: abrir uma janela não é uma página nova.
     Com push, o "voltar" do navegador fecharia a janela em vez de sair da tela,
     e cada abrir-e-fechar empilharia duas entradas no histórico. */
  const escreve = (chave: ChaveDetalhe | null, setorId: string | null, fila: string | null) => {
    const u = new URL(window.location.href)
    if (chave) u.searchParams.set('detalhe', chave); else u.searchParams.delete('detalhe')
    if (chave && setorId) u.searchParams.set('detalheSetor', setorId); else u.searchParams.delete('detalheSetor')
    if (chave && fila) u.searchParams.set('detalheFila', fila); else u.searchParams.delete('detalheFila')
    window.history.replaceState(null, '', u.pathname + u.search + u.hash)
  }
  /** `fila`: só o WhatsApp — a janela de UMA fila (a barra do painel principal). */
  const abrir = useCallback((chave: ChaveDetalhe, setorId: string | null = null, fila: string | null = null) => {
    setEstado({ chave, setorId, fila }); escreve(chave, setorId, fila)
  }, [])
  const fechar = useCallback(() => { setEstado(null); escreve(null, null, null) }, [])
  return { aberto: estado?.chave ?? null, setorId: estado?.setorId ?? null, fila: estado?.fila ?? null, abrir, fechar }
}

/**
 * ⚠️ `setor` OPCIONAL desde 11/09/2026: sem ele a janela é a CASA INTEIRA (o
 * painel principal). O conteúdo é o mesmo resumo, com o dataset inteiro — os
 * mesmos números da página do sistema —, e só o cabeçalho do resumo some.
 */
export function JanelaDetalhe({ chave, setor = null, comQuemSaiu = false, fila = null, onFechar }: {
  chave: ChaveDetalhe; setor?: SetorRecorte | null
  /** WhatsApp: a janela de UMA FILA (a barra do painel principal) — ver `RecorteDaFila`. */
  fila?: string | null
  /**
   * ⚠️⚠️ Inclui quem já SAIU do setor (painel principal, 11/09/2026). As barras
   * por setor do painel somam a atividade de TODO mundo do setor no período —
   * inclusive de quem saiu no meio dele —, e o relatório do setor soma só os
   * ativos. Aberta pela barra do painel, a janela tem de ter a população da
   * barra; senão o setor lê 12 na barra e 10 na janela.
   */
  comQuemSaiu?: boolean
  onFechar: () => void
}) {
  const { label, fromDay } = usePeriod()
  const data = useTalentData()
  const painel = useRef<HTMLDivElement>(null)
  const { titulo, C } = DETALHES[chave]
  /* ⚠️⚠️ QUEM JÁ SAIU E ENTRA NA CONTA, pelo nome (achado do crítico, 11/09/2026).
     Com `comQuemSaiu`, a janela soma gente que o relatório do setor não soma — em
     "Ano", o CIDE da Recepção dava 105 aqui e 42 lá (63 de quem saiu) —, e as
     listas dos resumos não marcam desligado. Dizer QUEM resolve a dúvida de quem
     compara as duas telas. Só entra quem saiu depois do começo da janela: quem
     saiu antes não tem atividade nela. */
  const quemSaiu = setor && comQuemSaiu
    ? data.employees
        .filter((e) => e.dept === setor.id && e.status === 'Desligado' && !!e.leftISO && e.leftISO.slice(0, 10) >= fromDay)
        .sort((a, b) => (a.leftISO ?? '').localeCompare(b.leftISO ?? ''))
    : []

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
              Detalhe do sistema · <b style={{ color: 'var(--text)' }}>{setor ? setor.nome : fila ? `Fila ${fila}` : 'Grupo Itamarathy'}</b>
            </div>
            <div id="detalhe-titulo" style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.4px' }}>{titulo}</div>
            {/* ⚠️ Quem está dentro da conta, dito na cara: sem isto a janela parece
                a página da empresa, e o gestor lê um total do setor como da casa. */}
            <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginTop: 4 }}>
              Período: <b style={{ color: 'var(--text-dim)' }}>{label}</b>
              {' · '}{fila
                ? `só os atendimentos que chegaram pela fila de ${fila} — os mesmos da barra do painel; quem atendeu pode ser de outro setor`
                : setor
                ? (chave === 'turnover'
                    ? `todas as pessoas que passaram por ${setor.nome}, inclusive quem saiu`
                    : comQuemSaiu
                      ? `as pessoas de ${setor.nome} no período, inclusive quem já saiu — as mesmas da barra do painel`
                      : `só as pessoas ativas de ${setor.nome} — as mesmas do cartão`)
                /* ⚠️⚠️ Na casa inteira, o Turnover é o de 12 MESES (saídas ÷ ativos) e
                   o cartão do painel é o do PERÍODO. São dois números de turnover na
                   mesma tela, e a janela tem de dizer qual é qual — não se cria uma
                   terceira conta para "fazer bater". */
                : chave === 'formacao'
                  ? 'a casa inteira, sem a Diretoria — as mesmas pessoas do cartão; retrato de hoje'
                : chave === 'turnover'
                  ? 'tudo nesta janela é de 12 meses e não acompanha o filtro — a taxa do cartão do painel é a do período'
                  : 'a casa inteira — os mesmos números da página do sistema'}
            </div>
            {quemSaiu.length > 0 && (
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 3 }}>
                Inclui {quemSaiu.length === 1 ? 'quem já saiu' : `${quemSaiu.length} pessoas que já saíram`}:{' '}
                {quemSaiu.map((e) => `${e.nome} (saiu em ${e.leftISO!.slice(0, 10).split('-').reverse().join('/')})`).join(', ')}.
              </div>
            )}
          </div>
          <button onClick={onFechar} aria-label="Fechar" title="Fechar (Esc)" className="tc-btn"
            style={{ flex: 'none', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={17} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: 24 }}>
          {/* `entrada`: cada seção do resumo sobe um pouco depois da de cima
              (globals.css) — a página se monta de cima para baixo. */}
          {fila ? (
            <RecorteDaFila fila={fila}><div className="entrada"><C /></div></RecorteDaFila>
          ) : setor ? (
            <RecorteDoSetor setor={setor} incluiDesligados={chave === 'turnover' || comQuemSaiu}>
              <div className="entrada"><C /></div>
            </RecorteDoSetor>
          ) : (
            <EmJanela><div className="entrada"><C /></div></EmJanela>
          )}
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
