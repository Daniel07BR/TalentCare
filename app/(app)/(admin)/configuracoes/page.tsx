import Link from 'next/link'
import { prisma } from '@/lib/db/prisma'
import FontesDeDados from './Fontes'
import UsuariosSecao from '../usuarios/Secao'
import EquipeSecao from '../equipe/Secao'
import EscolaridadeSecao from '../escolaridade/Secao'
import PontoSecao from '../ponto/Secao'
import AvaliadoresPage from '../../avaliadores/page'

export const dynamic = 'force-dynamic'

/* ============================================================
   CONFIGURAÇÕES — a área administrativa inteira, numa página só (11/09/2026).

   Pedido do dono: "em configurações, junte todas as opções do painel de
   administração, assim deixamos numa página só tudo que for área administrativa".
   Cada aba é a PRÓPRIA tela de antes (`<área>/Secao.tsx`), não uma cópia; os
   endereços antigos (`/usuarios`, `/equipe`, `/escolaridade`, `/ponto`) levam à
   aba certa. `/avaliadores` segue existindo sozinho também, porque a tela de
   Avaliações leva até ele e a Diretoria (não só o dono) o usa.

   ⚠️ SAIU daqui, por ser FICÇÃO (regra (d) da casa):
   - "Pesos do score de performance": os controles não gravavam nada — o estado
     morria no navegador — e a "pré-visualização" media um score que ninguém
     calculava com aqueles pesos. A nota de verdade é a PONTUAÇÃO, com a régua de
     cada setor, editada na área do setor (decisão do dono).
   - "Sistemas conectados": "Sync há 8 min" escrito à mão; virou "Fontes de dados".
   - "Gestão de acesso": perfis e contagens de membros escritos à mão.

   Só o DONO entra (o `(admin)/layout.tsx`).
   ============================================================ */

const ABAS = [
  { chave: 'fontes', rotulo: 'Fontes de dados' },
  { chave: 'usuarios', rotulo: 'Usuários' },
  { chave: 'equipe', rotulo: 'Equipe interna' },
  { chave: 'escolaridade', rotulo: 'Escolaridade' },
  { chave: 'ponto', rotulo: 'Casar ponto' },
  { chave: 'avaliadores', rotulo: 'Quem avalia' },
] as const
type Aba = (typeof ABAS)[number]['chave']

export default async function Configuracoes({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { aba } = await searchParams
  const atual: Aba = ABAS.some((a) => a.chave === aba) ? (aba as Aba) : 'fontes'
  /* O que pede atenção, dito na própria aba: nomes do ponto esperando vínculo. */
  const pontoPendente = await prisma.pontoStaging.count({ where: { status: 'pending' } })

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Administração</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px' }}>Configurações</h1>
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 4 }}>Tudo o que é administrativo, num lugar só.</div>
      </div>

      <nav aria-label="Áreas da administração" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
        {ABAS.map((a) => {
          const ativa = a.chave === atual
          return (
            <Link key={a.chave} href={`/configuracoes?aba=${a.chave}`} aria-current={ativa ? 'page' : undefined} className="tc-btn"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600,
                padding: '7px 14px', borderRadius: 20, border: '1px solid var(--border)', textDecoration: 'none',
                background: ativa ? 'var(--accent)' : 'var(--surface-2)', color: ativa ? '#1a1205' : 'var(--text-dim)',
              }}>
              {a.rotulo}
              {a.chave === 'ponto' && pontoPendente > 0 && (
                <span title={`${pontoPendente} nomes do ponto esperando vínculo`}
                  style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: ativa ? 'rgba(0,0,0,.15)' : 'var(--accent)', color: '#1a1205' }}>
                  {pontoPendente}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {atual === 'fontes' && <FontesDeDados />}
      {atual === 'usuarios' && <UsuariosSecao />}
      {atual === 'equipe' && <EquipeSecao />}
      {atual === 'escolaridade' && <EscolaridadeSecao />}
      {atual === 'ponto' && <PontoSecao />}
      {atual === 'avaliadores' && <AvaliadoresPage />}
    </div>
  )
}
