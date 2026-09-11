'use client'
import { useEffect, useState } from 'react'
import { Activity, RotateCcw, Check } from 'lucide-react'
import { SISTEMAS_ATIVIDADE } from '@/lib/servicos/sistemas-atividade'

/* ============================================================
   A RÉGUA DE ATIVIDADES — média de minutos × fator, como os serviços.

   Cada ação dos sistemas do Nexus vale `média em minutos × fator` — a mesma
   moeda dos serviços. Onde o sistema mede o tempo (WhatsApp, HelpDesk, Chat), a
   média vem da MEDIANA real, editável; onde não, o gestor informa, e até lá o
   tipo vale o piso de 1 ponto.
   ============================================================ */

type Ativ = {
  chave: string; label: string; sistema: string; descricao: string
  volume: number; pessoas: number
  mediaMedida: number | null; mediaEmUso: number | null; mediaAjustada: number | null
  pontos: number; pontosAuto: number; pontosAjustados: boolean
  ajustado: boolean; ajustadoPor: string | null; ajustadoEm: string | null; revisado: boolean
}

const dataBr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—')
const dur = (m: number | null) => (m == null ? '—' : m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? ' ' + String(m % 60).padStart(2, '0') : ''}`)
const COLS = 'minmax(0,1fr) 72px 96px 90px 30px 30px'

/* ⚠️⚠️ O QUE O "TEMPO MEDIDO" É, tarefa por tarefa (conferido na origem, 11/09/2026).
   WhatsApp, HelpDesk e Chat medem da ABERTURA ao FECHAMENTO — com fila, noite e a
   espera de quem pediu; não é tempo de trabalho. A Gerência é outra conta: a
   jornada do dia dividida pelos serviços — o deslocamento, para o mensageiro, É o
   trabalho (achado do crítico: dizer "com espera" ali levaria o gestor a cortar um
   tempo que está certo). */
const DECORRIDO = new Set(['wpp_finalizado', 'hd_resolvido', 'chat_cham_concluido'])
const comoMede = (chave: string) =>
  DECORRIDO.has(chave) ? 'tempo decorrido, da abertura ao fechamento, com espera' : 'jornada do dia ÷ serviços do dia, com o deslocamento'

export default function AtividadesEditor({ departmentId, setorNome }: { departmentId: string; setorNome: string }) {
  const [ativs, setAtivs] = useState<Ativ[]>([])
  const [fator, setFator] = useState(0.5)
  const [carregando, setCarregando] = useState(true)
  const [rascunho, setRascunho] = useState<Record<string, { media?: string; pontos?: string }>>({})
  const [salvando, setSalvando] = useState<Record<string, boolean>>({})
  const [msg, setMsg] = useState<string | null>(null)

  async function carregar() {
    setCarregando(true)
    try {
      const r = await fetch(`/api/servicos/atividades?departmentId=${departmentId}`, { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) { setMsg(d.error ?? 'Não consegui ler as atividades.'); setAtivs([]); return }
      setAtivs(d.atividades ?? []); setFator(d.fator ?? 0.5); setRascunho({})
    } finally { setCarregando(false) }
  }
  useEffect(() => { carregar() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [departmentId])

  async function salvar(a: Ativ, campo: 'media' | 'pontos' | 'limpar' | 'revisar', valor: number | null) {
    setSalvando((v) => ({ ...v, [a.chave]: true }))
    try {
      const r = await fetch('/api/servicos/atividades', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId, atividade: a.chave, campo, valor }),
      })
      const d = await r.json()
      if (!r.ok) { setMsg(d.error ?? 'Não consegui salvar.'); return }
      setMsg(null)
      if (d.atividade) setAtivs((xs) => xs.map((x) => (x.chave === d.atividade.chave ? d.atividade : x)))
      setRascunho((r2) => { const c = { ...r2 }; delete c[a.chave]; return c })
    } catch { setMsg('A rede falhou — recarregue para conferir.') }
    finally { setSalvando((v) => { const c = { ...v }; delete c[a.chave]; return c }) }
  }

  if (!carregando && !ativs.length) return null
  const semMedia = ativs.filter((a) => a.mediaEmUso == null).length
  /* ⚠️ A tela diz que o tempo decorrido não é tempo de trabalho — então a linha que
     ainda o usa (ninguém informou a média) é PENDENTE, como a "sem média". Não muda
     conta nenhuma; só não deixa passar calado (achado do crítico: "Chamado de T.I
     resolvido" usa 181 min em todo setor = 18 pontos por chamado). */
  const noDecorrido = ativs.filter((a) => a.mediaAjustada == null && a.mediaMedida != null && DECORRIDO.has(a.chave)).length
  // Os sistemas na ordem da lista; dentro de cada um, a tarefa mais feita primeiro.
  const grupos = SISTEMAS_ATIVIDADE
    .map((sis) => ({ ...sis, itens: ativs.filter((a) => a.sistema === sis.sistema) }))
    .filter((g) => g.itens.length > 0)
  // ⚠️ Um sistema novo em `atividades.ts` sem título aqui NÃO pode sumir da tela.
  const semGrupo = ativs.filter((a) => !SISTEMAS_ATIVIDADE.some((sis) => sis.sistema === a.sistema))
  if (semGrupo.length) grupos.push({ sistema: '—', titulo: 'Outros sistemas', oque: '', cor: 'var(--text-mute)', itens: semGrupo })

  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Activity size={16} color="var(--chart-2)" />
        <div style={{ fontSize: 14, fontWeight: 600 }}>Pontos por atividade — {setorNome}</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14, lineHeight: 1.55 }}>
        Cada tarefa vale <b>{fator} ponto por minuto</b> do tempo médio que o setor informar — a mesma conta dos serviços.
        {' '}<b>Os pontos não se digitam: saem sozinhos da média</b> (o ponto por minuto é o da régua geral, em Configurações).
        {/* ⚠️⚠️ O "tempo medido" é DECORRIDO, não de trabalho (conferido na origem em
            11/09/2026): WhatsApp e HelpDesk medem da abertura ao fechamento (fila, noite,
            espera do cliente); o Chat, em horário de expediente, da abertura à confirmação
            de quem pediu (4h28 medido × ~51 min entre assumir e concluir). Um gestor que lê
            "o sistema mede 4h28" como o tempo de trabalho dá 27 pontos a um chamado. */}
        {' '}Onde aparece “tempo decorrido”, o sistema mediu da <b>abertura ao fechamento</b> — com fila e espera, não só o
        trabalho: use como referência e informe o tempo real de trabalho.
        {' '}“Feitas (total)” é tudo o que as pessoas ativas hoje no setor já fizeram, desde que cada sistema começou a
        mandar dados (uns têm anos de histórico, outros meses) — não acompanha o período do topo.
        {semMedia > 0 && <> · <b style={{ color: 'var(--warning)' }}>{semMedia} sem média — valem o piso de 1</b></>}
        {noDecorrido > 0 && <> · <b style={{ color: 'var(--warning)' }}>{noDecorrido} usando o tempo decorrido — informe o tempo de trabalho</b></>}
      </div>

      {msg && <div style={{ fontSize: 12.5, color: 'var(--danger)', marginBottom: 12 }}>{msg}</div>}

      {carregando ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Medindo as atividades do setor…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: '0 6px 8px', borderBottom: '1px solid var(--border)', fontSize: 10.5, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--text-mute)' }}>
            <span>Tarefa</span>
            {/* ⚠️ Regra (b): este número NÃO obedece ao filtro de período do topo — é a
                vida inteira do setor (a média é característica da tarefa, não do mês).
                A tela diz isso no cabeçalho, e não só no `title`. */}
            <span style={{ textAlign: 'right' }} title="Desde o início do espelho, por todo o setor — não acompanha o período do topo">Feitas (total)</span>
            <span style={{ textAlign: 'right' }}>Média (min)</span>
            <span style={{ textAlign: 'right' }}>Pontos</span>
            <span /><span />
          </div>
          {/* ⚠️ POR SISTEMA (pedido do dono, 11/09/2026): "divida pelos sistemas, com um
              título e as tarefas abaixo" — o mesmo nome de tarefa ("Chamado aberto")
              existe em mais de um sistema e quer dizer coisas diferentes em cada um. */}
          {grupos.map((g) => (
          <section key={g.sistema} style={{ marginTop: 22 }}>
            {/* ⚠️ O TÍTULO DO SISTEMA centralizado, entre duas linhas da cor dele, e a
                mesma cor na borda das tarefas abaixo (pedido do dono, 11/09/2026: "está
                tudo muito misturado"). A cor é só marca de grupo — não diz nada do número. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 2px' }}>
              <span style={{ flex: 1, height: 2, background: g.cor, borderRadius: 2, opacity: .85 }} />
              <span style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: '.3px', textTransform: 'uppercase', color: g.cor, whiteSpace: 'nowrap' }}>{g.titulo}</span>
              <span style={{ flex: 1, height: 2, background: g.cor, borderRadius: 2, opacity: .85 }} />
            </div>
            {g.oque && <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 4, marginBottom: 6, lineHeight: 1.45, textAlign: 'center' }}>{g.oque}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', borderLeft: `3px solid ${g.cor}`, borderRadius: 2, paddingLeft: 6 }}>
            {g.itens.map((a) => {
              const rMedia = rascunho[a.chave]?.media ?? (a.mediaEmUso != null ? String(a.mediaEmUso) : '')
              const previstos = Math.max(1, Math.round((parseInt(rMedia || '0', 10) || 0) * fator))
              const mostrarPontos = rascunho[a.chave]?.media != null ? String(previstos) : String(a.pontos)
              return (
                <div key={a.chave} style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, alignItems: 'center', padding: '9px 6px', borderBottom: '1px solid var(--border)', opacity: salvando[a.chave] ? 0.55 : 1, transition: 'opacity .12s' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{a.label}</div>
                    {/* A descrição À VISTA (pedido do dono): o gestor precisa saber o que a
                        tarefa conta e quem recebe o crédito antes de dar o tempo médio. */}
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.45, marginTop: 1 }}>{a.descricao}</div>
                    {(a.mediaMedida != null || a.mediaEmUso == null) && (
                      <div style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 2 }}>
                        {a.mediaMedida != null && DECORRIDO.has(a.chave) && <>tempo decorrido medido: <b style={{ color: 'var(--text-dim)' }}>{dur(a.mediaMedida)}</b> (mediana, com espera)</>}
                        {a.mediaMedida != null && !DECORRIDO.has(a.chave) && <>o sistema calcula <b style={{ color: 'var(--text-dim)' }}>{dur(a.mediaMedida)}</b> (jornada do dia ÷ serviços, com o deslocamento)</>}
                        {a.mediaAjustada == null && a.mediaMedida != null && DECORRIDO.has(a.chave) && <> · <span style={{ color: 'var(--warning)' }}>em uso até alguém informar</span></>}
                        {a.mediaMedida == null && a.mediaEmUso == null && <span style={{ color: 'var(--warning)' }}>sem tempo — vale 1</span>}
                      </div>
                    )}
                  </div>
                  <span style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }} title={`${a.pessoas} ${a.pessoas === 1 ? 'pessoa' : 'pessoas'} · vida inteira`}>
                    {a.volume.toLocaleString('pt-BR')}
                  </span>
                  <input type="number" value={rMedia} placeholder={a.mediaMedida != null ? String(a.mediaMedida) : '—'}
                    onChange={(e) => setRascunho((x) => ({ ...x, [a.chave]: { ...x[a.chave], media: e.target.value, pontos: undefined } }))}
                    onBlur={() => { const v = rMedia === '' ? null : parseInt(rMedia, 10); if (v !== (a.mediaAjustada ?? null)) salvar(a, v == null ? 'limpar' : 'media', v) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                    title={a.mediaAjustada != null
                      /* ⚠️ Média gravada SEM autor = valor-padrão igual em todos os setores
                         (225 de 241, achado do crítico) — dizia "Lançado por null em —". */
                      ? (a.ajustadoPor ? `Lançado por ${a.ajustadoPor} em ${dataBr(a.ajustadoEm)}.` : 'Valor-padrão, gravado igual para todos os setores — ninguém do setor lançou nem conferiu.') + (a.mediaMedida != null ? `\nO sistema calcula ${a.mediaMedida} min (${comoMede(a.chave)}).` : '')
                      : a.mediaMedida != null ? `O sistema calcula ${a.mediaMedida} min (${comoMede(a.chave)}).${DECORRIDO.has(a.chave) ? ' Informe o tempo real de trabalho.' : ''}` : 'O sistema não mede o tempo desta tarefa — informe a média.'}
                    style={{ height: 30, width: '100%', textAlign: 'right', padding: '0 8px', background: 'var(--surface-2)', border: `1px solid ${a.mediaAjustada != null ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }}
                  />
                  {/* ⚠️ SÓ LEITURA (pedido do dono, 11/09/2026): média × ponto por minuto, com
                      piso de 1 — o que se ajusta é a média, ao lado. */}
                  <span title={`${rMedia || 0} min × ${fator} = ${mostrarPontos} (piso de 1)`}
                    style={{ height: 30, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 8px', color: 'var(--text)', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {mostrarPontos}
                  </span>
                  <button onClick={() => salvar(a, 'revisar', null)} disabled={a.revisado}
                    title={a.revisado ? `Conferido por ${a.ajustadoPor ?? '—'}.` : 'Conferi, e está certo.'}
                    style={{ height: 28, width: 28, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', borderRadius: 6, color: a.revisado ? 'var(--success)' : 'var(--warning)', cursor: a.revisado ? 'default' : 'pointer' }}>
                    <Check size={14} />
                  </button>
                  <button onClick={() => salvar(a, 'limpar', null)} disabled={!a.ajustado}
                    title={a.ajustado ? 'Voltar ao medido/padrão' : 'Está no valor medido'}
                    style={{ height: 28, width: 28, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', borderRadius: 6, color: a.ajustado ? 'var(--text-dim)' : 'var(--border)', cursor: a.ajustado ? 'pointer' : 'default' }}>
                    <RotateCcw size={13} />
                  </button>
                </div>
              )
            })}
          </div>
          </section>
          ))}
        </>
      )}
    </div>
  )
}
