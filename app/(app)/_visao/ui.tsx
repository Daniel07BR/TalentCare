'use client'
import type { LucideIcon } from 'lucide-react'
import s from './visao.module.css'
import type { Tom } from './tipos'

/* As peças que todas as seções da prévia usam. Cor SEMPRE por token
   (`var(--n-*)`): o tema escuro troca os tokens, nunca o componente. */

export const forte = (t: Tom) => `var(--n-${t})`
export const suave = (t: Tom) => `var(--n-${t}-soft)`

export function Cartao({ titulo, sub, Icone, corIcone, acao, children, className, style }: {
  titulo?: string; sub?: React.ReactNode; Icone?: LucideIcon
  /** A cor do ícone do título (padrão: o azul da paleta). */
  corIcone?: string
  acao?: React.ReactNode
  children: React.ReactNode; className?: string; style?: React.CSSProperties
}) {
  return (
    <section className={`${s.cartao} ${className ?? ''}`} style={style}>
      {titulo && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
          {Icone && <Icone size={18} color={corIcone ?? 'var(--n-blue)'} style={{ flex: 'none', marginTop: 1 }} />}
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: '-.2px', color: 'var(--n-text)' }}>{titulo}</h2>
            {sub && <div style={{ fontSize: 11.5, color: 'var(--n-text-3)', marginTop: 2 }}>{sub}</div>}
          </div>
          {acao}
        </div>
      )}
      {children}
    </section>
  )
}

/** O azulejo de indicador: ícone num quadrado de cor suave, número forte ao lado. */
export function Tile({ Icone, tom, valor, rotulo, nota, className, alto = false, onClick, dica }: {
  Icone: LucideIcon; tom: Tom; valor: React.ReactNode; rotulo: string
  nota?: React.ReactNode; className?: string; alto?: boolean
  /** Abre quem está atrás do número. Sem ele, o azulejo é só leitura. */
  onClick?: () => void
  /** O que o clique faz — vai no `title` e no leitor de tela. */
  dica?: string
}) {
  const Raiz = onClick ? 'button' : 'div'
  return (
    <Raiz className={`${s.cartao} ${onClick ? s.clicavel : ''} ${className ?? ''}`} onClick={onClick}
      type={onClick ? 'button' : undefined} title={dica} aria-label={onClick && dica ? `${rotulo}: ${dica}` : undefined}
      style={{ padding: 16, display: 'flex', flexDirection: alto ? 'column' : 'row', alignItems: alto ? 'flex-start' : 'center', gap: 14, position: 'relative' }}>
      <span style={{ width: 46, height: 46, borderRadius: 12, background: suave(tom), color: forte(tom), display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <Icone size={22} strokeWidth={2.2} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="cnum" style={{ fontSize: alto ? 30 : 23, fontWeight: 800, letterSpacing: '-.8px', lineHeight: 1.1, color: alto ? forte(tom) : 'var(--n-text)' }}>{valor}</div>
        <div style={{ fontSize: 12, color: 'var(--n-text-2)', marginTop: 3 }}>{rotulo}</div>
        {nota && <div style={{ fontSize: 10.5, color: 'var(--n-text-3)', marginTop: 5, lineHeight: 1.4 }}>{nota}</div>}
      </div>
      {onClick && <span className={s.verQuem} aria-hidden="true">ver quem ›</span>}
    </Raiz>
  )
}

/** Número pequeno dentro de um cartão (Chamados, Assiduidade). */
export function Mini({ valor, rotulo, tom, onClick }: { valor: React.ReactNode; rotulo: React.ReactNode; tom?: Tom; onClick?: () => void }) {
  const Raiz = onClick ? 'button' : 'div'
  return (
    <Raiz type={onClick ? 'button' : undefined} onClick={onClick} className={onClick ? s.clicavel : undefined}
      title={onClick ? 'Ver quem' : undefined}
      style={{ background: 'var(--n-card-2)', border: '1px solid var(--n-border-2)', borderRadius: 10, padding: '11px 12px', minWidth: 0 }}>
      <div className="cnum" style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.6px', color: tom ? forte(tom) : 'var(--n-text)' }}>{valor}</div>
      <div style={{ fontSize: 11, color: 'var(--n-text-2)', marginTop: 2, lineHeight: 1.35 }}>{rotulo}</div>
    </Raiz>
  )
}

/** Chip de ocorrência ("2 adv", "3 atr"). */
export function Chip({ tom, children }: { tom: Tom; children: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: suave(tom), color: forte(tom), whiteSpace: 'nowrap' }}>{children}</span>
  )
}

/** Link de ação no canto do cartão ("Ver todos", "Ver detalhes"). */
export function LinkAcao({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={s.acao}
      style={{ flex: 'none', background: 'none', border: 'none', color: 'var(--n-blue)', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '0 2px', minHeight: 28 }}>
      {children}
    </button>
  )
}
