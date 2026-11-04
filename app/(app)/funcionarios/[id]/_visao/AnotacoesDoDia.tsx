'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { Anotacao } from '@/lib/anotacoes-do-fluxo'

/* A JANELA DO DIA do calendário da ficha (04/11/2026). O texto vem do Fluxo ao abrir, e não fica guardado aqui. */

const TIPO: Record<string, string> = {
  ajuste: 'Ajuste da Recepção', aviso: 'Aviso', fora: 'Fora do expediente', atraso: 'Atraso', falta_dp: 'Falta do DP',
  advertencia: 'Advertência', suspensao: 'Suspensão',
}
const dataLonga = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
const quando = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function AnotacoesDoDia({ pessoaId, dia, fechar }: { pessoaId: string; dia: string; fechar: () => void }) {
  const [lista, setLista] = useState<Anotacao[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    fetch(`/api/anotacoes-do-dia?${new URLSearchParams({ id: pessoaId, dia })}`, { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json().catch(() => null)
        if (!vivo) return
        if (r.ok) setLista(d?.anotacoes ?? [])
        else setErro(d?.error ?? 'Não foi possível ler as anotações.')
      })
      .catch(() => { if (vivo) setErro('Não foi possível ler as anotações.') })
    return () => { vivo = false }
  }, [pessoaId, dia])

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [fechar])

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Anotações de ${dataLonga(dia)}`} onClick={fechar}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15, 23, 42, .45)' }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(560px, 100%)', maxHeight: '85vh', overflow: 'auto', padding: 20, borderRadius: 16, background: 'var(--surface, #fff)', color: 'var(--text, #0f172a)', boxShadow: '0 20px 50px rgba(15, 23, 42, .25)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Anotações do dia</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-dim, #475569)', marginTop: 2, textTransform: 'capitalize' }}>{dataLonga(dia)}</div>
          </div>
          <button type="button" onClick={fechar} aria-label="Fechar"
            style={{ display: 'flex', padding: 6, border: 'none', borderRadius: 8, background: 'transparent', color: 'inherit', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14, fontSize: 13 }}>
          {erro && <div style={{ color: 'var(--danger, #e5484d)' }}>{erro}</div>}
          {!erro && !lista && <div style={{ color: 'var(--text-dim, #475569)' }}>Lendo no Fluxo…</div>}
          {lista?.length === 0 && <div style={{ color: 'var(--text-dim, #475569)' }}>Não há anotação registrada neste dia no Fluxo.</div>}
          {lista?.map((a) => (
            <div key={a.id} style={{ padding: '10px 12px', border: '1px solid var(--border, #e6eaf2)', borderRadius: 12, opacity: a.riscado ? 0.65 : 1 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.3px', textTransform: 'uppercase', color: 'var(--text-mute, #8a97ad)' }}>{TIPO[a.tipo] ?? a.tipo}</div>
              <div style={{ marginTop: 3, textDecoration: a.riscado ? 'line-through' : undefined }}>
                <b>{a.titulo}</b>{a.frase && <span style={{ color: 'var(--text-dim, #475569)' }}> · {a.frase}</span>}
              </div>
              {a.texto && <div style={{ marginTop: 4, lineHeight: 1.45 }}>{a.texto}</div>}
              <div style={{ marginTop: 5, fontSize: 11.5, color: 'var(--text-mute, #8a97ad)', lineHeight: 1.4 }}>
                {[a.detalhe, a.por && `por ${a.por}`, quando(a.em)].filter(Boolean).join(' · ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
