'use client'
import { Bug, Plus, Sparkles, Wrench, type LucideIcon } from 'lucide-react'
import type { Melhorias } from '@/lib/melhorias'
import { Cartao, forte, suave } from '../../../_visao/ui'
import type { Tom } from '../../../_visao/tipos'

/* ============================================================
   CHAMADOS ATENDIDOS — o card da ficha e do PDF (04/11/2026). Ver `lib/melhorias.ts`.
   Os mesmos três números e ícones do "Quem atendeu" no Nexus. Só sai o que não está zerado.
   ============================================================ */

const ITENS: { chave: keyof Melhorias; rotulo: string; Icone: LucideIcon; tom: Tom }[] = [
  { chave: 'erros', rotulo: 'Erros corrigidos', Icone: Bug, tom: 'red' },
  { chave: 'melhorias', rotulo: 'Melhorias', Icone: Sparkles, tom: 'blue' },
  { chave: 'criacoes', rotulo: 'Criações', Icone: Plus, tom: 'green' },
]

export function ChamadosAtendidos({ c, periodo, impressao = false }: { c: Melhorias; periodo: string; impressao?: boolean }) {
  const itens = ITENS.filter((i) => c[i.chave] > 0)
  return (
    <Cartao titulo="Chamados atendidos" Icone={Wrench}
      sub={`${periodo} · Quadro das Melhorias do Nexus · não entra na nota`}
      style={impressao ? { breakInside: 'avoid' } : undefined}>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(min(190px, 100%), 1fr))' }}>
        {itens.map((i) => (
          <div key={i.chave} style={{ background: 'var(--n-card-2)', border: '1px solid var(--n-border-2)', borderRadius: 12, padding: '11px 12px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, background: suave(i.tom), color: forte(i.tom), display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <i.Icone size={14} strokeWidth={2.2} />
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--n-text-2)', lineHeight: 1.25 }}>{i.rotulo}</span>
            </div>
            <div className="cnum" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.6px', marginTop: 6, color: 'var(--n-text)' }}>{c[i.chave].toLocaleString('pt-BR')}</div>
          </div>
        ))}
      </div>
    </Cartao>
  )
}
