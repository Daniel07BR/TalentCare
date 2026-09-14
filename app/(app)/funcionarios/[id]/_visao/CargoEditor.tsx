'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheck, Check, Pencil, X } from 'lucide-react'
import { forte, suave } from '../../../_visao/ui'

/* ============================================================
   CARGO OFICIAL — campo editável no hero (14/09/2026).

   Pedido do dono: "acrescente um campo editável com o cargo da pessoa; isso vou
   subir posteriormente, mas preciso deixar o campo pronto".

   ⚠️ É o cargo do DP, gravado em `users.cargo_oficial`. O "Colaborador" logo
   abaixo do nome é o cargo do NEXUS (`job_title`), que o sync reescreve e que
   decide o acesso — por isso os dois não se misturam.
   ⚠️ Vazio diz "a informar", nunca some: o campo tem de estar à vista para a
   carga que vem depois ser conferida pessoa a pessoa.
   ============================================================ */
export function CargoEditor({ id, cargo }: { id: string; cargo: string | null }) {
  const router = useRouter()
  const [valor, setValor] = useState(cargo)
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(cargo ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => { setValor(cargo) }, [cargo])

  const abrir = () => { setTexto(valor ?? ''); setErro(null); setEditando(true) }
  async function salvar() {
    setSalvando(true); setErro(null)
    try {
      const r = await fetch('/api/admin/cargo-set', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, cargo: texto }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setErro(r.status === 403 ? 'Só o dono do sistema pode editar o cargo.' : (j.error ?? 'Não foi possível salvar.')); return }
      setValor(j.cargo ?? null)
      setEditando(false)
      router.refresh()
    } catch {
      setErro('Não foi possível salvar — verifique a conexão.')
    } finally {
      setSalvando(false)
    }
  }

  const icone = (
    <span style={{ width: 28, height: 28, borderRadius: 8, background: suave('purple'), color: forte('purple'), display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
      <BadgeCheck size={15} strokeWidth={2.2} />
    </span>
  )

  if (!editando) {
    return (
      <button type="button" onClick={abrir} title="Editar o cargo oficial"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '6px 12px 6px 6px', background: 'color-mix(in srgb, var(--n-card) 80%, transparent)', border: `1px ${valor ? 'solid' : 'dashed'} var(--n-border)`, borderRadius: 12, minWidth: 0, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
        {icone}
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 10.5, color: 'var(--n-text-3)', lineHeight: 1.2 }}>Cargo</span>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', color: valor ? 'var(--n-text)' : 'var(--n-text-3)', fontStyle: valor ? 'normal' : 'italic' }}>
            {valor ?? 'a informar'}
          </span>
        </span>
        <Pencil size={13} color="var(--n-text-3)" style={{ marginLeft: 2 }} />
      </button>
    )
  }

  const botao: React.CSSProperties = { width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, cursor: 'pointer', flex: 'none' }
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 6px', background: 'var(--n-card)', border: '1px solid var(--n-blue)', boxShadow: '0 0 0 3px var(--n-blue-soft)', borderRadius: 12 }}>
        {icone}
        <label style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontSize: 10.5, color: 'var(--n-text-3)', lineHeight: 1.2 }}>Cargo</span>
          <input autoFocus value={texto} maxLength={120} placeholder="Ex.: Analista Contábil Pleno" disabled={salvando}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') salvar(); if (e.key === 'Escape') setEditando(false) }}
            style={{ width: 220, maxWidth: '52vw', border: 'none', outline: 'none', background: 'transparent', color: 'var(--n-text)', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, padding: 0 }} />
        </label>
        <button type="button" onClick={salvar} disabled={salvando} title="Salvar (Enter)" aria-label="Salvar cargo"
          style={{ ...botao, border: 'none', background: 'var(--n-blue)', color: '#fff', opacity: salvando ? 0.6 : 1 }}><Check size={16} /></button>
        <button type="button" onClick={() => setEditando(false)} disabled={salvando} title="Cancelar (Esc)" aria-label="Cancelar"
          style={{ ...botao, border: '1px solid var(--n-border)', background: 'var(--n-card-2)', color: 'var(--n-text-2)' }}><X size={16} /></button>
      </span>
      {erro && <span style={{ fontSize: 11, color: 'var(--n-red)' }}>{erro}</span>}
    </span>
  )
}
