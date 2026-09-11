import { frescorDasFontes } from '@/lib/frescor'

/* ============================================================
   FONTES DE DADOS — até quando cada espelho foi alimentado (11/09/2026).

   Substitui "Sistemas conectados", que era FICÇÃO: "Sync há 8 min", "há 1 h"…
   escritos à mão em `lib/mock/config.ts`, e um botão de liga/desliga que não
   desligava nada. Aqui é o último dia com dado em cada espelho — a MESMA conta
   da frase do canto do painel (`lib/frescor.ts`).
   ============================================================ */

const br = (d: string) => d.split('-').reverse().join('/')

export default async function FontesDeDados() {
  const fontes = await frescorDasFontes()
  const hoje = new Date()
  const idade = (ate: string) => Math.floor((hoje.getTime() - new Date(`${ate}T12:00:00`).getTime()) / 86400_000)
  const ordem = [...fontes].sort((a, b) => (a.ate ?? '').localeCompare(b.ate ?? ''))

  return (
    <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 22 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Fontes de dados</div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14, lineHeight: 1.5 }}>
        O último dia com dado em cada espelho, da fonte mais atrasada para a mais recente. Mede o DADO, não quando o
        sincronismo rodou: um sincronismo que roda sem trazer nada não deixa o espelho em dia.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {ordem.map((f) => {
          const n = f.ate ? idade(f.ate) : null
          const cor = n == null ? 'var(--text-mute)' : n <= 1 ? 'var(--success)' : n <= 3 ? 'var(--warning)' : 'var(--danger)'
          const quando = n == null ? 'sem dado' : n <= 0 ? 'hoje' : n === 1 ? 'ontem' : `há ${n} dias`
          return (
            <div key={f.nome} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 4px', borderBottom: '1px solid var(--border-soft)' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: cor, flex: 'none' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{f.nome}</div>
                {/* As duas sem cron entram por import à mão — é sempre uma delas que atrasa. */}
                {f.semCron && <div style={{ fontSize: 11.5, color: 'var(--text-mute)' }}>import à mão, sem sincronismo automático</div>}
              </div>
              <span style={{ fontSize: 12.5, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>{f.ate ? `dados até ${br(f.ate)}` : '—'}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: cor, width: 90, textAlign: 'right' }}>{quando}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
