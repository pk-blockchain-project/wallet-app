import React, { useState, useEffect } from 'react'
import type { Transaction } from './TransactionHistory'
import TransactionHistory from './TransactionHistory'
import SendModal from './SendModal'

// Simple component to show ETH value in USD
interface FiatValueProps {
  ethAmount: string;
}

const FiatValue: React.FC<FiatValueProps> = ({ ethAmount }) => {
  const [etherPrice, setEtherPrice] = useState<number | null>(null);

  useEffect(() => {
    // Fetch current ETH price in USD
    const fetchEthPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await response.json();
        if (data.ethereum && data.ethereum.usd) {
          setEtherPrice(data.ethereum.usd);
        }
      } catch (error) {
        console.error('Error fetching ETH price:', error);
      }
    };

    // Initial fetch
    fetchEthPrice();
    
    // Refresh price every 5 seconds
    const interval = setInterval(fetchEthPrice, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Don't show anything if price is not available
  if (etherPrice === null) {
    return null;
  }

  const ethAmountFloat = parseFloat(ethAmount);
  const usdValue = (ethAmountFloat * etherPrice).toFixed(2);
  
  return (
    <span className="fiat-value">
      ≈ ${usdValue} USD
    </span>
  );
}

interface WalletProps {
  balance: string;
  address?: string;
  transactions: Transaction[];
  transactionsLoading: boolean;
  onSendTransaction: (to: string, amount: string) => Promise<void>;
  onRefreshTransactions?: () => Promise<void>;
}

const Wallet: React.FC<WalletProps> = ({ 
  balance, 
  address,
  transactions,
  transactionsLoading,
  onSendTransaction,
  onRefreshTransactions
}) => {
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const openSendModal = () => setSendModalOpen(true);
  const closeSendModal = () => setSendModalOpen(false);
  
  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
        .then(() => {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 3000);
        })
        .catch(err => {
          console.error('Failed to copy address: ', err);
          alert('Failed to copy address. Please try again.');
        });
    }
  };
  
  return (
    <div className="wallet-dashboard">
      {/* Combined wallet card with balance and address */}
      <div className="wallet-card wallet-main-card">
        <div className="wallet-header">Wallet Details</div>
        <div className="wallet-content">
          {/* Balance Section - Now First */}
          <div className="wallet-row">
            <div className="wallet-label">Balance</div>
            <div className="wallet-balance">
              {balance} <span className="wallet-currency">ETH</span>
              <FiatValue ethAmount={balance} />
            </div>
          </div>
          
          {/* Wallet Address Section */}
          <div className="wallet-row wallet-address-section">
            <div className="wallet-label">Your Wallet Address</div>
            {address ? (
              <>
                <div className="wallet-address-value-display">
                  <div className="wallet-address-text">{address}</div>
                </div>
                <div className="wallet-address-actions">
                  <button
                    className={`wallet-address-copy-btn ${copySuccess ? 'success' : ''}`}
                    onClick={handleCopyAddress}
                  >
                    <span className="wallet-address-copy-button-content">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                        {copySuccess ? (
                          <path d="M20 6L9 17l-5-5" />
                        ) : (
                          <>
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </>
                        )}
                      </svg>
                      <span>{copySuccess ? 'Copied!' : 'Copy Address'}</span>
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <div className="wallet-address-loading">
                <div className="loading-spinner"></div>
                <p>Loading wallet address...</p>
              </div>
            )}
          </div>
          
          <button 
            className="wallet-btn wallet-send-btn" 
            onClick={openSendModal}
          >
            Send ETH
          </button>
        </div>
      </div>
      
      {/* Transaction history section */}
      <div className="wallet-card transactions-card">
        <TransactionHistory 
          transactions={transactions}
          loading={transactionsLoading}
          onRefresh={onRefreshTransactions}
          currentUserAddress={address}
        />
      </div>
      
      {/* Send ETH modal */}
      <SendModal
        isOpen={sendModalOpen}
        onClose={closeSendModal}
        onSend={onSendTransaction}
        balance={balance}
      />
    </div>
  )
}

export default Wallet
