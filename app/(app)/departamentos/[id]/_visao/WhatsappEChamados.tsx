'use client'
import { useCallback, useEffect, useState } from 'react'
import { ArrowLeftRight, MessageCircle } from 'lucide-react'
import s from '../../../_visao/visao.module.css'
import { Cartao, Mini } from '../../../_visao/ui'
import { BotaoDetalhe } from '../../../_visao/Detalhe'
import { Estrelas } from '../../../whatsapp/AvaliacaoClientes'
import { dur, num } from './derivar'
import type { ComDetalhe } from './tipos'
import JanelaChamados, { type FaceChamados } from './JanelaChamados'

/* ============================================================
   A COLUNA DO MEIO DA 3ª LINHA do relatório do setor: o WhatsApp e os chamados
   entre setores (11/09/2026).

   ⚠️ Pedidos do dono no mesmo dia: "tire o card de avaliação mensal da tela do
   departamento; no espaço que vai se abrir, coloque acima dos chamados entre
   setores o resumo do WhatsApp, tirando assim o WhatsApp da barra inferior de
   sistemas e produtividade" e "chamados entre setores deveria ter um botão de
   ver detalhes".

   ⚠️ A avaliação mensal saiu DA TELA, não do sistema: `m.avaliacao` segue na rota
   (e o `ensaio-regua-geral` segue conferindo o número dela contra a lista). As
   avaliações se abrem pelo cartão "Avaliações" da janela de telas (Diretoria) e
   pelo chip da barra (gestor).
   ============================================================ */

/* ⚠️ A janela aberta vai para a URL (`?chamados=pediu|recebeu`), como a do
   "Ver detalhes": clicar numa pessoa leva à ficha, e o "voltar" da ficha tem de
   reabrir o que estava aberto. `replaceState` — abrir janela não é página nova. */
function useJanelaChamados() {
  const [face, setFace] = useState<FaceChamados | null>(null)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('chamados')
    if (q === 'pediu' || q === 'recebeu') setFace(q)
  }, [])
  const escreve = (f: FaceChamados | null) => {
    const u = new URL(window.location.href)
    if (f) u.searchParams.set('chamados', f); else u.searchParams.delete('chamados')
    window.history.replaceState(null, '', u.pathname + u.search + u.hash)
  }
  const abrir = useCallback((f: FaceChamados) => { setFace(f); escreve(f) }, [])
  const fechar = useCallback(() => { setFace(null); escreve(null) }, [])
  return { face, abrir, fechar }
}

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0)
const fmtNota = (x: number) => x.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export function WhatsappEChamados({ m, abrir }: ComDetalhe) {
  const w = m.whatsapp
  const gente = m.rankings.whatsapp.gente.filter((p) => p.valor > 0).slice(0, 3)
  const temWpp = w.abertos > 0 || w.finalizados > 0
  const media = w.avaliados && w.notaSum != null ? w.notaSum / w.avaliados : null
  const cs = m.chamadosDoSetor
  // ⚠️ Qualquer uma das cinco colunas (achado do crítico): com só concluídos ou
  // cancelados na janela, o cartão dizia "nenhum chamado" e escondia o que conta na nota.
  const temChamado = !!cs && (cs.pediu + cs.pediuConcluidos + cs.recebeu + cs.recebeuConcluidos + cs.cancelados) > 0
  const janela = useJanelaChamados()

  return (
    <div className={s.pilha}>
      {/* O RESUMO DO WHATSAPP — as pessoas ativas do setor, casadas por nome (a mesma
          população da janela "Ver detalhes" e do Top atendentes). */}
      <Cartao titulo="WhatsApp" Icone={MessageCircle} corIcone="var(--n-whats)"
        sub={`Atendimentos das pessoas do setor · ${m.label}`}
        acao={<BotaoDetalhe onClick={() => abrir('whatsapp')} chave="whatsapp" titulo="Abrir o resumo do WhatsApp só com este setor" />}>
        {!temWpp ? (
          <div style={{ fontSize: 12.5, color: 'var(--n-text-2)' }}>Nenhum atendimento de WhatsApp das pessoas do setor no período.</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
              <Mini valor={num(w.abertos)} rotulo="Atendimentos abertos" tom="whats" onClick={() => abrir('whatsapp')} />
              <Mini valor={num(w.finalizados)} rotulo="Finalizados" tom="green" onClick={() => abrir('whatsapp')} />
              <Mini valor={w.finalizados ? dur(Math.round(w.handleSum / w.finalizados)) : '—'} rotulo="Tempo médio" onClick={() => abrir('whatsapp')} />
            </div>
            {gente.length > 0 && (
              /* ⚠️ Rótulo dito (achado do crítico): o ranking do setor é por FINALIZADOS, e o
                 Top atendentes da janela é por abertos — sem dizer, a mesma pessoa aparecia
                 com dois números. */
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--n-text-3)', margin: '12px 0 5px' }}>Quem mais finalizou</div>
            )}
            {gente.length > 0 && (
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {gente.map((p, i) => (
                  <li key={p.id} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                    <span style={{ color: 'var(--n-text-3)', width: 10 }}>{i + 1}</span>
                    <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</span>
                    <b className="cnum" style={{ color: 'var(--n-whats)' }}>{num(p.valor)}</b>
                  </li>
                ))}
              </ol>
            )}
            {/* ⚠️ A avaliação do cliente numa linha: "pediu" mede o atendente, "avaliados"
                mede o cliente. "—" quando nenhum dia foi conferido (não "0 pedidos"). */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 12px', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--n-border-2)', fontSize: 11.5, color: 'var(--n-text-2)' }}>
              {w.verificados ? (
                <>
                  {/* ⚠️ Sem o nº de conferidos ao lado dos "Finalizados" (achado do crítico):
                      o espelho dos finalizados perdeu 15–24% em jun–set e a conferência vem
                      completa do OneCode — lado a lado, "1.144 finalizados" e "de 1.302"
                      brigariam. O % é sobre os conferidos; o denominador está no `title`. */}
                  <span title={`Em ${num(w.pedidos ?? 0)} de ${num(w.verificados)} atendimentos conferidos no OneCode`}>
                    Pediu avaliação em <b style={{ color: 'var(--n-text)' }}>{num(w.pedidos ?? 0)}</b> atendimentos ({pct(w.pedidos ?? 0, w.verificados)}%)
                  </span>
                  <span><b style={{ color: 'var(--n-text)' }}>{num(w.avaliados ?? 0)}</b> {w.avaliados === 1 ? 'avaliado' : 'avaliados'}</span>
                  {media != null && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Estrelas media={media} tamanho={12} /> <b style={{ color: 'var(--n-text)' }}>{fmtNota(media)}</b>
                    </span>
                  )}
                </>
              ) : (
                <span>Avaliação do cliente: nenhum dia deste período conferido no OneCode.</span>
              )}
            </div>
          </>
        )}
      </Cartao>

      {/* ⚠️ CLICÁVEL (pedido do dono, 11/09/2026): cada número — e o "Ver detalhes" —
          abre QUEM, QUANTOS e de/para QUAL setor; ver `JanelaChamados.tsx`. O bloco do
          Chat Interno em "Sistemas e produtividade" saiu: o que ele tinha de chamado
          está aqui. */}
      <Cartao titulo="Chamados entre setores" Icone={ArrowLeftRight}
        sub="Duas faces do mesmo pedido — não se somam"
        acao={temChamado ? <BotaoDetalhe onClick={() => janela.abrir('pediu')} titulo="Ver quem pediu e quem atendeu, de e para qual setor" /> : undefined}>
        {!temChamado || !cs ? (
          <div style={{ fontSize: 12.5, color: 'var(--n-text-2)' }}>Nenhum chamado entre setores no período.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
            <Mini valor={cs.pediu} rotulo="Pediu aos outros" tom="blue" onClick={() => janela.abrir('pediu')} />
            {/* ⚠️ "Desses" dizia mais do que a conta: é o que o setor pediu e foi
                CONCLUÍDO no período (pelo dia da conclusão), não só dos pedidos acima. */}
            <Mini valor={cs.pediuConcluidos} rotulo="Pedidos concluídos" tom="blue" onClick={() => janela.abrir('pediu')} />
            <Mini valor={cs.recebeu} rotulo="Recebeu para atender" tom="purple" onClick={() => janela.abrir('recebeu')} />
            <Mini valor={cs.recebeuConcluidos} rotulo="Concluiu" tom="green" onClick={() => janela.abrir('recebeu')} />
            <Mini valor={cs.cancelados} rotulo="Cancelados (fora da média)" tom="red" onClick={() => janela.abrir('recebeu')} />
            <Mini valor={cs.recebeuConcluidos ? dur(Math.round(cs.segundos / cs.recebeuConcluidos), 10) : '—'} rotulo="Tempo médio · só expediente" onClick={() => janela.abrir('recebeu')} />
          </div>
        )}
      </Cartao>
      {janela.face && cs && (
        <JanelaChamados setor={{ id: m.setor.id, nome: m.setor.nome }} face={janela.face} onTrocar={janela.abrir} onFechar={janela.fechar}
          cartao={{ pediu: cs.pediu, pediuConcluidos: cs.pediuConcluidos, recebeu: cs.recebeu, recebeuConcluidos: cs.recebeuConcluidos, cancelados: cs.cancelados }} />
      )}
    </div>
  )
}
