import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ExportSupport, InventoryBatch } from '../types';
import { uploadFile } from '../uploadHelper';

export const ExportSupportView: React.FC = () => {
  const [exports, setExports] = useState<ExportSupport[]>([]);
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [saleRef, setSaleRef] = useState('');
  
  const [ciFile, setCiFile] = useState<File | null>(null);
  const [plFile, setPlFile] = useState<File | null>(null);
  const [pebFile, setPebFile] = useState<File | null>(null);
  const [blFile, setBlFile] = useState<File | null>(null);
  const [remitFile, setRemitFile] = useState<File | null>(null);
  
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
       const eSnap = await getDocs(collection(db, 'exportSupport'));
       setExports(eSnap.docs.map(d => ({id: d.id, ...d.data()} as ExportSupport)));
       const bSnap = await getDocs(collection(db, 'inventory'));
       setBatches(bSnap.docs.map(d => ({id: d.id, ...d.data()} as InventoryBatch)));
    } finally {
       setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleRef || selectedBatches.length === 0) return alert('Sale Ref and at least one linked Batch are required.');

    const isComplete = Boolean(ciFile && plFile && pebFile && blFile && remitFile);
    if (!isComplete) {
      const confirm = window.confirm('Missing supporting documents! Record will be saved as INCOMPLETE. Proceed?');
      if (!confirm) return;
    }

    try {
      setLoading(true);

      const commercialInvoiceRef = ciFile ? await uploadFile(ciFile, 'exports') : '';
      const packingListRef = plFile ? await uploadFile(plFile, 'exports') : '';
      const pebRef = pebFile ? await uploadFile(pebFile, 'exports') : '';
      const blRef = blFile ? await uploadFile(blFile, 'exports') : '';
      const remittanceProofRef = remitFile ? await uploadFile(remitFile, 'exports') : '';

      await addDoc(collection(db, 'exportSupport'), {
        exportId: `EXP-${Date.now()}`,
        saleRef,
        commercialInvoiceRef,
        packingListRef,
        pebRef,
        blRef,
        remittanceProofRef,
        status: isComplete ? 'complete' : 'incomplete',
        batchLinks: selectedBatches
      });
      
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSelect = (batchId: string) => {
    if (selectedBatches.includes(batchId)) {
      setSelectedBatches(selectedBatches.filter(b => b !== batchId));
    } else {
      setSelectedBatches([...selectedBatches, batchId]);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Export Support Logs</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'New Export Support'}
        </button>
      </div>

      {showForm && (
        <form className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }} onSubmit={handleSaveExport}>
          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Sale / Invoice Ref *</label>
              <input type="text" className="glass-input" required value={saleRef} onChange={e => setSaleRef(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Commercial Invoice Doc</label>
              <input type="file" className="glass-input" onChange={e => setCiFile(e.target.files ? e.target.files[0] : null)} />
            </div>
            <div className="form-group">
              <label className="form-label">Packing List Doc</label>
              <input type="file" className="glass-input" onChange={e => setPlFile(e.target.files ? e.target.files[0] : null)} />
            </div>
            <div className="form-group">
              <label className="form-label">PEB Ref</label>
              <input type="file" className="glass-input" onChange={e => setPebFile(e.target.files ? e.target.files[0] : null)} />
            </div>
            <div className="form-group">
              <label className="form-label">B/L (Bill of Lading)</label>
              <input type="file" className="glass-input" onChange={e => setBlFile(e.target.files ? e.target.files[0] : null)} />
            </div>
            <div className="form-group">
              <label className="form-label">Remittance Proof</label>
              <input type="file" className="glass-input" onChange={e => setRemitFile(e.target.files ? e.target.files[0] : null)} />
            </div>
          </div>

          <h3 style={{ marginTop: '16px', marginBottom: '8px' }}>Link Source Batches *</h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
            {batches.map(b => (
              <label key={b.id} style={{ display: 'block', padding: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={selectedBatches.includes(b.batchId)} 
                  onChange={() => handleBatchSelect(b.batchId)} 
                  style={{ marginRight: '8px' }}
                />
                {b.batchId} - {b.species} ({b.quantityRemaining}kg remaining)
              </label>
            ))}
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '24px' }} disabled={loading}>Save Export Documentation</button>
        </form>
      )}

      <div className="glass-panel">
        <table>
          <thead>
            <tr>
              <th>Export ID</th>
              <th>Sale Ref</th>
              <th>Batches</th>
              <th>Status</th>
              <th>Missing Docs</th>
            </tr>
          </thead>
          <tbody>
            {exports.map(exp => {
              const missing = [];
              if (!exp.commercialInvoiceRef) missing.push('Invoice');
              if (!exp.packingListRef) missing.push('PL');
              if (!exp.pebRef) missing.push('PEB');
              if (!exp.blRef) missing.push('B/L');
              if (!exp.remittanceProofRef) missing.push('Remittance');

              return (
                <tr key={exp.id}>
                  <td>{exp.exportId}</td>
                  <td>{exp.saleRef}</td>
                  <td>{exp.batchLinks.length} linked</td>
                  <td>
                    <span className={`badge ${exp.status === 'complete' ? 'badge-success' : 'badge-danger'}`}>
                      {exp.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--danger-color)', fontSize: '0.875rem' }}>
                    {missing.join(', ') || 'None'}
                  </td>
                </tr>
              );
            })}
            {exports.length === 0 && <tr><td colSpan={5} style={{textAlign:'center', padding:'24px'}}>No exports found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default ExportSupportView;
