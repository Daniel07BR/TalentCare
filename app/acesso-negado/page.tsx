export default function AcessoNegado() {
  return (
    <div className="login-wrap">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <div className="brand" style={{ justifyContent: 'center' }}>
          <div className="logo">TC</div>
        </div>
        <h1 style={{ fontSize: 18, margin: '0 0 8px' }}>Sem acesso ao TalentCare</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, margin: 0 }}>
          Seu usuário existe no sistema, mas o acesso é restrito à Diretoria.
          Procure a administração se precisar de acesso.
        </p>
        <p style={{ marginTop: 20 }}>
          <a className="btn-sm" href="/login">Voltar ao login</a>
        </p>
      </div>
    </div>
  )
}
