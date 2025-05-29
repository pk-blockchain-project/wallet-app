import { useState, useEffect } from 'react'
import './App.css'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import Wallet from './Wallet'
import type { Transaction } from './TransactionHistory'

// API configuration
const API_BASE_URL = ''; // Empty string for proxied requests through Vite

function App() {
  // Auth state
  const [token, setToken] = useState<string | null>(null)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [registerError, setRegisterError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  // Wallet state
  const [balance, setBalance] = useState('0.00')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  
  // Fetch profile, balance, and address after login
  async function fetchProfileAndBalance(jwt: string) {
    setLoading(true)
    try {
      // Get profile (username, email)
      const profileRes = await fetch(`${API_BASE_URL}/profile`, {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      if (!profileRes.ok) throw new Error('Failed to fetch profile')
      const profile = await profileRes.json()
      setUsername(profile.username)
      setEmail(profile.email)

      // Get wallet balance
      const balanceRes = await fetch(`${API_BASE_URL}/balance`, {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      if (!balanceRes.ok) throw new Error('Failed to fetch balance')
      const balanceData = await balanceRes.json()
      setBalance(balanceData.balance)

      // Try to get wallet address
      await fetchWalletAddress(jwt)
      
      // Also get transaction history
      await fetchTransactionHistory(jwt, false) // Initial load, show loading
      
    } catch (e: any) {
      setLoginError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch transaction history and try to get wallet address
  async function fetchTransactionHistory(jwt: string, isAutoRefresh = false) {
    // Only show loading spinner for initial loads, not auto-refreshes
    if (!isAutoRefresh) {
      setTransactionsLoading(true)
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/transaction_history`, {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.transactions) {
          setTransactions(data.transactions)
          
          // If we don't have the wallet address yet, try to get it
          if (!walletAddress && data.transactions.length > 0) {
            // Try to get the wallet address from any transaction
            // For outgoing transactions, the 'from' address is the user's address
            const outgoingTx = data.transactions.find((tx: Transaction) => tx.direction === "outgoing")
            if (outgoingTx) {
              setWalletAddress(outgoingTx.from)
            } else {
              // For incoming transactions, the 'to' address is the user's address
              const incomingTx = data.transactions.find((tx: Transaction) => tx.direction === "incoming")
              if (incomingTx) {
                setWalletAddress(incomingTx.to)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch transaction history', error)
    } finally {
      setTransactionsLoading(false)
    }
  }
  
  // Send transaction function
  async function sendTransaction(toAddress: string, amount: string) {
    if (!token) throw new Error('Not authenticated')
    
    try {
      // Convert ETH to Wei (1 ETH = 10^18 Wei)
      const valueInWei = (parseFloat(amount) * 1e18).toString()
      
      // Get gas price and gas limit (simplified - in production you'd want to estimate this)
      const gasPrice = '5000000000' // 5 Gwei
      const gasLimit = '21000' // Standard gas limit for ETH transfer
      
      const response = await fetch(`${API_BASE_URL}/sign_transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          to: toAddress,
          value: valueInWei,
          gas: gasLimit,
          gasPrice: gasPrice,
          broadcast: true // Set to true to broadcast the transaction
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Transaction failed')
      }
      
      // Refresh balance and transaction history
      await Promise.all([
        fetchBalance(token),
        fetchTransactionHistory(token, false) // Not an auto-refresh, show loading
      ])
      
      return data
    } catch (error: any) {
      console.error('Error sending transaction:', error)
      throw error
    }
  }
  
  // Separate function to fetch balance
  async function fetchBalance(jwt: string) {
    try {
      const balanceRes = await fetch(`${API_BASE_URL}/balance`, {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json()
        setBalance(balanceData.balance)
      }
    } catch (error) {
      console.error('Failed to fetch balance', error)
    }
  }
  
  // Fetch wallet address directly from the user profile
  async function fetchWalletAddress(jwt: string) {
    try {
      // Add an endpoint to fetch wallet address directly
      const response = await fetch(`${API_BASE_URL}/wallet_address`, {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.address) {
          setWalletAddress(data.address)
        }
      }
    } catch (error) {
      console.error('Failed to fetch wallet address', error)
    }
  }
  
  // Handle login
  async function handleLogin(username: string, password: string) {
    setLoading(true)
    setLoginError(null)
    
    // Clear any previous user data first
    setUsername('')
    setEmail('')
    setBalance('0.00')
    setWalletAddress('')
    setTransactions([])
    
    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      
      // Set the token after clearing previous state
      setToken(data.access_token)
      await fetchProfileAndBalance(data.access_token)
    } catch (e: any) {
      setLoginError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle register
  async function handleRegister(username: string, email: string, password: string) {
    setLoading(true)
    setRegisterError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')
      // After successful registration, log in automatically
      await handleLogin(username, password)
      setShowRegister(false)
    } catch (e: any) {
      setRegisterError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Logout
  function handleLogout() {
    // Reset auth state
    setToken(null)
    setLoginError(null)
    setRegisterError(null)
    
    // Reset user profile data
    setUsername('')
    setEmail('')
    
    // Reset wallet data
    setBalance('0.00')
    setWalletAddress('')
    setTransactions([])
    setTransactionsLoading(false)
  }

  // Initialize app state - make sure we start clean
  useEffect(() => {
    // Clear any potential stale data on app initialization
    setBalance('0.00')
    setWalletAddress('')
    setTransactions([])
    setTransactionsLoading(false)
  }, []); // Run only once on component mount

  // Set up periodic refresh of balance and transaction history
  useEffect(() => {
    // Skip if not authenticated
    if (!token) return;
    
    // Initial fetch
    fetchBalance(token);
    fetchTransactionHistory(token, false); // Initial load, show loading
    
    // Set up interval for periodic refresh (every 5 seconds)
    const refreshInterval = setInterval(() => {
      fetchBalance(token);
      fetchTransactionHistory(token, true); // Auto-refresh, don't show loading
      console.log('Auto-refreshed wallet data');
    }, 5000); // 5 seconds refresh
    
    // Clean up interval on unmount or when token changes
    return () => clearInterval(refreshInterval);
  }, [token]); // Re-run when auth token changes

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>Crypto Wallet</h1>
        
        {token && (
          <div className="nav-user-info">
            <div className="user-info">
              <span className="user-name">{username}</span>
              <span className="user-email">{email}</span>
            </div>
            <button className="header-btn-logout" onClick={handleLogout}>Logout</button>
          </div>
        )}
      </div>
      <div className={`app-content ${token ? 'app-content-full' : ''}`}>
        {!token ? (
          showRegister ? (
            <RegisterForm 
              onRegister={handleRegister} 
              loading={loading} 
              error={registerError} 
              onSwitchToLogin={() => setShowRegister(false)}
            />
          ) : (
            <LoginForm 
              onLogin={handleLogin} 
              loading={loading} 
              error={loginError}
              onSwitchToRegister={() => setShowRegister(true)} 
            />
          )
        ) : (
          <Wallet 
            balance={balance}
            address={walletAddress}
            transactions={transactions} 
            transactionsLoading={transactionsLoading}
            onSendTransaction={sendTransaction}
            onRefreshTransactions={async () => {
              if (token) {
                await fetchTransactionHistory(token, false); // Manual refresh, show loading
              }
            }}
          />
        )}
      </div>
    </div>
  )
}

export default App
