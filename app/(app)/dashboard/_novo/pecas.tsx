'use client'
import type { LucideIcon } from 'lucide-react'
import v from '../../_visao/visao.module.css'
import p from './painel.module.css'
import type { Linha } from '@/lib/painel/visao'

/* As peças que as seções do painel novo repetem. Cor SEMPRE por token
   (`var(--n-*)`): o tema escuro troca os tokens, nunca o componente. */

export const num = (n: number) => n.toLocaleString('pt-BR')

/** O ícone do WhatsApp (o lucide não tem a marca). */
export const IconeWhatsapp = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#25D366" aria-hidden="true" style={{ flex: 'none', marginTop: 1 }}>
    <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2Zm5.6 14.1c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.8-.6-3-1.3-5-4.4-5.2-4.6-.1-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.5.1.3.6 1.1 1.4 1.7 1 .9 1.8 1.2 2 1.3.3.1.4.1.6-.1l.7-.9c.2-.2.4-.2.6-.1l1.8.9c.2.1.4.2.5.3.1.2.1.6-.1 1.2Z" />
  </svg>
)

type CabecaProps = {
  Icone?: LucideIcon; icone?: React.ReactNode; cor?: string
  titulo: string; sub?: React.ReactNode
}

function Titulo({ Icone, icone, cor = 'var(--n-blue)', titulo, sub }: CabecaProps) {
  return (
    <>
      {icone ?? (Icone && <Icone size={18} color={cor} style={{ flex: 'none', marginTop: 1 }} />)}
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, letterSpacing: '-.2px', color: 'var(--n-text)' }}>{titulo}</span>
        {sub && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--n-text-3)', marginTop: 2, lineHeight: 1.4 }}>{sub}</span>}
      </span>
    </>
  )
}

/** O cabeçalho de um cartão, com uma ação opcional no canto ("ver ›"). */
export function Cabeca({ acao, ...t }: CabecaProps & { acao?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
      <Titulo {...t} />
      {acao}
    </div>
  )
}

/** O cabeçalho que É o botão: clicar no título do sistema abre a janela da casa inteira. */
export function CabecaBotao({ onClick, onPreparar, rotuloAcao = 'ver resumo ›', dica, ...t }: CabecaProps & {
  onClick: () => void; onPreparar?: () => void; rotuloAcao?: string; dica?: string
}) {
  return (
    <button type="button" className={p.cabecaBotao} onClick={onClick}
      onMouseEnter={onPreparar} onFocus={onPreparar} title={dica}>
      <Titulo {...t} />
      <span className={p.verResumo}>{rotuloAcao}</span>
    </button>
  )
}

/** Link de canto ("ver ›", "ver todos ›"). */
export function Acao({ onClick, children, dica }: { onClick: () => void; children: React.ReactNode; dica?: string }) {
  return (
    <button type="button" onClick={onClick} title={dica} className={v.acao}
      style={{ flex: 'none', background: 'none', border: 'none', color: 'var(--n-blue)', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '0 2px', minHeight: 24 }}>
      {children}
    </button>
  )
}

/**
 * As barras por setor. Cada linha com `id` e `abrir` vira botão (a janela do
 * sistema só com aquele setor); sem `id`, é só leitura.
 * ⚠️ A barra é relativa ao MAIOR da lista — é comparação entre linhas, não escala absoluta.
 */
export function Barras({ linhas, cor, sufixo = '', abrir, dica }: {
  linhas: Linha[]; cor?: string; sufixo?: string
  abrir?: (id: string, nome: string) => void
  dica?: (l: Linha) => string
}) {
  const max = Math.max(1, ...linhas.map((l) => l.valor))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {linhas.map((l) => {
        const clica = !!(abrir && l.id)
        const conteudo = (
          <>
            <span style={{ fontSize: 12, color: 'var(--n-text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.nome}</span>
            <span style={{ height: 8, background: 'var(--n-card-2)', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--n-border-2)' }}>
              <span className="cbar" style={{ display: 'block', height: '100%', width: `${(l.valor / max) * 100}%`, background: cor ?? l.cor, borderRadius: 20 }} />
            </span>
            <span className="cnum" style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap', color: l.valor > 0 ? 'var(--n-text)' : 'var(--n-text-3)' }}>{num(l.valor)}{sufixo}</span>
          </>
        )
        return clica
          ? <button key={l.nome} type="button" className={p.linhaSetor} onClick={() => abrir!(l.id!, l.nome)} title={dica?.(l) ?? `Abrir só ${l.nome}`}>{conteudo}</button>
          : <div key={l.nome} className={p.linhaSetor} title={dica?.(l)}>{conteudo}</div>
      })}
    </div>
  )
}

/** Uma tabela por setor com N colunas numéricas e a linha de total. */
export function Tabela<R extends { id: string | null; nome: string }>({ colunas, linhas, total, abrir }: {
  colunas: { rotulo: string; cor: string; valor: (r: R) => number }[]
  linhas: R[]
  total: number[]
  abrir?: (id: string, nome: string) => void
}) {
  /* ⚠️ Colunas de LARGURA FIXA: cada linha é uma grade própria, e com `auto` cada
     uma media a sua — os números saíam desalinhados de uma linha para a outra. */
  const larg = colunas.length >= 4 ? 58 : colunas.length === 3 ? 64 : 76
  const grade = `minmax(0, 1fr) repeat(${colunas.length}, ${larg}px)`
  return (
    <div style={{ fontSize: 12 }}>
      <div className={p.linhaTabela} style={{ gridTemplateColumns: grade, paddingTop: 0 }}>
        <span />
        {colunas.map((c) => (
          <span key={c.rotulo} style={{ textAlign: 'right', fontSize: 10.5, fontWeight: 600, color: 'var(--n-text-3)', whiteSpace: 'nowrap' }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: c.cor, marginRight: 4, verticalAlign: 1 }} />{c.rotulo}
          </span>
        ))}
      </div>
      {linhas.map((r) => {
        const cel = (
          <>
            <span style={{ color: 'var(--n-text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nome}</span>
            {colunas.map((c) => {
              const x = c.valor(r)
              return <span key={c.rotulo} className="cnum" style={{ textAlign: 'right', fontWeight: 700, color: x > 0 ? 'var(--n-text)' : 'var(--n-text-3)' }}>{num(x)}</span>
            })}
          </>
        )
        return abrir && r.id
          ? <button key={r.nome} type="button" className={p.linhaTabela} style={{ gridTemplateColumns: grade }} onClick={() => abrir(r.id!, r.nome)} title={`Abrir só ${r.nome}`}>{cel}</button>
          : <div key={r.nome} className={p.linhaTabela} style={{ gridTemplateColumns: grade }}>{cel}</div>
      })}
      <div className={p.linhaTabela} style={{ gridTemplateColumns: grade, borderBottom: 'none', paddingTop: 8 }}>
        <span style={{ fontWeight: 700 }}>Total</span>
        {colunas.map((c, i) => <span key={c.rotulo} className="cnum" style={{ textAlign: 'right', fontWeight: 800, color: c.cor }}>{num(total[i])}</span>)}
      </div>
    </div>
  )
}

/** Blocos de esqueleto — a forma do conteúdo enquanto os números do período chegam. */
export function Esqueleto({ linhas = 5, alto = 18 }: { linhas?: number; alto?: number }) {
  return (
    <div aria-busy="true" aria-label="Carregando os números do período" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {Array.from({ length: linhas }, (_, i) => <div key={i} className="esqueleto" style={{ height: alto }} />)}
    </div>
  )
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12.5, color: 'var(--n-text-3)', padding: '8px 0' }}>{children}</div>
}
