import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { isOwnerEmail } from '@/lib/nexus'
import { quemEh } from '@/lib/avaliacoes/regua'
import FontesDeDados from './Fontes'
import ReguaGeral from './Regua'
import UsuariosSecao from '../(admin)/usuarios/Secao'
import EquipeSecao from '../(admin)/equipe/Secao'
import EscolaridadeSecao from '../(admin)/escolaridade/Secao'
import PontoSecao from '../(admin)/ponto/Secao'
import AvaliadoresPage from '../avaliadores/page'

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

   ⚠️⚠️ QUEM ENTRA (11/09/2026): saiu do grupo `(admin)` — que é só do DONO —
   porque a RÉGUA GERAL DE PONTUAÇÃO mora aqui e a Diretoria também a altera
   (pedido do dono: "só eu e a Diretoria"). A Diretoria vê a Régua e as Fontes;
   as abas de cadastro (usuários, equipe, escolaridade, ponto, quem avalia)
   continuam só do dono — a página as esconde E não as renderiza para quem não é.
   ============================================================ */

const ABAS = [
  { chave: 'regua', rotulo: 'Régua de pontuação', soDono: false },
  { chave: 'fontes', rotulo: 'Fontes de dados', soDono: false },
  { chave: 'usuarios', rotulo: 'Usuários', soDono: true },
  { chave: 'equipe', rotulo: 'Equipe interna', soDono: true },
  { chave: 'escolaridade', rotulo: 'Escolaridade', soDono: true },
  { chave: 'ponto', rotulo: 'Casar ponto', soDono: true },
  { chave: 'avaliadores', rotulo: 'Quem avalia', soDono: true },
] as const
type Aba = (typeof ABAS)[number]['chave']

export default async function Configuracoes({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  /* A trava: Diretoria (ADMIN) entra; o `proxy.ts` já barra o resto, e isto é a
     segunda porta. Dono = allowlist `TALENTCARE_ADMIN_EMAILS`. */
  const session = await auth()
  const uid = (session?.user as { id?: string } | undefined)?.id
  const quem = uid ? await quemEh(uid) : null
  if (!quem || quem.role !== 'ADMIN') redirect('/dashboard')
  const dono = isOwnerEmail(session?.user?.email)
  const visiveis = ABAS.filter((a) => dono || !a.soDono)

  const { aba } = await searchParams
  const atual: Aba = visiveis.some((a) => a.chave === aba) ? (aba as Aba) : 'regua'
  /* O que pede atenção, dito na própria aba: nomes do ponto esperando vínculo. */
  const pontoPendente = dono ? await prisma.pontoStaging.count({ where: { status: 'pending' } }) : 0

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Administração</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px' }}>Configurações</h1>
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 4 }}>Tudo o que é administrativo, num lugar só.</div>
      </div>

      <nav aria-label="Áreas da administração" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
        {visiveis.map((a) => {
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

      {atual === 'regua' && <ReguaGeral />}
      {atual === 'fontes' && <FontesDeDados />}
      {atual === 'usuarios' && <UsuariosSecao />}
      {atual === 'equipe' && <EquipeSecao />}
      {atual === 'escolaridade' && <EscolaridadeSecao />}
      {atual === 'ponto' && <PontoSecao />}
      {atual === 'avaliadores' && <AvaliadoresPage />}
    </div>
  )
}
