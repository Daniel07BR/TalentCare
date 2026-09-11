'use client'
import { CalendarDays } from 'lucide-react'
import { curvaDeSaidas, type Linha } from '@/lib/painel/visao'
import v from '../../_visao/visao.module.css'
import p from './painel.module.css'
import { precarregarDetalhe } from '../../_visao/Detalhe'
import { Barras, CabecaBotao, Esqueleto, IconeWhatsapp, Vazio } from './pecas'

/* ============================================================
   LINHA 2 — Atendimentos por departamento (WhatsApp) | Curva de turnover.
   ============================================================ */

export function Atendimentos({ linhas, estado, abrirCasa, abrirFila }: {
  linhas: Linha[]
  estado: 'carregando' | 'recarregando' | 'erro' | 'ok'
  abrirCasa: () => void
  /** A janela de UMA fila — o mesmo número da barra (ver `linhasWhatsapp`). */
  abrirFila: (fila: string) => void
}) {
  return (
    <section className={v.cartao}>
      <CabecaBotao icone={<IconeWhatsapp />} titulo="Atendimentos por departamento"
        sub="WhatsApp · chamados abertos no período, pela fila do atendimento"
        onClick={abrirCasa} onPreparar={() => precarregarDetalhe('whatsapp')}
        dica="Abrir o resumo do WhatsApp (a casa inteira)" />
      {estado === 'carregando' ? <Esqueleto linhas={7} alto={16} />
        : estado === 'erro' ? <Vazio><span style={{ color: 'var(--n-red)' }}>Não foi possível carregar os atendimentos.</span></Vazio>
        : linhas.length === 0 ? <Vazio>Nenhum chamado no período.</Vazio>
        : (
          <div className={estado === 'recarregando' ? p.recarregando : undefined}>
            {/* ⚠️⚠️ A barra abre a janela da FILA, não a do setor (decisão do dono,
                11/09/2026): a barra conta pela fila e a janela do setor conta as
                atendentes — a Recepção dá 127 numa e 246 na outra. */}
            <Barras linhas={linhas} abrir={(fila) => abrirFila(fila)}
              dica={(l) => `Abrir só a fila de ${l.nome} — conta pela fila do atendimento, não pelas atendentes do setor.`} />
          </div>
        )}
    </section>
  )
}

export function CurvaTurnover({ taxa, saidas, dias, vals, rotulos, abrir }: {
  taxa: number; saidas: number; dias: number; vals: number[]; rotulos: string[]; abrir: () => void
}) {
  const W = 320, H = 150
  const c = curvaDeSaidas(vals.length ? vals : [0], W, H)
  return (
    <section className={v.cartao} style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <CabecaBotao Icone={CalendarDays} cor="var(--n-blue)" titulo="Curva de turnover"
          sub={<>{saidas} {saidas === 1 ? 'saída' : 'saídas'} em {dias} dias · saídas por {dias > 100 ? 'mês' : dias <= 10 ? 'dia' : '5 dias'}</>}
          rotuloAcao="ver relatório ›" onClick={abrir} onPreparar={() => precarregarDetalhe('turnover')}
          dica="Abrir o Turnover (a casa inteira, 12 meses)" />
        {/* A taxa do período — o MESMO número do cartão Turnover lá em cima. */}
        <span title="saídas no período ÷ quadro ativo · não anualizado" style={{ flex: 'none', fontSize: 22, fontWeight: 800, letterSpacing: '-.6px', color: 'var(--n-red)', lineHeight: 1 }}>
          {taxa.toLocaleString('pt-BR')}%
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '22px minmax(0, 1fr)', gap: 6, marginTop: 'auto' }}>
        {/* ⚠️ O eixo é em PESSOAS (saídas), começando no zero. O conceito
            desenhava 0–12% por dia, e turnover de um dia não existe. */}
        <div style={{ position: 'relative', height: 160 }} aria-hidden="true">
          {c.marcas.map((m) => (
            <span key={m.v} style={{ position: 'absolute', right: 0, top: `${(m.y / H) * 100}%`, transform: 'translateY(-50%)', fontSize: 10, color: 'var(--n-text-3)' }}>{m.v}</span>
          ))}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 160 }} role="img"
          aria-label={`Saídas por período: ${vals.join(', ')}`}>
          {c.marcas.map((m) => <line key={m.v} x1="0" x2={W} y1={m.y} y2={m.y} stroke="var(--n-border)" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />)}
          <defs>
            <linearGradient id="curvaSaidas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--n-red)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--n-red)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={c.area} fill="url(#curvaSaidas)" />
          <path d={c.line} fill="none" stroke="var(--n-red)" strokeWidth="2.2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <span />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--n-text-3)' }}>
          {rotulos.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      </div>
    </section>
  )
}
