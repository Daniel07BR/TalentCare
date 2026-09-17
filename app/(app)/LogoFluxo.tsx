/* ============================================================
   A LOGO DE VERDADE DO FLUXO (pedido do dono, 17/09/2026: "em todos os lugares
   que cita o fluxo, não tem como colocar a img da logo real do sistema?").

   ⚠️ É o ícone do próprio sistema, copiado do `app-icon-fluxo.svg` da marca dele
   (`~/fluxo-marca` no .70): quadrado índigo com as três barras, a última em
   verde-água. Quem abre a ficha reconhece o cartão antes de ler o nome.

   ⚠️⚠️ SVG INLINE, e não `<img>` de um arquivo. Três razões, e a terceira é a
   que decide: (1) não depende de rede nem de um `/public` que pode ficar para
   trás num deploy; (2) não pisca no carregamento, ao lado de ícones que são
   código; (3) **a folha A4 imprime**. Uma imagem externa some na impressão
   quando o navegador não a busca a tempo — e a ficha em PDF é justamente onde
   este cartão precisa aparecer.

   ⚠️ A assinatura imita a dos ícones do `lucide` (`size`, `color`) para entrar
   em todo lugar que já espera um deles. A `color` é IGNORADA de propósito: a
   marca do Fluxo tem cor própria, e deixá-la seguir o tom do cartão devolveria
   um borrão cinza em vez da logo.
   ============================================================ */
export default function LogoFluxo({ size = 18 }: { size?: number; color?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 96 96" role="img" aria-label="Fluxo"
      xmlns="http://www.w3.org/2000/svg" style={{ flex: 'none', display: 'block' }}
    >
      <rect width="96" height="96" rx="20" fill="#4f46e5" />
      <rect x="19" y="46" width="14" height="30" rx="4" fill="#ffffff" />
      <rect x="41" y="32" width="14" height="44" rx="4" fill="#ffffff" />
      <rect x="63" y="18" width="14" height="58" rx="4" fill="#5eead4" />
    </svg>
  )
}
