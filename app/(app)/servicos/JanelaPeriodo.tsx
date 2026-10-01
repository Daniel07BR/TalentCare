'use client'
import { useEffect, useMemo, useState } from 'react'
import { CalendarRange, FileSpreadsheet, X } from 'lucide-react'

/* ============================================================
   A JANELA DO PERÍODO (01/10/2026).

   Pedido do Daniel: "no próximo envio, depois de anexar o documento, abra uma
   janela centralizada e personalizada na tela para a pessoa informar o real
   período do documento".

   ⚠️⚠️ Por que existe: o relatório "Tarefas por Colaborador" do Gestta NÃO traz
   data nenhuma. Em 01/10/2026 o Legal subiu esse arquivo com uma coluna "Data"
   preenchida à mão, como texto, e as 205 linhas entraram em 08/01/1900 — o
   cartão de setembro ficou em zero sem nada acusar. Quem exportou sabe que
   período pediu ao Gestta; o sistema não tem como adivinhar.

   O período decide duas coisas: o dia em que entram as linhas sem data (o
   último do período) e o que este envio SUBSTITUI no setor.
   ============================================================ */

export type Periodo = { de: string; ate: string }

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const br = (s: string) => (s ? s.split('-').reverse().join('/') : '')
const nomeMes = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'long' })

/** Atalhos: o mês passado (o caso de todo começo de mês) e o mês corrente até hoje. */
function atalhos(hoje = new Date()) {
  const iniPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
  const fimPassado = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
  const iniAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  return [
    { rotulo: `${nomeMes(iniPassado)} inteiro`, sub: `${br(iso(iniPassado))} a ${br(iso(fimPassado))}`, p: { de: iso(iniPassado), ate: iso(fimPassado) } },
    { rotulo: `${nomeMes(iniAtual)} até hoje`, sub: `${br(iso(iniAtual))} a ${br(iso(hoje))}`, p: { de: iso(iniAtual), ate: iso(hoje) } },
  ]
}

export default function JanelaPeriodo({ arquivo, setor, inicial, onConfirmar, onCancelar }: {
  arquivo: File
  setor: string
  inicial: Periodo | null
  onConfirmar: (p: Periodo) => void
  onCancelar: () => void
}) {
  const opcoes = useMemo(() => atalhos(), [])
  const hoje = iso(new Date())
  const [p, setP] = useState<Periodo>(inicial ?? opcoes[0].p)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancelar() }
    window.addEventListener('keydown', h)
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = antes }
  }, [onCancelar])

  const erro = !p.de || !p.ate ? 'Informe as duas datas.'
    : p.de > p.ate ? 'O início está depois do fim.'
    : p.ate > hoje ? 'O fim não pode ser depois de hoje.'
    : null
  const dias = !erro ? Math.round((Date.parse(p.ate) - Date.parse(p.de)) / 86400_000) + 1 : 0

  return (
    <div onClick={onCancelar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 70 }}>
      <div role="dialog" aria-modal="true" aria-labelledby="janela-periodo-titulo" onClick={(e) => e.stopPropagation()}
        className="tc-anim"
        style={{ width: 'min(520px, 100%)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-2)', overflow: 'hidden' }}>

        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '22px 22px 16px' }}>
          <span style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <CalendarRange size={21} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="janela-periodo-titulo" style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: '-.3px' }}>Qual período este arquivo cobre?</h2>
            <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 4, lineHeight: 1.5 }}>
              Use as mesmas datas que você escolheu no Gestta ao exportar.
            </div>
          </div>
          <button onClick={onCancelar} aria-label="Fechar" style={{ background: 'transparent', border: 'none', color: 'var(--text-mute)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ margin: '0 22px', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', fontSize: 12.5, color: 'var(--text-dim)' }}>
          <FileSpreadsheet size={15} style={{ flex: 'none' }} />
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{arquivo.name}</span>
          <b style={{ color: 'var(--text)', whiteSpace: 'nowrap' }}>{setor}</b>
        </div>

        <div style={{ padding: '18px 22px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8 }}>Atalhos</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}>
            {opcoes.map((o) => {
              const on = o.p.de === p.de && o.p.ate === p.ate
              return (
                <button key={o.rotulo} type="button" onClick={() => setP(o.p)}
                  style={{ textAlign: 'left', padding: '11px 13px', borderRadius: 'var(--radius)', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text)',
                    border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-soft)' : 'var(--surface)' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, textTransform: 'capitalize' }}>{o.rotulo}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>{o.sub}</div>
                </button>
              )
            })}
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '.6px', margin: '18px 0 8px' }}>Ou escolha as datas</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {(['de', 'ate'] as const).map((k) => (
              <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>
                {k === 'de' ? 'De' : 'Até'}
                <input type="date" value={p[k]} max={hoje} onChange={(e) => setP((x) => ({ ...x, [k]: e.target.value }))}
                  style={{ height: 40, padding: '0 11px', background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13.5, fontFamily: 'inherit' }} />
              </label>
            ))}
          </div>

          <div style={{ marginTop: 14, fontSize: 12, lineHeight: 1.55, color: erro ? 'var(--danger)' : 'var(--text-dim)', minHeight: 37 }}>
            {erro ?? <>Este envio <b>substitui</b> o que o {setor} já tem de <b>{br(p.de)}</b> a <b>{br(p.ate)}</b> ({dias} {dias === 1 ? 'dia' : 'dias'}). Se o arquivo não tiver data por linha, os serviços entram no dia {br(p.ate)}.</>}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 22px 20px', marginTop: 4, borderTop: '1px solid var(--border-soft)' }}>
          <button type="button" onClick={onCancelar}
            style={{ height: 38, padding: '0 16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-dim)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button type="button" disabled={!!erro} onClick={() => onConfirmar(p)}
            style={{ height: 38, padding: '0 18px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#1a1205', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: erro ? 'not-allowed' : 'pointer', opacity: erro ? 0.5 : 1 }}>
            Ler o arquivo
          </button>
        </div>
      </div>
    </div>
  )
}
