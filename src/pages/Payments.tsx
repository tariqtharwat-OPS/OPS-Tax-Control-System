import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Payment, Purchase } from '../types';
import { useAuth } from '../AuthContext';
import { uploadFile } from '../uploadHelper';

export const Payments: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { profile } = useAuth();

  // Form State
  const [transactionId, setTransactionId] = useState('');
  const [method, setMethod] = useState<'cash' | 'transfer'>('transfer');
  const [paymentRef, setPaymentRef] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [proofFile, setProofFile] = useState<File | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const paySnap = await getDocs(collection(db, 'payments'));
      setPayments(paySnap.docs.map(d => ({id: d.id, ...d.data()} as Payment)));

      const purSnap = await getDocs(collection(db, 'purchases'));
      setPurchases(purSnap.docs.map(d => ({id: d.id, ...d.data()} as Purchase)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId || !amount) return alert('Transaction ID and Amount are required.');
    
    // Enforce proof requirement rule
    if (!proofFile) {
      return alert(`Upload proof is required before saving a ${method} payment.`);
    }

    const linkedPurchase = purchases.find(p => p.id === transactionId);
    if (!linkedPurchase) return alert('Cannot find linked purchase. No orphan payments allowed.');

    try {
      setLoading(true);
      
      const proofUrl = await uploadFile(proofFile, 'payments');

      const batchOp = writeBatch(db);
      
      const newPayRef = doc(collection(db, 'payments'));
      batchOp.set(newPayRef, {
        paymentId: `PAY-${Date.now()}`,
        transactionId,
        method,
        paymentRef,
        amount: Number(amount),
        date: new Date().toISOString(),
        approvedBy: profile?.uid || 'System',
        status: 'completed',
        proofRef: proofUrl,
        createdAt: new Date().toISOString()
      });

      // Update the linked purchase payment status
      batchOp.update(doc(db, 'purchases', linkedPurchase.id), {
        paymentStatus: 'paid'
      });

      await batchOp.commit();
      
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pendingPurchases = purchases.filter(p => p.paymentStatus === 'pending');

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Payment Traceability</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'New Payment'}
        </button>
      </div>

      {showForm && (
        <form className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }} onSubmit={handleSavePayment}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Linked Purchase *</label>
              <select className="glass-input" required value={transactionId} onChange={e => {
                setTransactionId(e.target.value);
                const pur = purchases.find(p => p.id === e.target.value);
                if (pur) setAmount(pur.totalAmount);
              }}>
                <option value="">Select Pending Purchase</option>
                {pendingPurchases.map(p => <option key={p.id} value={p.id}>{p.transactionId} - {p.totalAmount.toLocaleString()} IDR</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount (IDR) *</label>
              <input type="number" className="glass-input" required value={amount} onChange={e => setAmount(Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Method *</label>
              <select className="glass-input" required value={method} onChange={e => setMethod(e.target.value as any)}>
                <option value="transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Payment Ref</label>
              <input type="text" className="glass-input" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Proof Document (REQUIRED) *</label>
            <input type="file" className="glass-input" required onChange={e => setProofFile(e.target.files ? e.target.files[0] : null)} />
            <small style={{ color: '#94a3b8' }}>System Rule: Payment impossible without linking evidence proof.</small>
          </div>
          
          <button type="submit" className="btn-primary" style={{ marginTop: '16px' }} disabled={loading}>Submit Payment</button>
        </form>
      )}

      <div className="glass-panel">
        <table>
          <thead>
            <tr>
              <th>Payment ID</th>
              <th>TX Ref</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
              <th>Proof Link</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(pay => {
              const link = purchases.find(p => p.id === pay.transactionId);
              return (
                <tr key={pay.id}>
                  <td>{pay.paymentId}</td>
                  <td>{link?.transactionId || pay.transactionId}</td>
                  <td style={{ textTransform: 'capitalize' }}>{pay.method}</td>
                  <td style={{ fontWeight: 600 }}>{pay.amount.toLocaleString()} IDR</td>
                  <td>{new Date(pay.date).toLocaleDateString()}</td>
                  <td>
                    <span className="badge badge-success">{pay.status}</span>
                  </td>
                  <td>
                    {pay.proofRef ? <span style={{ color: 'var(--primary-color)' }}>{pay.proofRef}</span> : '-'}
                  </td>
                </tr>
              );
            })}
            {payments.length === 0 && <tr><td colSpan={7} style={{textAlign:'center', padding:'24px'}}>No payments found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default Payments;
