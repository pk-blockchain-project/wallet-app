import React, { useState } from 'react';

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (toAddress: string, amount: string) => Promise<void>;
  balance: string;
}

const SendModal: React.FC<SendModalProps> = ({ isOpen, onClose, onSend, balance }) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Simple validation
    if (!recipient) {
      setError('Recipient address is required');
      return;
    }

    // More thorough address validation
    if (!recipient.startsWith('0x') || recipient.length !== 42) {
      setError('Invalid Ethereum address format');
      return;
    }

    // Check if it's a valid hex string
    const addressPart = recipient.slice(2);
    if (!/^[0-9a-fA-F]+$/.test(addressPart)) {
      setError('Invalid Ethereum address - contains invalid characters');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (parseFloat(amount) > parseFloat(balance)) {
      setError('Insufficient funds');
      return;
    }

    try {
      setSending(true);
      await onSend(recipient, amount);
      // Reset form on success
      setRecipient('');
      setAmount('');
      onClose();
    } catch (err: any) {
      console.error('Send transaction error:', err);
      // Extract error message from different possible error formats
      let errorMessage = 'Failed to send transaction';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Send ETH</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="send-form">
          <div className="form-group">
            <label>Recipient Address</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="modal-input"
              disabled={sending}
            />
          </div>
          
          <div className="form-group">
            <label>Amount (ETH)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.0001"
              min="0.0001"
              className="modal-input"
              disabled={sending}
            />
            <div className="balance-info">
              Available: {balance} ETH
            </div>
          </div>
          
          {error && <div className="send-error">{error}</div>}
          
          <div className="modal-actions">
            <button 
              type="button" 
              className="modal-btn-cancel" 
              onClick={onClose}
              disabled={sending}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="modal-btn-send" 
              disabled={sending}
            >
              {sending ? 'Sending...' : 'Send ETH'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendModal;