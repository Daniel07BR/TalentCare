'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, ChevronRight, Truck, Upload } from 'lucide-react'
import { ENTREGAS_DEPT_ID } from '@/lib/entregas'
import type { SecaoProps } from './tipos'

const botao: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 7, minHeight: 36, padding: '0 14px',
  background: 'var(--n-card)', border: '1px solid var(--n-border)', borderRadius: 10,
  color: 'var(--n-text)', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
}

export function Cabecalho({ m }: SecaoProps) {
  const router = useRouter()
  return (
    <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
        <span style={{ width: 60, height: 60, borderRadius: 16, background: 'var(--n-blue-soft)', color: 'var(--n-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <Building2 size={30} strokeWidth={2} />
        </span>
        <div style={{ minWidth: 0 }}>
          <nav aria-label="Caminho" style={{ fontSize: 12, color: 'var(--n-text-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Link href="/departamentos" style={{ color: 'inherit' }}>Departamentos</Link>
            <ChevronRight size={13} />
          </nav>
          <h1 style={{ margin: '2px 0 0', fontSize: 30, fontWeight: 800, letterSpacing: '-.9px', color: 'var(--n-text)' }}>{m.setor.nome}</h1>
          <div style={{ fontSize: 12.5, color: 'var(--n-text-2)', marginTop: 2 }}>
            Visão geral do setor • Acompanhe os principais indicadores, desempenho da equipe e produtividade
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* ⚠️ Sem atalho para o relatório de antes (`./completo`): o dono, em
            11/09/2026 — "a página para a qual ele leva é a que substituímos".
            A rota segue existindo por endereço, sem porta na tela. */}
        {m.setor.id === ENTREGAS_DEPT_ID && (
          <button type="button" style={botao} onClick={() => router.push('/entregas')}><Truck size={15} /> Área da mensageria</button>
        )}
        {m.setor.podeGerir && (
          <button type="button" style={botao} onClick={() => router.push(`/servicos?setor=${m.setor.id}`)}>
            <Upload size={15} /> {m.servicos?.temFonte ? 'Atualizar planilha' : 'Enviar planilha'}
          </button>
        )}
      </div>
    </header>
  )
}
