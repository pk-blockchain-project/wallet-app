import React, { useState, useMemo } from 'react';

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value_eth: string;
  timestamp: number;
  direction: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  loading: boolean;
  onRefresh?: () => void;
  currentUserAddress?: string;
}

type SortOrder = 'newest' | 'oldest' | 'highest' | 'lowest';
type FilterType = 'all' | 'incoming' | 'outgoing';

interface HighlightAddressProps {
  address: string;
  currentUserAddress?: string;
  truncate?: boolean;
}

const HighlightAddress: React.FC<HighlightAddressProps> = ({ address, currentUserAddress, truncate = true }) => {
  const isCurrentUser = currentUserAddress && address.toLowerCase() === currentUserAddress.toLowerCase();
  
  const displayAddress = truncate 
    ? `${address.slice(0, 8)}...${address.slice(-6)}`
    : address;
  
  return (
    <span className={isCurrentUser ? 'highlight-address' : ''}>
      {isCurrentUser ? 'You' : displayAddress}
      {isCurrentUser && truncate && (
        <span className="address-tooltip">{address}</span>
      )}
    </span>
  );
};

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ 
  transactions, 
  loading, 
  onRefresh,
  currentUserAddress
}) => {
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Format timestamp to readable date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };
  
  const handleTxClick = (tx: Transaction) => {
    setSelectedTx(tx);
  };
  
  const closeDetails = () => {
    setSelectedTx(null);
  };

  const filteredAndSortedTransactions = useMemo(() => {
    // First filter transactions
    const filtered = transactions.filter(tx => {
      if (filter === 'all') return true;
      return tx.direction === filter;
    });

    // Then sort them
    return [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return b.timestamp - a.timestamp;
        case 'oldest':
          return a.timestamp - b.timestamp;
        case 'highest':
          return parseFloat(b.value_eth) - parseFloat(a.value_eth);
        case 'lowest':
          return parseFloat(a.value_eth) - parseFloat(b.value_eth);
        default:
          return 0;
      }
    });
  }, [transactions, sortOrder, filter]);

  if (loading && transactions.length === 0) {
    return <div className="transaction-loading">Loading transaction history...</div>;
  }

  if (!loading && !transactions.length) {
    return <div className="transaction-empty">No transaction history found</div>;
  }

  return (
    <div className="transaction-history">
      <div className="transaction-controls">
        <div className="transaction-header">
          <div className="transaction-title">
            <h3>Transaction History</h3>
            {filteredAndSortedTransactions.length > 0 && (
              <span className="transaction-count">
                {filteredAndSortedTransactions.length} {filteredAndSortedTransactions.length === 1 ? 'transaction' : 'transactions'}
              </span>
            )}
          </div>
          {onRefresh && (
            <button 
              className="transaction-refresh-btn" 
              onClick={onRefresh}
              disabled={loading}
              title="Refresh transactions"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/>
              </svg>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          )}
        </div>
        <div className="transaction-filters">
          <div className="filter-group">
            <label>Filter:</label>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="transaction-select"
            >
              <option value="all">All</option>
              <option value="incoming">Incoming</option>
              <option value="outgoing">Outgoing</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Sort:</label>
            <select 
              value={sortOrder} 
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="transaction-select"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest value</option>
              <option value="lowest">Lowest value</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="transaction-list">
        {filteredAndSortedTransactions.map(tx => (
          <div
            key={tx.hash}
            className={`transaction-item ${tx.direction === 'incoming' ? 'transaction-incoming' : 'transaction-outgoing'}`}
            onClick={() => handleTxClick(tx)}
          >
            <div className="transaction-icon">
              {tx.direction === 'incoming' ? '↓' : '↑'}
            </div>
            <div className="transaction-details">
              <div className="transaction-value">
                {tx.direction === 'incoming' ? '+' : '-'}{tx.value_eth} ETH
              </div>
              <div className="transaction-addresses">
                <div className="transaction-address">
                  <span>From:</span> <HighlightAddress address={tx.from} currentUserAddress={currentUserAddress} />
                </div>
                <div className="transaction-address">
                  <span>To:</span> <HighlightAddress address={tx.to} currentUserAddress={currentUserAddress} />
                </div>
              </div>
              <div className="transaction-time">{formatDate(tx.timestamp)}</div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredAndSortedTransactions.length === 0 && !loading && (
        <div className="transaction-empty">No transactions found with current filter</div>
      )}
      
      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="modal-overlay" onClick={closeDetails}>
          <div className="modal-content tx-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Transaction Details</h3>
              <button className="modal-close" onClick={closeDetails}>&times;</button>
            </div>
            <div className="tx-details-content">
              <div className="tx-detail-row">
                <div className="tx-detail-label">Transaction Hash</div>
                <div className="tx-detail-value tx-hash">
                  <span>{selectedTx.hash}</span>
                  <button 
                    className="tx-copy-btn"
                    onClick={() => navigator.clipboard.writeText(selectedTx.hash)}
                    title="Copy to clipboard"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="tx-detail-row">
                <div className="tx-detail-label">Status</div>
                <div className="tx-detail-value tx-status">
                  <span className="tx-status-badge">Confirmed</span>
                </div>
              </div>
              <div className="tx-detail-row">
                <div className="tx-detail-label">From</div>
                <div className="tx-detail-value">
                  <a href={`https://etherscan.io/address/${selectedTx.from}`} target="_blank" rel="noopener noreferrer">
                    <HighlightAddress address={selectedTx.from} currentUserAddress={currentUserAddress} truncate={false} />
                  </a>
                </div>
              </div>
              <div className="tx-detail-row">
                <div className="tx-detail-label">To</div>
                <div className="tx-detail-value">
                  <a href={`https://etherscan.io/address/${selectedTx.to}`} target="_blank" rel="noopener noreferrer">
                    <HighlightAddress address={selectedTx.to} currentUserAddress={currentUserAddress} truncate={false} />
                  </a>
                </div>
              </div>
              <div className="tx-detail-row">
                <div className="tx-detail-label">Value</div>
                <div className={`tx-detail-value ${selectedTx.direction === 'incoming' ? 'tx-value-incoming' : 'tx-value-outgoing'}`}>
                  {selectedTx.direction === 'incoming' ? '+' : '-'}{selectedTx.value_eth} ETH
                </div>
              </div>
              <div className="tx-detail-row">
                <div className="tx-detail-label">Date</div>
                <div className="tx-detail-value">
                  {formatDate(selectedTx.timestamp)}
                </div>
              </div>
              <div className="tx-detail-actions">
                <a 
                  href={`https://etherscan.io/tx/${selectedTx.hash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="tx-action-btn"
                >
                  View on Etherscan
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;