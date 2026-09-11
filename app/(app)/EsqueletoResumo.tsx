/* ============================================================
   O ESQUELETO de um resumo de sistema — o que a janela "Ver detalhes" mostra
   enquanto os números do período chegam.

   ⚠️⚠️ Pedido do dono (11/09/2026): a janela abria pequena com "Carregando…",
   piscava e só então virava a janela cheia — "parece para quem clica que existe
   um erro". E havia pior por baixo: enquanto o período não chegava, o resumo
   calculava com o ACUMULADO de toda a história e trocava em seguida — um número
   errado aparecia por um instante. O esqueleto ocupa o lugar dos dois: tem a
   forma da página (números, cartões, linhas), então nada salta quando ela chega.
   ============================================================ */
const bloco = (h: number, extra?: React.CSSProperties) => (
  <div className="esqueleto" style={{ height: h, ...extra }} />
)

export default function EsqueletoResumo() {
  return (
    // `esqueleto-raiz`: o esqueleto NÃO faz a entrada de cima para baixo (globals.css).
    // Ele aparece duas vezes seguidas (o código baixando, depois os números) e,
    // animando, subiria de novo na troca — o mesmo "pisca" que se quer tirar.
    <div className="esqueleto-raiz" aria-busy="true" aria-label="Carregando os números do período" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        {[0, 1, 2, 3].map((i) => <div key={i}>{bloco(86)}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        {bloco(210)}{bloco(210)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {bloco(18, { width: 220 })}
        {[0, 1, 2, 3, 4].map((i) => <div key={i}>{bloco(34)}</div>)}
      </div>
    </div>
  )
}
