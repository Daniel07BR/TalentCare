'use client'
import { Users, ArrowUp, AlertTriangle, Clock, Gavel, type LucideIcon } from 'lucide-react'
import type { Kpi } from '@/lib/mock/dashboard'
import type { JanelaComparacao, Selo } from '@/lib/painel/visao'
import v from '../../_visao/visao.module.css'
import p from './painel.module.css'
import { forte, suave } from '../../_visao/ui'
import type { Tom } from '../../_visao/tipos'

/* ============================================================
   OS CINCO INDICADORES — o desenho do conceito, os números de `buildDashboard`.

   ⚠️ Os números e as legendas são OS MESMOS da página atual (`vm.kpis`): aqui
   só entram o azulejo, a cor e o selo. O que cada clique abre:
   - Headcount → quem entrou e quem saiu na janela;
   - Turnover → a janela do Turnover (a casa inteira);
   - Advertências, Atrasos, Suspensões → quem e quanto.
   ============================================================ */

const COMO: Record<string, { Icone: LucideIcon; tom: Tom }> = {
  Headcount: { Icone: Users, tom: 'blue' },
  Turnover: { Icone: ArrowUp, tom: 'green' },
  Advertências: { Icone: AlertTriangle, tom: 'orange' },
  Atrasos: { Icone: Clock, tom: 'red' },
  // Roxo = suspensão em todo o sistema.
  Suspensões: { Icone: Gavel, tom: 'purple' },
}

/** Um selo que passou nas travas — com o que ele compara, para a tela dizer. */
export type SeloDoKpi = { selo: Selo; janela: JanelaComparacao; atual: number; anterior: number; pessoas: number; expediente: number }

const br = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`
const valorBR = (v: string | number) => (typeof v === 'number' ? v.toLocaleString('pt-BR') : v)

export function Indicadores({ kpis, selos, esperandoPonto, recarregandoPonto = false, abrirLista, abrirTurnover }: {
  kpis: Kpi[]
  /** Os selos de variação que PASSARAM na regra (ver `janelaDeComparacao`). */
  selos: Partial<Record<string, SeloDoKpi>>
  /** O ponto do período ainda não chegou: os três que dependem dele são esqueleto. */
  esperandoPonto: boolean
  /** O filtro trocou e o ponto da janela nova ainda não chegou: os três ficam
   *  apagados — o número na tela ainda é o da janela anterior. */
  recarregandoPonto?: boolean
  abrirLista: (label: string) => void
  abrirTurnover: () => void
}) {
  return (
    <div className={p.kpis}>
      {kpis.map((k) => {
        const c = COMO[k.label] ?? { Icone: Users, tom: 'blue' as Tom }
        const doPonto = k.label === 'Advertências' || k.label === 'Atrasos' || k.label === 'Suspensões'
        const esqueleto = doPonto && esperandoPonto
        /* ⚠️ Só vira botão quando HÁ o que abrir. Cartão que parece botão e não
           abre nada ensina o leitor a não clicar em nenhum. */
        const abre = k.label === 'Turnover' ? abrirTurnover : k.pessoas?.length ? () => abrirLista(k.label) : undefined
        const dica = k.label === 'Turnover' ? 'ver quem saiu e a movimentação mês a mês'
          : k.label === 'Headcount' ? 'ver quem entrou e quem saiu nesta janela'
          : `ver as ${k.pessoas?.length ?? 0} pessoas e quanto cada uma teve`
        const semDado = k.value === '—'
        const s = selos[k.label]
        const Raiz = abre && !esqueleto ? 'button' : 'div'
        return (
          <Raiz key={k.label} type={Raiz === 'button' ? 'button' : undefined} onClick={esqueleto ? undefined : abre}
            className={`${v.cartao} ${p.kpi} ${Raiz === 'button' ? v.clicavel : ''} ${doPonto && recarregandoPonto ? p.recarregando : ''}`}
            title={Raiz === 'button' ? dica : undefined} aria-label={Raiz === 'button' ? `${k.label}: ${dica}` : undefined}>
            <span style={{ width: 46, height: 46, borderRadius: 12, background: suave(c.tom), color: forte(c.tom), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <c.Icone size={22} strokeWidth={2.2} />
            </span>
            <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--n-text-2)' }}>
                  {k.label}
                  {/* ⚠️ O número grande do Headcount é o quadro do ÚLTIMO DIA do período
                      ("hoje" quando a janela termina hoje) — decisão do dono, 11/09/2026;
                      o saldo ao lado é o do período. */}
                  {k.label === 'Headcount' && <span style={{ fontWeight: 500, color: 'var(--n-text-3)' }}> · {k.retrato ?? 'hoje'}</span>}
                </span>
                {/* O selo: no Headcount é o SALDO (entradas − saídas, em pessoas);
                    em Atrasos e Advertências, a variação contra a janela anterior
                    de mesmo tamanho — quando ela é honesta. */}
                {k.label === 'Headcount' && k.delta && (
                  <span title="saldo do período: entradas menos saídas" style={{ fontSize: 11.5, fontWeight: 700, color: k.delta.startsWith('-') ? 'var(--n-red)' : k.delta === '0' ? 'var(--n-text-3)' : 'var(--n-green)', whiteSpace: 'nowrap' }}>
                    {k.deltaArrow} {k.delta.replace('-', '−')}
                  </span>
                )}
                {s && !esqueleto && (
                  <span title={`As mesmas ${s.pessoas} pessoas nas duas janelas (quem já estava na casa em ${br(s.janela.de)} e segue no quadro): ${s.atual.toLocaleString('pt-BR')} ${k.label.toLowerCase()} de ${br(s.janela.atualDe)} a ${br(s.janela.atualAte)} contra ${s.anterior.toLocaleString('pt-BR')} de ${br(s.janela.de)} a ${br(s.janela.ate)}. Os dois lados têm ${s.expediente} dias com expediente e os mesmos dias da semana. Por isso o selo não compara com o número grande, que conta o quadro inteiro.`}
                    style={{ textAlign: 'right', lineHeight: 1.15, cursor: 'help' }}>
                    <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', color: s.selo.piorou == null ? 'var(--n-text-3)' : s.selo.piorou ? 'var(--n-red)' : 'var(--n-green)' }}>
                      {s.selo.seta} {s.selo.texto}
                    </span>
                    <span style={{ display: 'block', fontSize: 9.5, color: 'var(--n-text-3)', whiteSpace: 'nowrap' }}>vs. {br(s.janela.de)}–{br(s.janela.ate)}</span>
                    <span style={{ display: 'block', fontSize: 9.5, color: 'var(--n-text-3)', whiteSpace: 'nowrap' }}>mesmas {s.pessoas} pessoas</span>
                  </span>
                )}
              </span>
              {esqueleto ? (
                <span style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 2 }}>
                  <span className="esqueleto" style={{ display: 'block', height: 26, width: 70 }} />
                  <span className="esqueleto" style={{ display: 'block', height: 11, width: '85%' }} />
                </span>
              ) : (
                <>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    {/* ⚠️ "—" em cinza, nunca um 0 grande: zero se lê como "não houve",
                        e o que houve foi ninguém medir. */}
                    <span className="cnum" style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1, color: semDado ? 'var(--n-text-3)' : 'var(--n-text)' }}>{valorBR(k.value)}</span>
                    {!semDado && k.unit && <span style={{ fontSize: 13, color: 'var(--n-text-2)', fontWeight: 600 }}>{k.unit}</span>}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 10.5, color: 'var(--n-text-3)', lineHeight: 1.35 }}>{k.nota}</span>
                    {/* ⚠️ Só com série real (a mesma da página atual). Sem série, sem gráfico. */}
                    {k.spark && (
                      <svg width="64" height="24" viewBox="0 0 64 24" style={{ overflow: 'visible', flex: 'none' }} aria-hidden="true">
                        <polyline points={k.spark} fill="none" stroke={forte(c.tom)} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                </>
              )}
            </span>
            {Raiz === 'button' && <span className={v.verQuem} aria-hidden="true">{k.label === 'Turnover' ? 'ver detalhe ›' : 'ver quem ›'}</span>}
          </Raiz>
        )
      })}
    </div>
  )
}
