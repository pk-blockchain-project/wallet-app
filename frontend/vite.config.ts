import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/register': 'http://localhost:5000',
      '/login': 'http://localhost:5000',
      '/profile': 'http://localhost:5000',
      '/balance': 'http://localhost:5000',
      '/private_key': 'http://localhost:5000',
      '/sign_transaction': 'http://localhost:5000',
      '/transaction_history': 'http://localhost:5000',
      '/wallet_address': 'http://localhost:5000'
    }
  }
})
