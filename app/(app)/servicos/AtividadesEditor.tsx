'use client'
import { useEffect, useState } from 'react'
import { Activity, RotateCcw, Check } from 'lucide-react'

/* ============================================================
   A RÉGUA DE ATIVIDADES — quanto vale cada ação dos sistemas do Nexus.

   A terceira metade da pontuação, ao lado do catálogo de serviços e da régua
   disciplinar. Hoje cada atividade vale 1 (a "Atividade no período" da lista do
   setor é a soma crua); aqui o gestor dá a cada tipo o valor que decidir.

   ⚠️ A tela mostra só os tipos em que o SETOR tem volume, e o valor padrão (1)
   vem marcado como PROVISÓRIO até alguém confirmar — a mesma honestidade do
   fator de serviço: um padrão exibido como decisão é uma decisão que ninguém
   tomou.
   ============================================================ */

type Atividade = {
  chave: string; label: string; sistema: string; descricao: string
  volume: number; pessoas: number
  pontos: number; ajustado: boolean
  ajustadoPor: string | null; ajustadoEm: string | null
  pontosNaEpoca: number | null; revisado: boolean
}

const dataBr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—')

export default function AtividadesEditor({ departmentId, setorNome }: { departmentId: string; setorNome: string }) {
  const [ativs, setAtivs] = useState<Atividade[]>([])
  const [padrao, setPadrao] = useState(1)
  const [carregando, setCarregando] = useState(true)
  const [rascunho, setRascunho] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState<Record<string, boolean>>({})
  const [msg, setMsg] = useState<string | null>(null)

  async function carregar() {
    setCarregando(true)
    try {
      const r = await fetch(`/api/servicos/atividades?departmentId=${departmentId}`, { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) { setMsg(d.error ?? 'Não consegui ler as atividades.'); setAtivs([]); return }
      setAtivs(d.atividades ?? []); setPadrao(d.padrao ?? 1); setRascunho({})
    } finally { setCarregando(false) }
  }
  useEffect(() => { carregar() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [departmentId])

  async function salvar(a: Atividade, campo: 'pontos' | 'limpar' | 'revisar', valor: number | null) {
    setSalvando((v) => ({ ...v, [a.chave]: true }))
    try {
      const r = await fetch('/api/servicos/atividades', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId, atividade: a.chave, campo, valor, pontosAtual: a.pontos }),
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
  const naoRevisadas = ativs.filter((a) => !a.revisado).length

  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Activity size={16} color="var(--chart-2)" />
        <div style={{ fontSize: 14, fontWeight: 600 }}>Pontos por atividade — {setorNome}</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14, lineHeight: 1.55 }}>
        Cada ação dos sistemas do Nexus (chamado resolvido, curso, alteração no CIDE…) vale pontos que somam na
        pontuação do mês, ao lado dos serviços da planilha. <b>Hoje cada uma vale {padrao}</b> — mude o que fizer
        sentido para este setor. O volume é da <b>vida inteira</b>, não do período, porque o peso do tipo é
        característica dele.
        {naoRevisadas > 0 && <> · <b style={{ color: 'var(--warning)' }}>{naoRevisadas} no valor provisório</b></>}
      </div>

      {msg && <div style={{ fontSize: 12.5, color: 'var(--danger)', marginBottom: 12 }}>{msg}</div>}

      {carregando ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Somando as atividades do setor…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {ativs.map((a) => {
            const r = rascunho[a.chave] ?? String(a.pontos)
            return (
              <div key={a.chave} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 84px 96px 30px 30px', gap: 12, alignItems: 'center', padding: '9px 6px', borderBottom: '1px solid var(--border)', opacity: salvando[a.chave] ? 0.55 : 1, transition: 'opacity .12s' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.descricao}>
                    {a.label}
                    {!a.revisado && <span style={{ marginLeft: 7, fontSize: 10, color: 'var(--warning)', fontWeight: 600 }}>provisório</span>}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>{a.sistema}</div>
                </div>
                <span style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}
                  title={`${a.pessoas} ${a.pessoas === 1 ? 'pessoa' : 'pessoas'} do setor · vida inteira`}>
                  {a.volume.toLocaleString('pt-BR')}
                </span>
                <input
                  type="number" value={r}
                  onChange={(e) => setRascunho((x) => ({ ...x, [a.chave]: e.target.value }))}
                  onBlur={() => { const v = parseInt(r || '', 10); if (Number.isFinite(v) && v !== a.pontos) salvar(a, 'pontos', v) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                  title={a.ajustado ? `Definido por ${a.ajustadoPor} em ${dataBr(a.ajustadoEm)}.` : `Valor provisório (padrão ${padrao}).`}
                  style={{ height: 30, width: '100%', textAlign: 'right', padding: '0 8px', background: 'var(--surface-2)', border: `1px solid ${a.ajustado ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }}
                />
                <button onClick={() => salvar(a, 'revisar', null)} disabled={a.revisado}
                  title={a.revisado ? `Conferido por ${a.ajustadoPor ?? '—'}.` : 'Conferi, e este valor está certo.'}
                  style={{ height: 28, width: 28, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', borderRadius: 6, color: a.revisado ? 'var(--success)' : 'var(--warning)', cursor: a.revisado ? 'default' : 'pointer' }}>
                  <Check size={14} />
                </button>
                <button onClick={() => salvar(a, 'limpar', null)} disabled={!a.ajustado}
                  title={a.ajustado ? `Voltar ao padrão (${padrao})` : 'Está no padrão'}
                  style={{ height: 28, width: 28, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', borderRadius: 6, color: a.ajustado ? 'var(--text-dim)' : 'var(--border)', cursor: a.ajustado ? 'pointer' : 'default' }}>
                  <RotateCcw size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
