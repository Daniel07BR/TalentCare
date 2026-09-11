'use client'
import { useEffect, useState } from 'react'
import { Scale } from 'lucide-react'
import { pesosDoSetor, type ParametrosGerais } from '@/lib/servicos/regra-geral'

/* ============================================================
   A RÉGUA GERAL DE PONTUAÇÃO — a aba de Configurações (11/09/2026).

   Pedido do dono: "a regra geral — quanto vale o minuto, penalidade etc. — em
   Configurações, universal, valendo para todos os departamentos, e só eu e a
   Diretoria podemos alterar". Com o peso PROPORCIONAL que ele escolheu: uma falta
   custa uma fração do que o setor costuma pontuar (senão, medido em 08/09, 32 de
   95 pessoas ficavam com nota negativa).

   ⚠️ Salvar exige ter visto a PRÉVIA com os mesmos números: o que vai mudar em
   cada setor aparece antes de confirmar, como na importação do ponto. E salvar
   não mexe em mês já pontuado — cria uma versão com vigência.
   ============================================================ */

type Versao = ParametrosGerais & { id: string; vigenteDesde: string; competenciaReferencia: string; criadoPor: string; criadoEm: string; motivo: string | null }
type Linha = { id: string; nome: string; n: number; mediana: number; usouCasa: boolean; pesos: Record<string, number>; atual: Record<string, number> | null }

const COLUNAS: [string, string][] = [
  ['atraso', 'Atraso'], ['advertencia', 'Advertência'], ['mes_sem_ocorrencia', 'Mês limpo'],
  ['suspensao', 'Suspensão'], ['lgpd_advertencia', 'Adv. LGPD'], ['lgpd_suspensao', 'Susp. LGPD'],
]
const chave = (g: ParametrosGerais) => JSON.stringify(g)
const pct = (f: number) => Math.round(f * 1000) / 10

export default function ReguaGeral() {
  const [g, setG] = useState<ParametrosGerais | null>(null)
  const [versoes, setVersoes] = useState<Versao[]>([])
  const [compAtual, setCompAtual] = useState('')
  const [referencia, setReferencia] = useState('')
  const [vigencia, setVigencia] = useState('')
  const [motivo, setMotivo] = useState('')
  const [previa, setPrevia] = useState<{ para: string; linhas: Linha[]; medianaCasa: number } | null>(null)
  const [ocupado, setOcupado] = useState<'previa' | 'salvar' | null>(null)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const carregar = () =>
    fetch('/api/regra-geral', { cache: 'no-store' })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error ?? 'erro'); return d })
      .then((d) => {
        const p = d.parametros
        setG({
          base: p.base, fatorPorMinuto: p.fatorPorMinuto, fracaoAtraso: p.fracaoAtraso,
          multAdvertencia: p.multAdvertencia, multMesLimpo: p.multMesLimpo, multSuspensao: p.multSuspensao,
          multLgpdAdvertencia: p.multLgpdAdvertencia, multLgpdSuspensao: p.multLgpdSuspensao,
          pontosAbonado: p.pontosAbonado, pontosServico: p.pontosServico,
        })
        setVersoes(d.versoes ?? []); setCompAtual(d.competenciaAtual); setReferencia(d.referencia)
        setVigencia((v) => v || d.competenciaAtual)
      })
      .catch((e) => setMsg({ tipo: 'erro', texto: `Não consegui ler a régua geral: ${(e as Error).message}` }))
  useEffect(() => { carregar() }, [])

  if (!g) return <div className="tc-card" style={cartao}>{msg ? <span style={{ color: 'var(--danger)', fontSize: 13 }}>{msg.texto}</span> : <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Carregando a régua…</span>}</div>

  const muda = (k: keyof ParametrosGerais) => (v: number) => { setG({ ...g, [k]: v }); setMsg(null) }
  const previaEmDia = previa?.para === chave(g)

  async function verPrevia() {
    setOcupado('previa'); setMsg(null)
    const r = await fetch('/api/regra-geral', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...g, ensaio: true }) })
    const d = await r.json()
    setOcupado(null)
    if (!r.ok) { setMsg({ tipo: 'erro', texto: d.error ?? 'Não consegui calcular a prévia.' }); return }
    setPrevia({ para: chave(g!), linhas: d.linhas, medianaCasa: d.medianaCasa })
  }

  async function salvar() {
    setOcupado('salvar'); setMsg(null)
    const r = await fetch('/api/regra-geral', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...g, vigenteDesde: vigencia, motivo }) })
    const d = await r.json()
    setOcupado(null)
    if (!r.ok) { setMsg({ tipo: 'erro', texto: d.error ?? 'Não consegui salvar.' }); return }
    setMsg({ tipo: 'ok', texto: `Régua geral salva: vale a partir de ${d.vigencia} nos ${d.setores} setores. Os meses já pontuados não mudaram.` })
    setMotivo(''); setPrevia(null); carregar()
  }

  /* O setor típico, para a frase de exemplo: a mediana da casa (quando já veio). */
  const exemplo = previa?.medianaCasa ?? 700
  const ex = pesosDoSetor(g, exemplo)

  return (
    <div className="tc-card" style={cartao}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Scale size={16} color="var(--accent)" />
        <div style={{ fontSize: 14, fontWeight: 600 }}>Régua de pontuação — geral, para todos os setores</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16, lineHeight: 1.6 }}>
        Uma regra só para a casa. O <b>ponto por minuto</b> e a <b>base</b> valem igual em todo setor. As <b>faltas</b> pesam em
        proporção do que o setor costuma pontuar num mês — assim um atraso pesa o mesmo na nota de quem está no Legal e de quem está
        no Imóveis. Cada setor segue ajustando o tempo médio das próprias tarefas. <b>Só o dono do sistema e a Diretoria alteram
        esta régua</b>, e salvar não mexe em mês já pontuado.
      </div>

      <Grupo titulo="Serviço e base — iguais em todos os setores">
        <Campo label="Ponto por minuto de serviço" desc="× a duração média de cada tarefa" v={g.fatorPorMinuto} onChange={muda('fatorPorMinuto')} passo={0.01} />
        <Campo label="Base do mês" desc="pontos com que todo mundo começa" v={g.base} onChange={muda('base')} />
        <Campo label="Serviço concluído" desc="pontos fixos por serviço (além dos minutos)" v={g.pontosServico} onChange={muda('pontosServico')} />
      </Grupo>

      <Grupo titulo="Faltas — proporcionais ao mês típico do setor">
        <Campo label="Atraso" desc="% do que o setor costuma pontuar no mês" v={pct(g.fracaoAtraso)} sufixo="%" passo={0.1}
          onChange={(v) => muda('fracaoAtraso')(v / 100)} />
        <Campo label="Advertência" desc="× o atraso" v={g.multAdvertencia} sufixo="×" passo={0.1} onChange={muda('multAdvertencia')} />
        <Campo label="Suspensão por atraso" desc="× a ADVERTÊNCIA" v={g.multSuspensao} sufixo="×" passo={0.1} onChange={muda('multSuspensao')} />
        <Campo label="Mês sem ocorrência" desc="bônus: × o atraso" v={g.multMesLimpo} sufixo="×" passo={0.1} onChange={muda('multMesLimpo')} />
        <Campo label="Advertência por vazamento (LGPD)" desc="× o atraso" v={g.multLgpdAdvertencia} sufixo="×" passo={0.1} onChange={muda('multLgpdAdvertencia')} />
        <Campo label="Suspensão por vazamento (LGPD)" desc="× o atraso" v={g.multLgpdSuspensao} sufixo="×" passo={0.1} onChange={muda('multLgpdSuspensao')} />
        <Campo label="Atraso abonado" desc="pontos fixos (hoje não desconta)" v={g.pontosAbonado} onChange={muda('pontosAbonado')} />
      </Grupo>

      <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', margin: '4px 0 16px', fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.6 }}>
        Num setor que costuma pontuar <b style={{ color: 'var(--text)' }}>{exemplo.toLocaleString('pt-BR')}</b> pontos no mês{previa ? ' (a mediana da casa)' : ''}:
        {' '}atraso <b style={{ color: 'var(--danger)' }}>{ex.atraso}</b> · advertência <b style={{ color: 'var(--danger)' }}>{ex.advertencia}</b>
        {' '}· suspensão <b style={{ color: 'var(--danger)' }}>{ex.suspensao}</b> · mês limpo <b style={{ color: 'var(--success)' }}>+{ex.mes_sem_ocorrencia}</b>
        {' '}· LGPD <b style={{ color: 'var(--danger)' }}>{ex.lgpd_advertencia} / {ex.lgpd_suspensao}</b>.
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <button onClick={verPrevia} disabled={ocupado !== null} className="tc-btn" style={botao(false)}>
          {ocupado === 'previa' ? 'Calculando cada setor…' : previaEmDia ? 'Recalcular a prévia' : 'Ver como fica em cada setor'}
        </button>
        <span style={{ fontSize: 11.5, color: 'var(--text-mute)' }}>
          A prévia mede o mês típico de cada setor em <b>{referencia}</b> (o último mês fechado) — é esse número que fica gravado com a régua.
        </span>
      </div>

      {previa && (
        <div style={{ overflowX: 'auto', marginBottom: 16, opacity: previaEmDia ? 1 : 0.45 }}>
          {!previaEmDia && <div style={{ fontSize: 12, color: 'var(--warning)', marginBottom: 6 }}>Os números mudaram depois desta prévia — recalcule antes de salvar.</div>}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
            <thead>
              <tr style={{ color: 'var(--text-mute)', fontSize: 11, textAlign: 'right' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 600 }}>Setor</th>
                <th style={{ padding: '6px 8px', fontWeight: 600 }}>Mês típico</th>
                {COLUNAS.map(([, r]) => <th key={r} style={{ padding: '6px 8px', fontWeight: 600 }}>{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {previa.linhas.map((l) => (
                <tr key={l.id} style={{ borderTop: '1px solid var(--border-soft)' }}>
                  <td style={{ padding: '7px 8px' }}>
                    {l.nome}
                    <div style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>{l.usouCasa ? 'ninguém com nota — usa o mês típico da casa' : `${l.n} pessoas com nota`}</div>
                  </td>
                  <td style={{ padding: '7px 8px', textAlign: 'right' }}>{l.mediana.toLocaleString('pt-BR')}</td>
                  {COLUNAS.map(([k]) => {
                    const novo = l.pesos[k], antes = l.atual?.[k]
                    const mudou = antes != null && antes !== novo
                    return (
                      <td key={k} style={{ padding: '7px 8px', textAlign: 'right', fontWeight: mudou ? 700 : 500 }}>
                        <span style={{ color: novo < 0 ? 'var(--danger)' : 'var(--success)' }}>{novo > 0 ? '+' : ''}{novo}</span>
                        {mudou && <div style={{ fontSize: 10.5, color: 'var(--text-mute)', fontWeight: 500 }}>hoje {antes > 0 ? '+' : ''}{antes}</div>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 6 }}>
            Em negrito, o que muda em relação à régua que vale hoje. Mesmo com os mesmos números, um setor pode mudar: o mês típico dele se mexe com o tempo.
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 12 }}>
        <label style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
          Vale a partir de
          <input type="month" value={vigencia} min={compAtual} onChange={(e) => setVigencia(e.target.value)} style={entrada(150)} />
        </label>
        <label style={{ flex: 1, minWidth: 220, fontSize: 11.5, color: 'var(--text-dim)' }}>
          Por que mudou (opcional, mas é o que a conversa de seis meses depois precisa)
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="ex.: atraso passa a pesar mais em todos os setores" style={entrada()} />
        </label>
        <button onClick={salvar} disabled={!previaEmDia || ocupado !== null} className="tc-btn" style={botao(true, !previaEmDia)}
          title={previaEmDia ? undefined : 'Veja a prévia com estes números antes de salvar'}>
          {ocupado === 'salvar' ? 'Salvando…' : 'Salvar régua geral'}
        </button>
      </div>

      {msg && (
        <div style={{ fontSize: 12.5, marginBottom: 12, padding: '10px 12px', borderRadius: 'var(--radius-sm)', lineHeight: 1.5,
          color: msg.tipo === 'ok' ? 'var(--success)' : 'var(--danger)', border: `1px solid ${msg.tipo === 'ok' ? 'var(--success)' : 'var(--danger)'}` }}>{msg.texto}</div>
      )}

      {versoes.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', margin: '6px 0 8px' }}>Versões da régua geral</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {versoes.map((v) => (
              <div key={v.id} style={{ fontSize: 12, background: 'var(--surface-2)', borderRadius: 6, padding: '8px 10px', lineHeight: 1.5 }}>
                <b>a partir de {v.vigenteDesde}</b> · {v.fatorPorMinuto.toLocaleString('pt-BR')} pt/min · base {v.base} · atraso {pct(v.fracaoAtraso).toLocaleString('pt-BR')}% do mês típico
                {' '}· advertência {v.multAdvertencia}× · suspensão {v.multSuspensao}× a advertência · mês limpo {v.multMesLimpo}× · LGPD {v.multLgpdAdvertencia}× / {v.multLgpdSuspensao}×
                <div style={{ color: 'var(--text-mute)', fontSize: 11 }}>
                  {v.criadoPor} · {new Date(v.criadoEm).toLocaleDateString('pt-BR')} · mês típico medido em {v.competenciaReferencia}{v.motivo ? ` · ${v.motivo}` : ''}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const cartao: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 22 }
const entrada = (w?: number): React.CSSProperties => ({ display: 'block', marginTop: 4, width: w ?? '100%', height: 34, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '0 10px', fontSize: 12.5, fontFamily: 'inherit', boxSizing: 'border-box' })
const botao = (primario: boolean, desligado = false): React.CSSProperties => ({
  height: 34, padding: '0 16px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
  cursor: desligado ? 'not-allowed' : 'pointer', opacity: desligado ? 0.5 : 1,
  background: primario ? 'var(--accent)' : 'var(--surface-2)', color: primario ? '#1a1205' : 'var(--text)',
  border: primario ? 'none' : '1px solid var(--border)',
})

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 8 }}>{titulo}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>{children}</div>
    </div>
  )
}

function Campo({ label, desc, v, onChange, sufixo, passo = 1 }: { label: string; desc: string; v: number; onChange: (v: number) => void; sufixo?: string; passo?: number }) {
  return (
    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
      {label}
      <span style={{ display: 'block', fontSize: 10.5, fontWeight: 400, color: 'var(--text-mute)', marginBottom: 4 }}>{desc}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input type="number" step={passo} value={Number.isFinite(v) ? v : 0} onChange={(e) => onChange(Number(e.target.value))} style={{ ...entrada(), marginTop: 0 }} />
        {sufixo && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{sufixo}</span>}
      </span>
    </label>
  )
}
