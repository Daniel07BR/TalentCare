'use client'
import { Headset } from 'lucide-react'
import type { AtendimentoDaPessoa } from '@/lib/recepcao'
import { Cartao, forte, suave } from '../../../_visao/ui'
import { ITENS_RECEPCAO, fmt, parte } from '../../../_visao/recepcao'

/* ============================================================
   ATENDIMENTO DA RECEPÇÃO — o card da ficha (16/10/2026).

   O que a pessoa fez na Recepção no período e a fatia dela no setor. Vem pronto em
   `/api/employee-metrics` (`m.recepcao`), por isso sai igual na tela e no PDF.
   Some quando a pessoa não é da Recepção nem atendeu nela (`recepcao` nulo).

   ⚠️ "N% do setor" usa o MESMO total do card do setor. Nas visitas a soma das fatias passa
   de 100%: a visita com duas atendentes é das duas — por isso ali o texto é "estava em".
   ⚠️ Só aparece, não entra na nota (pedido do Daniel).
   ============================================================ */

export function AtendimentoRecepcao({ r, periodo, impressao = false }: { r: AtendimentoDaPessoa; periodo: string; impressao?: boolean }) {
  return (
    <Cartao titulo="Atendimento da Recepção" Icone={Headset}
      sub={`${periodo} · ligações, visitas e delivery do Fluxo · contatos do CIDE · não entra na nota`}
      style={impressao ? { breakInside: 'avoid' } : undefined}>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: `repeat(auto-fit, minmax(min(${impressao ? 120 : 150}px, 100%), 1fr))` }}>
        {ITENS_RECEPCAO.map((i) => {
          const meu = i.valor(r.meu)
          const pct = parte(meu, i.valor(r.setor))
          const legenda = pct == null ? i.nota(r.meu) : i.chave === 'visitas' ? `estava em ${pct}% das visitas` : `${pct}% do setor`
          return (
            <div key={i.chave} title={i.nota(r.meu) ?? undefined}
              style={{ background: 'var(--n-card-2)', border: '1px solid var(--n-border-2)', borderRadius: 12, padding: '11px 12px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 26, height: 26, borderRadius: 8, background: suave(i.tom), color: forte(i.tom), display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  <i.Icone size={14} strokeWidth={2.2} />
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--n-text-2)', lineHeight: 1.25 }}>{i.rotulo}</span>
              </div>
              <div className="cnum" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.6px', marginTop: 6, color: 'var(--n-text)' }}>{fmt(meu)}</div>
              <div style={{ height: 5, borderRadius: 3, background: 'var(--n-border-2)', overflow: 'hidden', marginTop: 6 }}>
                <div style={{ width: `${Math.min(100, pct ?? 0)}%`, height: '100%', background: forte(i.tom) }} />
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--n-text-3)', marginTop: 5, lineHeight: 1.35 }}>{legenda}</div>
            </div>
          )
        })}
      </div>
      {!impressao && (r.meu.naoRealizadas > 0 || r.meu.esperaLigacaoMin != null || r.meu.contatos) && (
        <div style={{ fontSize: 11, color: 'var(--n-text-3)', marginTop: 10, lineHeight: 1.5 }}>
          {[ITENS_RECEPCAO[1].nota(r.meu), r.meu.contatos && `contatos do CIDE: ${r.meu.contatos.editados} editados, ${r.meu.contatos.novos} novos, ${r.meu.contatos.removidos} removidos`]
            .filter(Boolean).join(' · ')}
        </div>
      )}
    </Cartao>
  )
}
