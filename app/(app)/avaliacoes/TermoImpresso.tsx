'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FileDown } from 'lucide-react'
import { competenciaLabel } from '@/lib/avaliacoes/criterios'
import { FONTES_CURTAS } from '@/lib/avaliacoes/metodo'

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
  avaliador: { nome: string; papel: string }
  publicadaEm: string | null
  versao: number
  reguaPropria: boolean
  resultado: { nivel: string; nivelKey: string } | null
  pontos: { criterio: string; sub: string | null; nivel: string; nivelKey: string | null; significado: string; exemplo: string | null }[]
  recado: string | null
  combinado: string | null
  ciencia: { em: string; comentario: string | null } | null
}

/* As cores dos quatro níveis no papel — as mesmas da tela, em tons que imprimem. */
const COR: Record<string, { forte: string; fundo: string }> = {
  abaixo: { forte: '#dc2626', fundo: '#fdecec' },
  parte: { forte: '#b45309', fundo: '#fef3c7' },
  atende: { forte: '#15803d', fundo: '#dcfce7' },
  acima: { forte: '#6d28d9', fundo: '#ede9fe' },
}
const NIVEIS_PAPEL = [['abaixo', 'Abaixo'], ['parte', 'Em parte'], ['atende', 'Atende'], ['acima', 'Acima']] as const

/* ⚠️⚠️ UMA PÁGINA (02/10/2026 — "preciso imprimir tudo em 1 página"). A folha é
   desenhada no tamanho do A4 (794 × 1123 px a 96 dpi) e, antes de imprimir, é
   MEDIDA: se passar da altura, a redução (`zoom`) cai o tanto que for preciso —
   e a largura cresce na mesma proporção, para o texto se redistribuir em vez de
   deixar uma faixa branca à direita. Recado longo encolhe a letra, não cria a
   página 2.
   ⚠️ `@page { margin: 0 }` some com o cabeçalho e o rodapé do navegador (data,
   título, endereço) — a margem do papel é o padding da folha. */
const A4_L = 794
const A4_A = 1123
const CSS = `
.tr-root { display: none; }
@media print {
  @page { size: A4 portrait; margin: 0; }
  html, body { background: #fff !important; margin: 0 !important; }
  body > *:not(.tr-root) { display: none !important; }
  .tr-root { display: block !important; }
}
.tr-root, .tr-root * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
.tr-folha { width: ${A4_L}px; padding: 34px 40px 26px; color: #0f172a; font-family: Inter, 'Segoe UI', system-ui, sans-serif; font-size: 12px; line-height: 1.42; background: #fff; }
.tr-faixa { background: #0f172a; color: #fff; border-radius: 10px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #f59e0b; }
.tr-faixa h1 { margin: 0; font-size: 19px; letter-spacing: -.3px; }
.tr-faixa .tr-comp { color: #fbbf24; font-weight: 700; }
.tr-faixa small { color: #cbd5e1; font-size: 10.5px; text-align: right; line-height: 1.35; }
.tr-ident { display: grid; grid-template-columns: 1.5fr 1fr 1.5fr 1fr; gap: 6px 14px; margin: 12px 2px; }
.tr-ident b { display: block; font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: .5px; font-weight: 700; }
.tr-ident span { font-weight: 600; }
.tr-tit { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .6px; color: #f59e0b; margin: 0 0 6px; }
.tr-metodo { display: grid; grid-template-columns: 1fr 1.25fr 1.25fr; gap: 8px; margin-bottom: 12px; }
.tr-passo { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; background: #f8fafc; font-size: 10.5px; color: #334155; }
.tr-passo h3 { margin: 0 0 4px; font-size: 11.5px; color: #0f172a; display: flex; gap: 6px; align-items: center; }
.tr-passo h3 i { font-style: normal; background: #0f172a; color: #fff; border-radius: 50%; width: 17px; height: 17px; font-size: 10px; display: inline-flex; align-items: center; justify-content: center; }
.tr-chips { display: flex; gap: 4px; flex-wrap: wrap; margin: 2px 0 3px; }
.tr-chip { border-radius: 999px; padding: 1px 8px; font-size: 10px; font-weight: 700; }
table.tr-tab { width: 100%; border-collapse: separate; border-spacing: 0 5px; margin: -5px 0 4px; }
.tr-tab th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: .5px; color: #64748b; padding: 0 8px; }
.tr-tab td { padding: 8px; vertical-align: top; background: #f8fafc; font-size: 11px; }
.tr-tab td:first-child { border-radius: 8px 0 0 8px; border-left: 5px solid var(--c); }
.tr-tab td:last-child { border-radius: 0 8px 8px 0; }
.tr-tab .tr-nivel { display: inline-block; border-radius: 6px; padding: 3px 8px; font-weight: 800; font-size: 11px; white-space: nowrap; background: var(--f); color: var(--c); }
.tr-sub { color: #64748b; font-weight: 400; display: block; font-size: 10px; }
.tr-mute { color: #475569; }
.tr-resultado { display: flex; align-items: center; gap: 10px; margin: 4px 0 12px; padding: 9px 12px; border-radius: 8px; background: var(--f); border: 1px solid var(--c); }
.tr-resultado b { color: var(--c); font-size: 14px; }
.tr-dois { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
.tr-caixa { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; border-top: 3px solid var(--c, #0f172a); }
.tr-caixa h2 { margin: 0 0 3px; font-size: 9.5px; text-transform: uppercase; letter-spacing: .5px; color: var(--c, #64748b); }
.tr-caixa p { margin: 0; white-space: pre-wrap; font-size: 11px; }
.tr-obs { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px 4px; border-top: 3px solid #0ea5e9; margin-bottom: 4px; }
.tr-obs h2 { margin: 0; font-size: 9.5px; text-transform: uppercase; letter-spacing: .5px; color: #0369a1; }
.tr-obs small { color: #64748b; font-size: 10px; }
.tr-linha { border-bottom: 1px solid #94a3b8; height: 24px; }
.tr-assin { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; margin-top: 30px; }
.tr-assin .tr-traco { border-top: 1.5px solid #0f172a; padding-top: 4px; font-size: 11px; }
.tr-assin .tr-papel { color: #64748b; font-size: 10px; }
.tr-assin .tr-data { margin-top: 10px; color: #334155; font-size: 11px; }
.tr-rodape { margin-top: 16px; font-size: 8.5px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 5px; display: flex; justify-content: space-between; gap: 12px; }
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
    const t = setTimeout(() => { caber(); window.print() }, 50)
    return () => clearTimeout(t)
  }, [termo])

  /** Mede a folha fora da tela e reduz até caber numa página A4. */
  function caber() {
    const root = document.querySelector<HTMLElement>('.tr-root')
    const folha = root?.querySelector<HTMLElement>('.tr-folha')
    if (!root || !folha) return
    const antes = root.getAttribute('style') ?? ''
    root.setAttribute('style', 'display:block;position:absolute;left:-20000px;top:0;')
    let z = 1
    folha.style.zoom = '1'; folha.style.width = `${A4_L}px`
    for (let i = 0; i < 4; i++) {
      const h = folha.scrollHeight
      const alvo = Math.min(1, (A4_A - 4) / (h * z) * z)
      if (Math.abs(alvo - z) < 0.005) break
      z = alvo
      folha.style.width = `${A4_L / z}px`
    }
    // Trava final: com a largura que ficou, se ainda passar, reduz sem mexer na largura.
    const h = folha.scrollHeight
    if (h * z > A4_A - 4) z = (A4_A - 4) / h
    folha.style.zoom = String(z)
    root.setAttribute('style', antes)
  }

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
  const res = t.resultado ? COR[t.resultado.nivelKey] : null
  return (
    <div className="tr-folha">
      <div className="tr-faixa">
        <div>
          <h1>Avaliação de desempenho</h1>
          <div className="tr-comp">{competenciaLabel(t.competencia)}</div>
        </div>
        <small>TalentCare<br />Grupo Itamarathy</small>
      </div>

      <div className="tr-ident">
        <div><b>Funcionário</b><span>{t.pessoa.nome}</span></div>
        <div><b>Cargo · Setor</b><span>{t.pessoa.cargo} · {t.pessoa.setor}</span></div>
        <div><b>Avaliador</b><span>{t.avaliador.nome} · {t.avaliador.papel}</span></div>
        <div><b>Publicada em</b><span>{data(t.publicadaEm)}{t.versao > 1 ? ` · v${t.versao}` : ''}</span></div>
      </div>

      {/* O MÉTODO em três quadros — "mais resumida, simples e direta". */}
      <div className="tr-tit">Como você foi avaliado</div>
      <div className="tr-metodo">
        <div className="tr-passo">
          <h3><i>1</i>3 pontos</h3>
          <b>Entrega</b> (o resultado), <b>Atitude</b> (o jeito de trabalhar) e <b>Equipe e comunicação</b>.
        </div>
        <div className="tr-passo">
          <h3><i>2</i>4 níveis</h3>
          <div className="tr-chips">
            {NIVEIS_PAPEL.map(([k, r]) => <span key={k} className="tr-chip" style={{ background: COR[k].fundo, color: COR[k].forte }}>{r}</span>)}
          </div>
          Cada nível tem uma descrição escrita para o seu {t.reguaPropria ? 'setor' : 'cargo'}, conhecida antes do mês.
        </div>
        <div className="tr-passo">
          <h3><i>3</i>Fatos e a sua voz</h3>
          &quot;Abaixo&quot; e &quot;Acima&quot; sempre vêm com o fato que levou a eles. Você escreve a sua observação abaixo: ela fica registrada e não muda o resultado.
        </div>
      </div>

      <div className="tr-tit">O resultado do mês</div>
      <table className="tr-tab">
        <thead>
          <tr><th style={{ width: '19%' }}>Ponto</th><th style={{ width: '15%' }}>Nível</th><th style={{ width: '30%' }}>O que este nível significa</th><th>Exemplo do avaliador</th></tr>
        </thead>
        <tbody>
          {t.pontos.map((p) => {
            const c = p.nivelKey ? COR[p.nivelKey] : { forte: '#94a3b8', fundo: '#f1f5f9' }
            return (
              <tr key={p.criterio} style={{ ['--c' as string]: c.forte, ['--f' as string]: c.fundo }}>
                <td><b>{p.criterio}</b>{p.sub && <span className="tr-sub">{p.sub}</span>}</td>
                <td><span className="tr-nivel">{p.nivel}</span></td>
                <td className="tr-mute">{p.significado}</td>
                <td>{p.exemplo ?? <span className="tr-mute">—</span>}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {t.resultado && res && (
        <div className="tr-resultado" style={{ ['--c' as string]: res.forte, ['--f' as string]: res.fundo }}>
          Resultado geral do mês: <b>{t.resultado.nivel}</b>
        </div>
      )}

      {(t.recado || t.combinado) && (
        <div className="tr-dois" style={!t.recado || !t.combinado ? { gridTemplateColumns: '1fr' } : undefined}>
          {t.recado && <div className="tr-caixa" style={{ ['--c' as string]: '#6d28d9' }}><h2>Recado do avaliador</h2><p>{t.recado}</p></div>}
          {t.combinado && <div className="tr-caixa" style={{ ['--c' as string]: '#15803d' }}><h2>Combinado para o próximo mês</h2><p>{t.combinado}</p></div>}
        </div>
      )}

      {t.ciencia?.comentario && (
        <div className="tr-caixa" style={{ ['--c' as string]: '#0369a1', marginBottom: 10 }}>
          <h2>O que você registrou no sistema em {data(t.ciencia.em)}</h2><p>{t.ciencia.comentario}</p>
        </div>
      )}

      <div className="tr-obs">
        <h2>Suas observações</h2>
        <small>Concorda? Discorda de algum ponto? Quer contar algo que o mês não mostrou?</small>
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="tr-linha" />)}
      </div>

      <div className="tr-assin">
        <div>
          <div className="tr-traco"><b>{t.pessoa.nome}</b><div className="tr-papel">Funcionário</div></div>
          <div className="tr-data">Data: ____/____/________</div>
        </div>
        <div>
          <div className="tr-traco"><b>{t.avaliador.nome}</b><div className="tr-papel">{t.avaliador.papel} do departamento</div></div>
          <div className="tr-data">Data: ____/____/________</div>
        </div>
      </div>

      <div className="tr-rodape">
        <span>Método: escala ancorada em comportamento (BARS) e feedback Situação → Comportamento → Impacto. Fontes: {FONTES_CURTAS}</span>
        <span style={{ whiteSpace: 'nowrap' }}>Gerado em {new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  )
}
