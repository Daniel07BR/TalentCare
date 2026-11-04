'use client'
import Link from 'next/link'
import {
  BadgeDollarSign, Building2, CalendarCheck, CircleEllipsis, ClipboardCheck, FilePen, FilePlus2, FileText, Landmark, ListPlus, MessageCircle,
  MessageSquareText, Pencil, Percent, Sparkles, Table2, UserPlus, Users, type LucideIcon,
} from 'lucide-react'
import { INICIO_DO_REGISTRO, type Atividades, type PessoaDoImotec } from '@/lib/imotec'
import { Cartao, forte, suave } from './ui'
import type { Tom } from './tipos'

/* ============================================================
   ATIVIDADES NO IMOTEC — o card da ficha, do PDF e do setor (04/11/2026). Ver `lib/imotec.ts`.
   Só sai o que não está zerado. Ação nova do Imotec sem nome aqui aparece como "Outras alterações".
   ============================================================ */

type Item = { chave: string; rotulo: string; curto: string; Icone: LucideIcon; tom: Tom; nota?: string }

const ITENS: Item[] = [
  { chave: 'pagamentos', rotulo: 'Pagamentos registrados', curto: 'pagamentos', Icone: BadgeDollarSign, tom: 'green' },
  { chave: 'pagamentosCorrigidos', rotulo: 'Pagamentos corrigidos', curto: 'pagamentos corrigidos', Icone: Pencil, tom: 'amber' },
  { chave: 'alugueisGerados', rotulo: 'Aluguéis gerados', curto: 'aluguéis gerados', Icone: CalendarCheck, tom: 'blue', nota: 'muitos de uma vez, na geração do mês' },
  { chave: 'lancamentos', rotulo: 'Lançamentos no aluguel', curto: 'lançamentos', Icone: ListPlus, tom: 'purple', nota: 'incluídos, alterados e retirados' },
  { chave: 'cobrancas', rotulo: 'Cobranças no WhatsApp', curto: 'cobranças', Icone: MessageCircle, tom: 'whats' },
  { chave: 'alugueisAlterados', rotulo: 'Aluguéis alterados', curto: 'aluguéis alterados', Icone: FileText, tom: 'orange' },
  { chave: 'contratosNovos', rotulo: 'Contratos novos', curto: 'contratos novos', Icone: FilePlus2, tom: 'green' },
  { chave: 'contratosAlterados', rotulo: 'Contratos alterados', curto: 'contratos alterados', Icone: FilePen, tom: 'orange' },
  { chave: 'reajustes', rotulo: 'Reajustes aplicados', curto: 'reajustes', Icone: Percent, tom: 'purple' },
  { chave: 'imoveisNovos', rotulo: 'Imóveis novos', curto: 'imóveis novos', Icone: Building2, tom: 'green' },
  { chave: 'imoveisAlterados', rotulo: 'Imóveis alterados', curto: 'imóveis alterados', Icone: Building2, tom: 'orange' },
  { chave: 'pessoasNovas', rotulo: 'Pessoas novas', curto: 'pessoas novas', Icone: UserPlus, tom: 'green', nota: 'locatários, proprietários e fiadores' },
  { chave: 'pessoasAlteradas', rotulo: 'Pessoas alteradas', curto: 'pessoas alteradas', Icone: Users, tom: 'orange', nota: 'locatários, proprietários e fiadores' },
  { chave: 'iptu', rotulo: 'Registros de IPTU', curto: 'IPTU', Icone: Landmark, tom: 'blue' },
  { chave: 'vistorias', rotulo: 'Registros em vistorias', curto: 'vistorias', Icone: ClipboardCheck, tom: 'pink' },
  { chave: 'leads', rotulo: 'Leads da Lais', curto: 'leads', Icone: Sparkles, tom: 'purple' },
  { chave: 'tabelas', rotulo: 'Índices e tabelas', curto: 'tabelas', Icone: Table2, tom: 'blue' },
  { chave: 'anotacoes', rotulo: 'Anotações', curto: 'anotações', Icone: MessageSquareText, tom: 'amber' },
]
const OUTRAS: Item = { chave: 'outras', rotulo: 'Outras alterações', curto: 'outras', Icone: CircleEllipsis, tom: 'blue' }
const CONHECIDAS = new Set(ITENS.map((i) => i.chave))

function valores(a: Atividades): [Item, number][] {
  const saida = ITENS.filter((i) => a[i.chave] > 0).map((i): [Item, number] => [i, a[i.chave]])
  const outras = Object.entries(a).filter(([k]) => !CONHECIDAS.has(k)).reduce((s, [, v]) => s + v, 0)
  return outras > 0 ? [...saida, [OUTRAS, outras]] : saida
}

export function AtividadesNoImotec({ total, pessoas, periodo, fromDay, impressao = false, style }: {
  total: Atividades; pessoas?: PessoaDoImotec[]; periodo?: string; fromDay: string; impressao?: boolean; style?: React.CSSProperties
}) {
  const sub = [periodo, 'registros do Imotec', fromDay < INICIO_DO_REGISTRO && 'o sistema registra quem fez desde 16/10/2026', 'não entra na nota']
    .filter(Boolean).join(' · ')
  return (
    <Cartao titulo="Atividades no Imotec" Icone={Building2} sub={sub} style={impressao ? { breakInside: 'avoid', ...style } : style}>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(min(190px, 100%), 1fr))' }}>
        {valores(total).map(([i, v]) => (
          <div key={i.chave} style={{ background: 'var(--n-card-2)', border: '1px solid var(--n-border-2)', borderRadius: 12, padding: '11px 12px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, background: suave(i.tom), color: forte(i.tom), display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <i.Icone size={14} strokeWidth={2.2} />
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--n-text-2)', lineHeight: 1.25 }}>{i.rotulo}</span>
            </div>
            <div className="cnum" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.6px', marginTop: 6, color: 'var(--n-text)' }}>{v.toLocaleString('pt-BR')}</div>
            {i.nota && <div style={{ fontSize: 10.5, color: 'var(--n-text-3)', marginTop: 3, lineHeight: 1.35 }}>{i.nota}</div>}
          </div>
        ))}
      </div>
      {pessoas && pessoas.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--n-text)', marginBottom: 6 }}>Quem fez</div>
          {pessoas.map((p) => (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 210px) minmax(0, 1fr)', gap: 10, padding: '6px 0', borderTop: '1px solid var(--n-border-2)', fontSize: 12.5 }}>
              <Link href={`/funcionarios/${p.id}`} style={{ fontWeight: 700, color: 'var(--n-text)', textDecoration: 'none' }}>{p.nome}</Link>
              <span style={{ color: 'var(--n-text-2)', lineHeight: 1.45 }}>{valores(p.atividades).map(([i, v]) => `${v.toLocaleString('pt-BR')} ${i.curto}`).join(' · ')}</span>
            </div>
          ))}
        </div>
      )}
    </Cartao>
  )
}
