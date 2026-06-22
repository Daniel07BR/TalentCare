import Link from 'next/link'

export default function EmBreve({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="tc-anim" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, marginBottom: 4 }}>{kicker}</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.6px' }}>{title}</h1>
      </div>
      <div className="tc-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '56px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Esta seção será detalhada na próxima iteração.</div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', maxWidth: 380, lineHeight: 1.55 }}>
          O Dashboard e a navegação já estão ativos. As demais telas do protótipo serão portadas em seguida.
        </div>
        <Link href="/dashboard" className="tc-btn" style={{ marginTop: 6, background: 'var(--accent)', color: '#1a1205', border: 'none', borderRadius: 'var(--radius-sm)', padding: '9px 18px', fontSize: 13, fontWeight: 600 }}>Voltar ao Dashboard</Link>
      </div>
    </div>
  )
}
