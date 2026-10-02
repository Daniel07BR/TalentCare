'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FileDown } from 'lucide-react'
import { competenciaLabel } from '@/lib/avaliacoes/criterios'
import { METODO_RESUMO, METODO_REFERENCIA } from '@/lib/avaliacoes/metodo'

/* ============================================================
   O TERMO EM A4 — a avaliação do mês para assinar (02/10/2026).

   Pedido do Daniel: "gerar o pdf só com as informações que o usuário realmente
   vai visualizar, campo para data e assinatura do funcionário e do gestor do
   departamento, e linhas para o funcionário deixar alguma observação — assim
   daremos ouvidos a ele também".

   ⚠️⚠️ Os dados vêm de `/api/avaliacoes/[id]/termo`, que monta campo a campo SÓ
   o que o avaliado vê. Nada da gestão (risco, promoção, anotação privada) passa
   por aqui — papel assinado não se recolhe.

   ⚠️ COMO FUNCIONA: o mesmo truque da ficha (`FichaImpressa`) — portal no
   <body>, escondido na tela; na impressão só ele aparece. Paleta clara fixa:
   papel é branco mesmo com o tema escuro ligado.
   ============================================================ */

type Termo = {
  competencia: string
  pessoa: { nome: string; cargo: string; setor: string }
  avaliador: { nome: string; cargo: string | null }
  publicadaEm: string | null
  versao: number
  reguaPropria: boolean
  resultado: { nivel: string; media: number } | null
  pontos: { criterio: string; sub: string | null; nivel: string; significado: string; exemplo: string | null }[]
  recado: string | null
  combinado: string | null
  ciencia: { em: string; comentario: string | null } | null
}

const CSS = `
.tr-root { display: none; }
@media print {
  @page { size: A4 portrait; margin: 12mm 13mm 12mm; }
  html, body { background: #fff !important; }
  body > *:not(.tr-root) { display: none !important; }
  .tr-root { display: block !important; }
}
.tr-root, .tr-root * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
.tr-folha { color: #0f172a; font-family: Inter, 'Segoe UI', system-ui, sans-serif; font-size: 10.5pt; line-height: 1.4; }
.tr-topo { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 10px; }
.tr-topo h1 { margin: 0; font-size: 16pt; letter-spacing: -.3px; }
.tr-topo small { color: #475569; font-size: 9pt; }
.tr-ident { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 4px 14px; margin-bottom: 10px; font-size: 9.5pt; }
.tr-ident b { display: block; font-size: 7.5pt; color: #64748b; text-transform: uppercase; letter-spacing: .4px; font-weight: 600; }
.tr-metodo { background: #f1f5f9; border-radius: 6px; padding: 7px 10px; font-size: 8.5pt; color: #334155; margin-bottom: 10px; }
.tr-metodo i { display: block; margin-top: 3px; color: #64748b; }
table.tr-tab { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 9pt; }
.tr-tab th { text-align: left; font-size: 7.5pt; text-transform: uppercase; letter-spacing: .4px; color: #64748b; border-bottom: 1px solid #cbd5e1; padding: 4px 6px; }
.tr-tab td { border-bottom: 1px solid #e2e8f0; padding: 6px; vertical-align: top; }
.tr-tab td.tr-nivel { font-weight: 700; white-space: nowrap; }
.tr-sub { color: #64748b; font-weight: 400; }
.tr-mute { color: #475569; }
.tr-resultado { font-size: 9.5pt; margin-bottom: 10px; }
.tr-bloco { margin-bottom: 9px; break-inside: avoid; }
.tr-bloco h2 { margin: 0 0 3px; font-size: 8pt; text-transform: uppercase; letter-spacing: .4px; color: #64748b; }
.tr-bloco p { margin: 0; white-space: pre-wrap; font-size: 9.5pt; }
.tr-linha { border-bottom: 1px solid #94a3b8; height: 22px; }
.tr-assin { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 26px; break-inside: avoid; }
.tr-assin div { font-size: 9pt; }
.tr-assin .tr-traco { border-top: 1px solid #0f172a; padding-top: 4px; margin-top: 34px; }
.tr-assin .tr-data { margin-top: 12px; color: #334155; }
.tr-rodape { margin-top: 14px; font-size: 7.5pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 4px; }
`

const data = (s: string | null) => (s ? new Date(s).toLocaleDateString('pt-BR') : '—')

/** O botão "Gerar PDF" + a folha que ele imprime. Só aparece com avaliação publicada. */
export function BotaoTermo({ avaliadoId, competencia, estilo }: { avaliadoId: string; competencia: string; estilo?: React.CSSProperties }) {
  const [montado, setMontado] = useState(false)
  const [termo, setTermo] = useState<Termo | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => { setMontado(true) }, [])

  // ⚠️ A folha precisa estar NA PÁGINA antes do print: imprime no efeito, depois
  // de o React desenhar o termo — papel gerado antes dos dados sai em branco.
  useEffect(() => {
    if (!termo) return
    const antes = document.title
    document.title = `Avaliação - ${termo.pessoa.nome} - ${competenciaLabel(termo.competencia)}`
    const volta = () => { document.title = antes; window.removeEventListener('afterprint', volta) }
    window.addEventListener('afterprint', volta)
    const t = setTimeout(() => window.print(), 50)
    return () => clearTimeout(t)
  }, [termo])

  async function gerar() {
    setErro(null); setCarregando(true)
    const r = await fetch(`/api/avaliacoes/${avaliadoId}/termo?competencia=${competencia}`, { cache: 'no-store' })
    const j = await r.json().catch(() => null)
    setCarregando(false)
    if (!r.ok || !j) { setErro(j?.error ?? 'Não deu para gerar o PDF.'); return }
    setTermo({ ...j }) // objeto novo: imprime de novo a cada clique
  }

  return (
    <>
      <button type="button" onClick={gerar} disabled={carregando} className="tc-btn"
        title="A avaliação do mês em A4, com espaço para observação e assinaturas"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: carregando ? 'wait' : 'pointer', ...estilo }}>
        <FileDown size={15} /> {carregando ? 'Gerando…' : 'Gerar PDF para assinar'}
      </button>
      {erro && <span style={{ fontSize: 12, color: 'var(--danger)' }}>{erro}</span>}
      {montado && termo && createPortal(
        <div className="tr-root">
          <style>{CSS}</style>
          <Folha t={termo} />
        </div>,
        document.body,
      )}
    </>
  )
}

function Folha({ t }: { t: Termo }) {
  return (
    <div className="tr-folha">
      <div className="tr-topo">
        <h1>Avaliação de desempenho · {competenciaLabel(t.competencia)}</h1>
        <small>TalentCare · Grupo Itamarathy</small>
      </div>

      <div className="tr-ident">
        <div><b>Funcionário</b>{t.pessoa.nome}</div>
        <div><b>Cargo</b>{t.pessoa.cargo}</div>
        <div><b>Setor</b>{t.pessoa.setor}</div>
        <div><b>Avaliador</b>{t.avaliador.nome}{t.avaliador.cargo ? ` · ${t.avaliador.cargo}` : ''}</div>
        <div><b>Publicada em</b>{data(t.publicadaEm)}{t.versao > 1 ? ` · versão ${t.versao}` : ''}</div>
        <div><b>Competência</b>{competenciaLabel(t.competencia)}</div>
      </div>

      <div className="tr-metodo">
        {METODO_RESUMO} Você pode registrar a sua observação abaixo; ela fica junto da avaliação e não altera o resultado.
        <i>{METODO_REFERENCIA}</i>
      </div>

      <table className="tr-tab">
        <thead>
          <tr><th style={{ width: '20%' }}>Ponto</th><th style={{ width: '16%' }}>Nível</th><th>O que este nível significa{t.reguaPropria ? ` no setor` : ''}</th><th style={{ width: '30%' }}>Exemplo do avaliador</th></tr>
        </thead>
        <tbody>
          {t.pontos.map((p) => (
            <tr key={p.criterio}>
              <td><b>{p.criterio}</b>{p.sub && <span className="tr-sub"> — {p.sub}</span>}</td>
              <td className="tr-nivel">{p.nivel}</td>
              <td className="tr-mute">{p.significado}</td>
              <td>{p.exemplo ?? <span className="tr-mute">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {t.resultado && (
        <div className="tr-resultado">Resultado geral do mês: <b>{t.resultado.nivel}</b> <span className="tr-mute">(média {t.resultado.media.toFixed(1).replace('.', ',')})</span></div>
      )}

      {t.recado && <div className="tr-bloco"><h2>Recado do avaliador</h2><p>{t.recado}</p></div>}
      {t.combinado && <div className="tr-bloco"><h2>Combinado para o próximo mês</h2><p>{t.combinado}</p></div>}
      {t.ciencia && (
        <div className="tr-bloco">
          <h2>Ciência registrada no sistema em {data(t.ciencia.em)}</h2>
          {t.ciencia.comentario ? <p>{t.ciencia.comentario}</p> : <p className="tr-mute">Sem comentário.</p>}
        </div>
      )}

      <div className="tr-bloco">
        <h2>Observações do funcionário</h2>
        {Array.from({ length: 5 }, (_, i) => <div key={i} className="tr-linha" />)}
      </div>

      <div className="tr-assin">
        <div>
          <div className="tr-traco"><b>{t.pessoa.nome}</b><br />Funcionário</div>
          <div className="tr-data">Data: ____/____/________</div>
        </div>
        <div>
          <div className="tr-traco"><b>{t.avaliador.nome}</b><br />Gestor do departamento</div>
          <div className="tr-data">Data: ____/____/________</div>
        </div>
      </div>

      <div className="tr-rodape">
        Gerado pelo TalentCare em {new Date().toLocaleString('pt-BR')}. Este documento contém apenas o que foi mostrado ao funcionário na avaliação publicada.
      </div>
    </div>
  )
}
