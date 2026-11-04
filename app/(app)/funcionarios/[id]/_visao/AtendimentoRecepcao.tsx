'use client'
import { Headset, type LucideIcon } from 'lucide-react'
import type { AtendimentoDaPessoa } from '@/lib/recepcao'
import { Cartao, forte, suave } from '../../../_visao/ui'
import type { Tom } from '../../../_visao/tipos'
import { ITENS_RECEPCAO, OUTRAS_TAREFAS, fmt, notaDoLote, parte } from '../../../_visao/recepcao'

/* ============================================================
   ATENDIMENTO DA RECEPÇÃO — o card da ficha (16/10/2026).

   O que a pessoa fez na Recepção no período e a fatia dela no setor. Vem pronto em
   `/api/employee-metrics` (`m.recepcao`), por isso sai igual na tela e no PDF.
   Some quando a pessoa não é da Recepção nem atendeu nela (`recepcao` nulo).

   ⚠️ "N% do setor" usa o MESMO total do card do setor. Nas visitas a soma das fatias passa
   de 100%: a visita com duas atendentes é das duas — por isso ali o texto é "estava em".
   ⚠️ Só aparece, não entra na nota (pedido do Daniel).

   29/10/2026: embaixo, as OUTRAS TAREFAS da Recepção (entrevistas, Controle de faltas,
   prestadores, marcadores) — só quando a pessoa fez alguma no período.

   04/11/2026 (pedido do Daniel): SÓ O QUE NÃO ESTÁ ZERADO. Quem é de outro setor e fez uma visita
   não vê "Ligações recebidas 0"; o card, o azulejo e o texto de baixo só saem com número. Vale na
   tela e no PDF. O card do setor continua com tudo: lá o zero é o total da Recepção.
   ============================================================ */

/** Um número do card. `nota` vai escrita embaixo da legenda; `dica` só no passar do mouse. */
function Azulejo({ Icone, tom, rotulo, valor, pct, legenda, nota, dica }: {
  Icone: LucideIcon; tom: Tom; rotulo: string; valor: number | null; pct: number | null
  legenda: string | null; nota?: string | null; dica?: string | null
}) {
  return (
    <div title={dica ?? nota ?? undefined}
      style={{ background: 'var(--n-card-2)', border: '1px solid var(--n-border-2)', borderRadius: 12, padding: '11px 12px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, background: suave(tom), color: forte(tom), display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <Icone size={14} strokeWidth={2.2} />
        </span>
        <span style={{ fontSize: 11.5, color: 'var(--n-text-2)', lineHeight: 1.25 }}>{rotulo}</span>
      </div>
      <div className="cnum" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.6px', marginTop: 6, color: 'var(--n-text)' }}>{fmt(valor)}</div>
      <div style={{ height: 5, borderRadius: 3, background: 'var(--n-border-2)', overflow: 'hidden', marginTop: 6 }}>
        <div style={{ width: `${Math.min(100, pct ?? 0)}%`, height: '100%', background: forte(tom) }} />
      </div>
      {legenda && <div style={{ fontSize: 10.5, color: 'var(--n-text-3)', marginTop: 5, lineHeight: 1.35 }}>{legenda}</div>}
      {nota && (
        <div style={{ fontSize: 10.5, color: 'var(--n-text-3)', marginTop: 2, lineHeight: 1.35 }}>{nota}</div>
      )}
    </div>
  )
}

export function AtendimentoRecepcao({ r, periodo, impressao = false }: { r: AtendimentoDaPessoa; periodo: string; impressao?: boolean }) {
  /* `auto-fit` esticaria um azulejo sozinho na largura toda; com poucos, a coluna fica fixa. */
  const grade = (n: number) => ({
    display: 'grid', gap: 10,
    gridTemplateColumns: n < 3 ? 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))' : `repeat(auto-fit, minmax(min(${impressao ? 120 : 150}px, 100%), 1fr))`,
  }) as const
  const itens = ITENS_RECEPCAO.filter((i) => (i.valor(r.meu) ?? 0) > 0)
  const tarefas = OUTRAS_TAREFAS.filter((i) => i.valor(r.meu) > 0)
  const detalhe = [
    ITENS_RECEPCAO[1].nota(r.meu),
    r.meu.contatos && r.meu.contatos.atualizados > 0 && `contatos do CIDE: ${r.meu.contatos.editados} editados, ${r.meu.contatos.novos} novos, ${r.meu.contatos.removidos} removidos`,
  ].filter(Boolean).join(' · ')
  return (
    <Cartao titulo="Atendimento da Recepção" Icone={Headset}
      sub={`${periodo} · ligações, visitas, delivery e outras tarefas do Fluxo · contatos do CIDE · não entra na nota`}
      style={impressao ? { breakInside: 'avoid' } : undefined}>
      <div style={grade(itens.length)}>
        {itens.map((i) => {
          const meu = i.valor(r.meu)
          const pct = parte(meu, i.valor(r.setor))
          const legenda = pct == null ? i.nota(r.meu) : i.chave === 'visitas' ? `estava em ${pct}% das visitas` : `${pct}% do setor`
          /* No papel a linha de baixo some: o lote vai escrito no próprio azulejo. */
          const nota = impressao && i.chave === 'feitas' ? notaDoLote(r.meu) : null
          return <Azulejo key={i.chave} Icone={i.Icone} tom={i.tom} rotulo={i.rotulo} valor={meu} pct={pct} legenda={legenda} nota={nota} dica={i.nota(r.meu)} />
        })}
      </div>
      {tarefas.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--n-text)', margin: '14px 0 8px' }}>Outras tarefas da Recepção</div>
          <div style={grade(tarefas.length)}>
            {tarefas.map((i) => {
              const meu = i.valor(r.meu)
              const pct = parte(meu, i.valor(r.setor))
              return (
                <Azulejo key={i.chave} Icone={i.Icone} tom={i.tom} rotulo={i.rotulo} valor={meu} pct={pct}
                  legenda={pct == null ? null : `${pct}% do setor`} nota={i.nota(r.meu)} />
              )
            })}
          </div>
        </>
      )}
      {!impressao && detalhe && (
        <div style={{ fontSize: 11, color: 'var(--n-text-3)', marginTop: 10, lineHeight: 1.5 }}>
          {detalhe}
        </div>
      )}
    </Cartao>
  )
}
