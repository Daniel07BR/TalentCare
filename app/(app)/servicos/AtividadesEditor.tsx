'use client'
import { useEffect, useState } from 'react'
import { Activity, RotateCcw, Check } from 'lucide-react'

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

  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Activity size={16} color="var(--chart-2)" />
        <div style={{ fontSize: 14, fontWeight: 600 }}>Pontos por atividade — {setorNome}</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14, lineHeight: 1.55 }}>
        Cada atividade vale <b>{fator} ponto por minuto</b> da média — a mesma conta dos serviços. Onde o sistema mede o
        tempo (WhatsApp, HelpDesk, Chat), a média vem da <b>mediana medida</b>; nas outras, informe a média e os pontos
        se ajustam.
        {semMedia > 0 && <> · <b style={{ color: 'var(--warning)' }}>{semMedia} sem média — valem o piso de 1</b></>}
      </div>

      {msg && <div style={{ fontSize: 12.5, color: 'var(--danger)', marginBottom: 12 }}>{msg}</div>}

      {carregando ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Medindo as atividades do setor…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: '0 6px 8px', borderBottom: '1px solid var(--border)', fontSize: 10.5, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--text-mute)' }}>
            <span>Atividade</span>
            <span style={{ textAlign: 'right' }}>Feitas</span>
            <span style={{ textAlign: 'right' }}>Média (min)</span>
            <span style={{ textAlign: 'right' }}>Pontos</span>
            <span /><span />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {ativs.map((a) => {
              const rMedia = rascunho[a.chave]?.media ?? (a.mediaEmUso != null ? String(a.mediaEmUso) : '')
              const rPontos = rascunho[a.chave]?.pontos ?? String(a.pontos)
              const previstos = Math.max(1, Math.round((parseInt(rMedia || '0', 10) || 0) * fator))
              const mostrarPontos = rascunho[a.chave]?.pontos != null ? rPontos : (a.pontosAjustados && rascunho[a.chave]?.media == null ? String(a.pontos) : String(previstos))
              return (
                <div key={a.chave} style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, alignItems: 'center', padding: '9px 6px', borderBottom: '1px solid var(--border)', opacity: salvando[a.chave] ? 0.55 : 1, transition: 'opacity .12s' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.descricao}>{a.label}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>
                      {a.sistema}
                      {a.mediaMedida != null && <> · sistema mede <b style={{ color: 'var(--text-dim)' }}>{dur(a.mediaMedida)}</b> (mediana)</>}
                      {a.mediaMedida == null && a.mediaEmUso == null && <> · <span style={{ color: 'var(--warning)' }}>sem tempo — vale 1</span></>}
                    </div>
                  </div>
                  <span style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }} title={`${a.pessoas} ${a.pessoas === 1 ? 'pessoa' : 'pessoas'} · vida inteira`}>
                    {a.volume.toLocaleString('pt-BR')}
                  </span>
                  <input type="number" value={rMedia} placeholder={a.mediaMedida != null ? String(a.mediaMedida) : '—'}
                    onChange={(e) => setRascunho((x) => ({ ...x, [a.chave]: { ...x[a.chave], media: e.target.value, pontos: undefined } }))}
                    onBlur={() => { const v = rMedia === '' ? null : parseInt(rMedia, 10); if (v !== (a.mediaAjustada ?? null)) salvar(a, v == null ? 'limpar' : 'media', v) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                    title={a.mediaAjustada != null ? `Lançado por ${a.ajustadoPor} em ${dataBr(a.ajustadoEm)}.${a.mediaMedida != null ? `\nO sistema mede ${a.mediaMedida} min.` : ''}` : a.mediaMedida != null ? `Mediana medida pelo sistema (${a.mediaMedida} min). Pode sobrescrever.` : 'O sistema não mede o tempo desta atividade — informe a média.'}
                    style={{ height: 30, width: '100%', textAlign: 'right', padding: '0 8px', background: 'var(--surface-2)', border: `1px solid ${a.mediaAjustada != null ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }}
                  />
                  <input type="number" value={mostrarPontos}
                    onChange={(e) => setRascunho((x) => ({ ...x, [a.chave]: { ...x[a.chave], pontos: e.target.value } }))}
                    onBlur={() => { const v = parseInt(rPontos || '', 10); if (rascunho[a.chave]?.pontos != null && Number.isFinite(v) && v !== a.pontos) salvar(a, 'pontos', v) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                    title={a.pontosAjustados ? `Definido à mão. O cálculo dá ${a.pontosAuto}.` : `${a.mediaEmUso ?? 0} min × ${fator} = ${a.pontosAuto}`}
                    style={{ height: 30, width: '100%', textAlign: 'right', padding: '0 8px', background: 'var(--surface-2)', border: `1px solid ${a.pontosAjustados ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }}
                  />
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
        </>
      )}
    </div>
  )
}
