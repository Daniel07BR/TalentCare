import { Suspense } from 'react'
import LoginForm from './LoginForm'
import Logo from '../(app)/Logo'

export default function LoginPage() {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand">
          <Logo size={38} radius={10} />
          <h1>
            TalentCare
            <small>Performance de pessoas · Itamarathy</small>
          </h1>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
