import React, { useState } from 'react'

interface RegisterFormProps {
  onRegister: (username: string, email: string, password: string) => void
  loading: boolean
  error: string | null
  onSwitchToLogin: () => void
}

const RegisterForm: React.FC<RegisterFormProps> = ({ 
  onRegister, 
  loading, 
  error,
  onSwitchToLogin
}) => {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onRegister(username, email, password)
  }

  return (
    <div className="wallet-card">
      <div className="wallet-header">Create Account</div>
      <div className="wallet-content">
        <form onSubmit={handleSubmit}>
          <div className="wallet-row">
            <div className="wallet-label">Username</div>
            <input
              className="wallet-input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="wallet-row">
            <div className="wallet-label">Email</div>
            <input
              className="wallet-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="wallet-row">
            <div className="wallet-label">Password</div>
            <input
              className="wallet-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="wallet-btn" type="submit" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
          {error && <div className="wallet-error">{error}</div>}
          <div className="toggle-form" onClick={onSwitchToLogin}>
            Already have an account? Login
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegisterForm
