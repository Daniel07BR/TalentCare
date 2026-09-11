'use client'
/* O cabeçalho do conceito: "Painel de Indicadores" / "Grupo Itamarathy" e, à
   direita, a janela do filtro e a frescura do espelho mais atrasado. */
export function Cabecalho({ periodo, frescor }: { periodo: string; frescor: { texto: string; detalhe?: string } }) {
  return (
    <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 18 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: 'var(--n-text-2)', fontWeight: 500 }}>Painel de Indicadores</div>
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
