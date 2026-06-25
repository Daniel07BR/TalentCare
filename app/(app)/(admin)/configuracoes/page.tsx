'use client'
import { useState } from 'react'
import { useTalentData } from '@/lib/ui/data'
import {
  sliders, weightsTotal, scorePreview, previewColor, systemsList,
  DEFAULT_WEIGHTS, CFG_ROLES, type Weights,
} from '@/lib/mock/config'

export default function ConfiguracoesPage() {
  const data = useTalentData()
  const [weights, setWeights] = useState<Weights>({ ...DEFAULT_WEIGHTS })
  const [sysState, setSysState] = useState<Record<string, boolean>>({})

  const sl = sliders(weights)
  const total = weightsTotal(weights)
  const preview = scorePreview(data, weights)
  const systems = systemsList(sysState)

  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>Sistema</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px' }}>Configurações</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 16, alignItems: 'start' }}>
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Pesos do score de performance</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 20 }}>Defina quanto cada fator compõe o score final (0–50)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {sl.map((s) => (
              <div key={s.key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 9 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flex: 'none' }} />{s.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{s.value} <span style={{ color: 'var(--text-mute)', fontWeight: 500 }}>· {s.pct}</span></span>
                </div>
                <input type="range" min={0} max={50} value={s.value} onChange={(e) => setWeights((w) => ({ ...w, [s.key]: +e.target.value }))} style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer', height: 6 }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: total === 100 ? 'var(--success)' : 'var(--warning)' }}>{total === 100 ? 'Soma 100 · balanceado' : 'Soma ' + total + ' · ajuste para 100'}</span>
            <button className="tc-btn" onClick={() => setWeights({ ...DEFAULT_WEIGHTS })} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 15px', fontSize: 12.5, fontWeight: 600, color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit' }}>Restaurar padrão</button>
          </div>
        </div>
        <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 22, display: 'flex', flexDirection: 'column', minHeight: 320 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Pré-visualização</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Score médio da empresa com os pesos atuais</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '20px 0' }}>
            <div style={{ fontSize: 60, fontWeight: 800, letterSpacing: '-3px', lineHeight: 1, color: previewColor(data, weights) }}>{preview}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>de 100 pontos</div>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-mute)', lineHeight: 1.55, borderTop: '1px solid var(--border)', paddingTop: 14 }}>Os pesos compõem o score de cada colaborador. Alterações refletem em dashboards, rankings e fichas.</div>
        </div>
      </div>

      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 22, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Sistemas conectados</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>Fontes de dados integradas ao Nexus</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {systems.map((s) => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 4px', borderBottom: '1px solid var(--border-soft)' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flex: 'none' }} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 600 }}>{s.name}</div><div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{s.desc}</div></div>
              <span style={{ fontSize: 11.5, color: 'var(--text-mute)' }}>Sync {s.sync}</span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: s.statusColor, width: 96, textAlign: 'right' }}>{s.statusLabel}</span>
              <button className={'sw' + (s.connected ? ' on' : '')} onClick={() => setSysState((st) => ({ ...st, [s.name]: st[s.name] === false ? true : false }))} style={{ width: 38, height: 22, borderRadius: 20, border: 'none', cursor: 'pointer', position: 'relative', padding: 0, flex: 'none' }}><span className="swknob" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 22 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Gestão de acesso</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>Perfis e permissões</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {CFG_ROLES.map((r) => (
            <div key={r.role} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 4px', borderBottom: '1px solid var(--border-soft)' }}>
              <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.role}</div><div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{r.scope}</div></div>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{r.members} membros</span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: r.color, border: '1px solid var(--border)', borderRadius: 20, padding: '4px 12px', width: 78, textAlign: 'center' }}>{r.perm}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
