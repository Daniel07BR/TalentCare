'use client'
import Link from 'next/link'

/* O cabeçalho do conceito: "Painel de Indicadores" / "Grupo Itamarathy" e, à
   direita, a janela do filtro e a frescura do espelho mais atrasado. */
export function Cabecalho({ periodo, frescor }: { periodo: string; frescor: { texto: string; detalhe?: string } }) {
  return (
    <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 18 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--n-text-2)', fontWeight: 500 }}>
          Painel de Indicadores
          {/* ⚠️ Prévia: o selo e a volta ficam até o dono mandar trocar. */}
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--n-purple)', background: 'var(--n-purple-soft)', borderRadius: 20, padding: '2px 8px' }}>Prévia do layout novo</span>
          <Link href="/dashboard" style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--n-blue)' }}>Ver versão atual ›</Link>
        </div>
        <h1 style={{ margin: '2px 0 0', fontSize: 28, fontWeight: 800, letterSpacing: '-.8px', color: 'var(--n-text)' }}>Grupo Itamarathy</h1>
        <div style={{ fontSize: 12.5, color: 'var(--n-text-3)', marginTop: 2 }}>Visão geral do desempenho da equipe, serviços e produtividade</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--n-text-2)', textAlign: 'right', lineHeight: 1.6 }}>
        <div>Período: <b style={{ color: 'var(--n-text)' }}>{periodo}</b></div>
        {/* O espelho MAIS atrasado: um painel é tão fresco quanto a fonte mais velha que ele soma. */}
        <div title={frescor.detalhe}>{frescor.texto}</div>
      </div>
    </header>
  )
}
