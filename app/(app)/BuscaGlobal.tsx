'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Building2 } from 'lucide-react'
import { useTalentData } from '@/lib/ui/data'
import Avatar from './Avatar'
import { buscar, type ResultadoBusca } from '@/lib/ui/busca'

/* ============================================================
   A BUSCA DO TOPO — pessoas e departamentos (11/09/2026).

   Pedido do dono: "dê uma funcionalidade real ao campo de busca — hoje, se
   escrevemos o nome de um departamento ou de uma pessoa, ele não entrega nada".
   O campo existia desde o primeiro desenho e só guardava o que se digitava.

   ⚠️ Busca no dataset que a sessão JÁ recebeu (`useTalentData`), que passou pela
   régua de alcance no servidor (`lib/alcance.ts`): quem busca só encontra quem já
   podia ver. Nenhuma rota nova, nenhuma segunda régua.

   A conta mora em `lib/ui/busca.ts` (pura), provada por `scripts/ensaio-busca.ts`.
   ============================================================ */

export default function BuscaGlobal() {
  const data = useTalentData()
  const router = useRouter()
  const [q, setQ] = useState('')
  const [aberta, setAberta] = useState(false)
  const [ativo, setAtivo] = useState(0)
  const caixa = useRef<HTMLDivElement>(null)

  // Fecha ao clicar fora.
  useEffect(() => {
    const h = (e: MouseEvent) => { if (caixa.current && !caixa.current.contains(e.target as Node)) setAberta(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const resultados = useMemo(() => buscar(data, q), [q, data])

  useEffect(() => { setAtivo(0) }, [q])

  const ir = (r: ResultadoBusca) => { setAberta(false); setQ(''); router.push(r.href) }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setAberta(false); (e.target as HTMLInputElement).blur(); return }
    if (!resultados.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setAberta(true); setAtivo((i) => (i + 1) % resultados.length) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((i) => (i - 1 + resultados.length) % resultados.length) }
    if (e.key === 'Enter') { e.preventDefault(); ir(resultados[Math.min(ativo, resultados.length - 1)]) }
  }

  const mostrar = aberta && q.trim().length > 0
  const nSetores = resultados.filter((r) => r.tipo === 'setor').length

  return (
    <div ref={caixa} style={{ position: 'relative', width: '100%' }}>
      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-mute)', display: 'flex', pointerEvents: 'none' }}><Search size={16} /></span>
      <input
        placeholder="Buscar funcionários, departamentos…"
        value={q}
        onChange={(e) => { setQ(e.target.value); setAberta(true) }}
        onFocus={() => setAberta(true)}
        onKeyDown={onKey}
        role="combobox" aria-expanded={mostrar} aria-controls="busca-resultados" aria-autocomplete="list"
        aria-activedescendant={mostrar && resultados[ativo] ? `busca-${ativo}` : undefined}
        style={{ width: '100%', height: 38, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '0 12px 0 38px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
      />
      {mostrar && (
        <div id="busca-resultados" role="listbox"
          style={{ position: 'absolute', top: 44, left: 0, right: 0, zIndex: 70, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', boxShadow: '0 12px 32px rgba(0,0,0,.18)', maxHeight: 'min(70vh, 460px)', overflowY: 'auto', padding: 6 }}>
          {resultados.length === 0 ? (
            <div style={{ padding: '12px 10px', fontSize: 12.5, color: 'var(--text-dim)' }}>
              Ninguém e nenhum setor com “{q.trim()}” no nome.
            </div>
          ) : resultados.map((r, i) => (
            <div key={`${r.tipo}-${r.id}`}>
              {(i === 0 || (i === nSetores && nSetores > 0)) && (
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-mute)', padding: '8px 10px 4px' }}>
                  {r.tipo === 'setor' ? 'Departamentos' : 'Pessoas'}
                </div>
              )}
              <div id={`busca-${i}`} role="option" aria-selected={i === ativo}
                onMouseEnter={() => setAtivo(i)}
                onMouseDown={(e) => { e.preventDefault(); ir(r) }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', background: i === ativo ? 'var(--surface-2)' : 'transparent' }}>
                {r.tipo === 'setor' ? (
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-2)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Building2 size={15} /></span>
                ) : (
                  <Avatar id={r.id} hasAvatar={r.hasAvatar} initials={r.initials} color={r.color} size={28} />
                )}
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.nome}{r.tipo === 'pessoa' && r.saiu && <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-mute)' }}> · já saiu</span>}
                  </span>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--text-mute)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.detalhe}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
