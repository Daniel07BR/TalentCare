'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Avatar from '../Avatar'

type P = { id: string; nome: string; cargo: string | null; hasAvatar: boolean; deOutroSetor?: string | null }
type Setor = { id: string; nome: string; pessoas: number; pelaDiretoria: boolean; avaliadores: P[]; sugestoes: P[]; equipe: P[] }
type Pessoa = P & { setor: string }
type Dados = { setores: Setor[]; todos: Pessoa[]; semAvaliador: number; pessoasSemAvaliador: number }

export default function AvaliadoresPage() {
  const router = useRouter()
  const [d, setD] = useState<Dados | null>(null)
  const [abrindo, setAbrindo] = useState<string | null>(null)
  const [salvando, setSalvando] = useState<string | null>(null)
  // Busca do seletor aberto — é o que permite pegar alguém de OUTRO setor.
  const [busca, setBusca] = useState('')

  const carregar = useCallback(() => {
    fetch('/api/avaliadores', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setD)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  async function marcarDiretoria(departmentId: string, pelaDiretoria: boolean) {
    setSalvando(departmentId)
    await fetch('/api/avaliadores', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ departmentId, pelaDiretoria }),
    })
    setSalvando(null)
    carregar()
  }

  async function alternar(departmentId: string, userId: string, ligar: boolean) {
    setSalvando(userId)
    await fetch('/api/avaliadores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ departmentId, userId, ligar }),
    })
    setSalvando(null)
    carregar()
  }

  if (!d) return <div style={{ padding: 40, color: 'var(--text-dim)' }}>Carregando…</div>

  return (
    <div className="tc-anim" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <button onClick={() => router.push('/avaliacoes')} className="tc-btn" style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, padding: 0, marginBottom: 18 }}>‹ Voltar às avaliações</button>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Administração · quem pode avaliar</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px' }}>Quem avalia cada setor</h1>
      </div>

      {/*
        ⚠️⚠️ O cargo do Nexus só SUGERE. Quem decide é gente, e a decisão fica
        gravada. Derivar do cargo pareceria mais limpo e seria pior: no dia em que
        um setor ganhasse um segundo "Gestor", o poder de avaliar mudaria de mão
        sozinho, sem autor e sem aviso.
      */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-sm)', padding: '11px 14px', marginBottom: 16, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6 }}>
        <span style={{ color: 'var(--text-mute)', flex: 'none' }}>ⓘ</span>
        <span>
          Quem está aqui avalia <b>qualquer pessoa do setor</b> — e a primeira avaliação publicada
          dá baixa no mês, seja de quem for. Ninguém se avalia, e quem aparece nesta lista é
          avaliado pela Diretoria, não pelo colega de chefia.
          <br />
          O cargo do Nexus (<i>Gestor</i>, <i>Sub-encarregado</i>) só sugere; o vínculo só existe
          depois que você confirma, e ele <b>não muda sozinho</b> quando alguém for promovido.
        </span>
      </div>

      {d.semAvaliador > 0 && (
        <div style={{ display: 'flex', gap: 9, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderLeft: '3px solid var(--danger)', borderRadius: 'var(--radius-sm)', padding: '11px 14px', marginBottom: 16, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.55 }}>
          <span style={{ color: 'var(--danger)' }}>⚠</span>
          <span>
            <b>{d.semAvaliador} setores sem ninguém definido</b>, somando {d.pessoasSemAvaliador} pessoas.
            Enquanto ficarem assim, elas nunca serão avaliadas e nada no sistema vai reclamar —
            avaliação que ninguém deve não aparece como atrasada.
          </span>
        </div>
      )}

      {d.setores.map((s) => {
        const vazio = s.avaliadores.length === 0 && !s.pelaDiretoria
        const aberto = abrindo === s.id
        return (
          <div key={s.id} className="tc-card" style={{ background: 'var(--surface)', border: `1px solid ${vazio ? 'var(--danger)44' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: 18, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{s.nome}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{s.pessoas} {s.pessoas === 1 ? 'pessoa' : 'pessoas'}</div>
              </div>
              {vazio && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--danger)', background: 'var(--surface-2)', border: '1px solid var(--danger)33', padding: '3px 10px', borderRadius: 20 }}>Ninguém avalia</span>}
              {/*
                ⚠️ Setor sem chefia que responde à Diretoria não é órfão: tem
                dono. Sem esta marca ele ficaria para sempre no alerta vermelho,
                e alerta que não se resolve é alerta que se aprende a ignorar.
              */}
              <button onClick={() => marcarDiretoria(s.id, !s.pelaDiretoria)} disabled={salvando === s.id} className="tc-btn"
                title="A avaliação deste setor cabe à Diretoria — qualquer diretor pode fazê-la"
                style={{
                  background: s.pelaDiretoria ? 'var(--accent)' : 'transparent',
                  border: `1px solid ${s.pelaDiretoria ? 'var(--accent)' : 'var(--border)'}`,
                  color: s.pelaDiretoria ? '#fff' : 'var(--text-mute)',
                  borderRadius: 20, padding: '5px 13px', fontSize: 11.5, fontWeight: 600,
                  fontFamily: 'inherit', cursor: 'pointer',
                }}>
                {s.pelaDiretoria ? '✓ Cabe à Diretoria' : 'Cabe à Diretoria'}
              </button>
              <button onClick={() => { setAbrindo(aberto ? null : s.id); setBusca('') }} className="tc-btn"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-dim)', padding: '6px 14px', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
                {aberto ? 'Fechar' : 'Escolher quem avalia'}
              </button>
            </div>

            {s.avaliadores.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                {s.avaliadores.map((p) => (
                  <Chip key={p.id} p={p} setor={p.deOutroSetor ?? undefined} ativo onClick={() => alternar(s.id, p.id, false)} carregando={salvando === p.id} />
                ))}
              </div>
            )}

            {s.sugestoes.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.3px' }}>
                  Sugerido pelo cargo · confirme para valer
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {s.sugestoes.map((p) => (
                    <Chip key={p.id} p={p} onClick={() => alternar(s.id, p.id, true)} carregando={salvando === p.id} />
                  ))}
                </div>
              </div>
            )}

            {aberto && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-soft)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.3px' }}>
                  Do próprio setor
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {s.equipe.map((p) => {
                    const ja = s.avaliadores.some((a) => a.id === p.id)
                    return <Chip key={p.id} p={p} ativo={ja} onClick={() => alternar(s.id, p.id, !ja)} carregando={salvando === p.id} />
                  })}
                </div>
                {s.equipe.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-mute)' }}>Setor sem gente ativa.</div>}

                {/*
                  ⚠️⚠️ De QUALQUER setor. Setor pequeno quase nunca tem o próprio
                  avaliador dentro dele — a Limpeza é avaliada por alguém da
                  Cozinha, e isso é a regra e não a exceção. A tela só oferecia a
                  equipe do setor e tornava esse caso impossível, embora a rota
                  sempre tenha aceitado.
                */}
                <div style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600, margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: '.3px' }}>
                  Ou alguém de outro setor
                </div>
                <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pessoa por nome ou setor…"
                  style={{ width: '100%', maxWidth: 340, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '7px 12px', fontSize: 12.5, fontFamily: 'inherit', marginBottom: 10 }} />
                {busca.trim().length >= 2 ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(d.todos ?? [])
                      .filter((p) => p.id !== undefined && !s.equipe.some((e) => e.id === p.id))
                      .filter((p) => `${p.nome} ${p.setor}`.toLowerCase().includes(busca.trim().toLowerCase()))
                      .slice(0, 24)
                      .map((p) => {
                        const ja = s.avaliadores.some((a) => a.id === p.id)
                        return <Chip key={p.id} p={p} setor={p.setor} ativo={ja} onClick={() => alternar(s.id, p.id, !ja)} carregando={salvando === p.id} />
                      })}
                  </div>
                ) : (
                  <div style={{ fontSize: 11.5, color: 'var(--text-mute)' }}>Digite ao menos duas letras.</div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Chip({ p, ativo, onClick, carregando, setor }: { p: P; ativo?: boolean; onClick: () => void; carregando: boolean; setor?: string }) {
  return (
    <button onClick={onClick} disabled={carregando} className="tc-btn"
      style={{
        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'inherit',
        background: ativo ? 'var(--accent)' : 'var(--surface-2)',
        border: `1px solid ${ativo ? 'var(--accent)' : 'var(--border)'}`,
        color: ativo ? '#fff' : 'var(--text-dim)',
        borderRadius: 30, padding: '4px 13px 4px 4px', opacity: carregando ? 0.5 : 1,
      }}>
      <Avatar id={p.id} hasAvatar={p.hasAvatar} initials={p.nome.split(' ').map((x) => x[0]).slice(0, 2).join('')} color="var(--chart-1)" size={24} />
      <span style={{ fontSize: 12, fontWeight: 600 }}>{p.nome}</span>
      <span style={{ fontSize: 10.5, opacity: 0.75 }}>{setor ? `${p.cargo} · ${setor}` : p.cargo}</span>
      <span style={{ fontSize: 13, marginLeft: 2 }}>{ativo ? '×' : '+'}</span>
    </button>
  )
}
