'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Building2, ClipboardCheck, Award, TrendingUp, AlarmClock,
  GraduationCap, Radio, MessageCircle, MessagesSquare, LifeBuoy, Landmark, Truck,
  MessageSquareText, SlidersHorizontal, X, type LucideIcon,
} from 'lucide-react'
import { telaAtiva, type ChaveTela, type GrupoTelas, type Tela } from '@/lib/ui/menu'
import v from './_visao/visao.module.css'
import s from './navegacao.module.css'

/* ============================================================
   A JANELA DE CARTÕES — o que era o menu lateral (11/09/2026).

   Pedido do dono: "um botão que, ao clicar, abra uma janela no centro da tela
   com os cards de cada opção que temos hoje no menu lateral".

   ⚠️ Os cartões chegam PRONTOS do servidor (`cartoesDoMenu`, no layout): quem
   não é Diretoria recebe a lista vazia e nem o botão aparece. Esta janela não
   decide quem vê o quê — só desenha.

   Teclado: o foco entra na janela (no cartão da tela atual, ou no primeiro), Tab
   e Shift+Tab giram dentro dela, Enter abre, Esc fecha e devolve o foco ao botão.
   Camada 75: acima da lista da busca (70) e abaixo do painel da pessoa (80).
   ============================================================ */

const ICONES: Record<ChaveTela, LucideIcon> = {
  dashboard: LayoutDashboard, funcionarios: Users, departamentos: Building2,
  avaliacoes: ClipboardCheck, 'minha-avaliacao': Award,
  turnover: TrendingUp, assiduidade: AlarmClock, classroom: GraduationCap, radio: Radio,
  whatsapp: MessageCircle, consultoria: MessagesSquare, helpdesk: LifeBuoy, cide: Landmark,
  gerencia: Truck, chat: MessageSquareText, configuracoes: SlidersHorizontal,
}

const corDoIcone = (t: Tela['tom']) =>
  t === 'neutro'
    ? { background: 'var(--n-card-2)', color: 'var(--n-text-2)', border: '1px solid var(--n-border)' }
    : { background: `var(--n-${t}-soft)`, color: `var(--n-${t})` }

export default function JanelaMenu({ grupos, onFechar }: { grupos: GrupoTelas[]; onFechar: () => void }) {
  const pathname = usePathname()
  const janela = useRef<HTMLDivElement>(null)
  const aoAbrir = useRef<string>(pathname)

  useEffect(() => {
    // Quem estava com o foco (o botão da barra) o recebe de volta ao fechar.
    const antes = document.activeElement as HTMLElement | null
    const raiz = janela.current
    const alvo = raiz?.querySelector<HTMLElement>('[aria-current="page"]') ?? raiz?.querySelector<HTMLElement>('a[href]')
    ;(alvo ?? raiz)?.focus()

    // A página de baixo não rola por trás da janela.
    const html = document.documentElement
    const overflowAntes = html.style.overflow
    html.style.overflow = 'hidden'

    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onFechar(); return }
      if (e.key !== 'Tab' || !raiz) return
      const focaveis = [...raiz.querySelectorAll<HTMLElement>('a[href], button')]
      if (!focaveis.length) return
      const primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1]
      if (e.shiftKey && (document.activeElement === primeiro || document.activeElement === raiz)) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus() }
    }
    window.addEventListener('keydown', tecla)
    return () => {
      window.removeEventListener('keydown', tecla)
      html.style.overflow = overflowAntes
      antes?.focus?.()
    }
  }, [onFechar])

  // Trocou de tela (inclusive pelo "voltar" do navegador): a janela já cumpriu o papel.
  useEffect(() => {
    if (pathname !== aoAbrir.current) onFechar()
  }, [pathname, onFechar])

  return (
    <div className={`${v.paleta} ${s.fundo}`} onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar() }}>
      <div ref={janela} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="menu-telas-titulo" className={s.janela}>
        <div className={s.cabeca}>
          <div style={{ minWidth: 0 }}>
            <h2 id="menu-telas-titulo" className={s.titulo}>Ir para</h2>
            <div className={s.subtitulo}>Todas as telas do TalentCare</div>
          </div>
          <button type="button" onClick={onFechar} className={s.fechar} aria-label="Fechar" title="Fechar (Esc)">
            <X size={18} />
          </button>
        </div>
        <nav className={s.corpo} aria-label="Telas do sistema">
          {grupos.map((g) => (
            <section key={g.titulo} className={s.grupo}>
              <h3 className={s.grupoTitulo}>{g.titulo}</h3>
              <div className={s.grade}>
                {g.telas.map((t) => {
                  const Icone = ICONES[t.chave]
                  const ativo = telaAtiva(pathname, t.href)
                  return (
                    <Link key={t.chave} href={t.href} onClick={onFechar}
                      aria-current={ativo ? 'page' : undefined}
                      className={`${s.cartao} ${ativo ? s.cartaoAtivo : ''}`}>
                      <span className={s.icone} style={corDoIcone(t.tom)}><Icone size={20} strokeWidth={2.1} /></span>
                      <span className={s.textos}>
                        <span className={s.nomeTela}>
                          {t.label}
                          {ativo && <span className={s.aqui}>você está aqui</span>}
                        </span>
                        <span className={s.desc}>{t.desc}</span>
                      </span>
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </nav>
      </div>
    </div>
  )
}
