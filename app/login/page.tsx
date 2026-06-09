import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand">
          <div className="logo">TC</div>
          <h1>
            TalentCare
            <small>Administração de usuários · Itamarathy</small>
          </h1>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
