import React, { useState } from 'react'

interface LoginFormProps {
  onLogin: (username: string, password: string) => void
  loading: boolean
  error: string | null
  onSwitchToRegister: () => void
}

const LoginForm: React.FC<LoginFormProps> = ({ 
  onLogin, 
  loading, 
  error,
  onSwitchToRegister 
}) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onLogin(username, password)
  }

  return (
    <div className="wallet-card">
      <div className="wallet-header">Login</div>
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
            {loading ? 'Logging in...' : 'Login'}
          </button>
          {error && <div className="wallet-error">{error}</div>}
          <div className="toggle-form" onClick={onSwitchToRegister}>
            Don't have an account? Register
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginForm
