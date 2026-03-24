import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, writeBatch, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { InventoryBatch, Location, InternalTransfer, TransferLine } from '../types';

export const Transfers: React.FC = () => {
  const [transfers, setTransfers] = useState<InternalTransfer[]>([]);
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [originId, setOriginId] = useState('');
  const [destId, setDestId] = useState('');
  const [transportRef, setTransportRef] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<TransferLine[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const tSnap = await getDocs(collection(db, 'transfers'));
      setTransfers(tSnap.docs.map(d => ({id: d.id, ...d.data()} as InternalTransfer)));

      const bSnap = await getDocs(collection(db, 'inventory'));
      setBatches(bSnap.docs.map(d => ({id: d.id, ...d.data()} as InventoryBatch)));

      const lSnap = await getDocs(collection(db, 'locations'));
      setLocations(lSnap.docs.map(d => ({id: d.id, ...d.data()} as Location)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddLine = () => {
    setLines([...lines, { batchId: '', quantity: 0 }]);
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originId || !destId || originId === destId) return alert('Origin and Destination must be different and selected.');
    if (lines.length === 0) return alert('Must add at least one batch line.');

    try {
      setLoading(true);
      const batchOp = writeBatch(db);
      
      const newTransferRef = doc(collection(db, 'transfers'));
      
      // Update inventory batches to deduct qty
      for (const line of lines) {
        if (!line.batchId || line.quantity <= 0) continue;
        const b = batches.find(bx => bx.id === line.batchId);
        if (!b) throw new Error('Invalid batch');
        if (b.quantityRemaining < line.quantity) throw new Error(`Not enough quantity in ${b.batchId}`);
        
        batchOp.update(doc(db, 'inventory', b.id), {
          quantityRemaining: increment(-line.quantity),
          quantityTransferred: increment(line.quantity)
        });
      }

      const transferDoc: Omit<InternalTransfer, 'id'> = {
        transferId: `TRF-${Date.now()}`,
        originLocationId: originId,
        destinationLocationId: destId,
        lines,
        dispatchDate: new Date().toISOString(),
        status: 'pending',
        transportRef,
        notes
      };

      batchOp.set(newTransferRef, transferDoc);
      await batchOp.commit();

      setShowForm(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReceive = async (transferId: string, lines: TransferLine[], destId: string) => {
    if (!window.confirm('Confirm receipt at destination?')) return;
    try {
      setLoading(true);
      const batchOp = writeBatch(db);
      
      // Mark transfer as received
      batchOp.update(doc(db, 'transfers', transferId), {
        status: 'received',
        receiveDate: new Date().toISOString()
      });

      // Create new batches at destination
      for (const line of lines) {
        const sourceBatch = batches.find(b => b.id === line.batchId);
        if (!sourceBatch) continue;

        const newDestRef = doc(collection(db, 'inventory'));
        batchOp.set(newDestRef, {
          batchId: `${sourceBatch.batchId}-RCV`,
          locationId: destId,
          sourcePurchaseId: sourceBatch.sourcePurchaseId,
          species: sourceBatch.species,
          size: sourceBatch.size,
          grade: sourceBatch.grade,
          quantityReceived: line.quantity,
          quantityUsed: 0,
          quantityTransferred: 0,
          quantitySold: 0,
          quantityRemaining: line.quantity,
          status: 'active',
          createdAt: new Date().toISOString()
        });
      }

      await batchOp.commit();
      fetchData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const originBatches = batches.filter(b => b.locationId === originId && b.quantityRemaining > 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Internal Transfers</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'New Transfer'}
        </button>
      </div>

      {showForm && (
        <form className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }} onSubmit={handleCreateTransfer}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Origin Location</label>
              <select className="glass-input" required value={originId} onChange={e => setOriginId(e.target.value)}>
                <option value="">Select Origin</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Destination Location</label>
              <select className="glass-input" required value={destId} onChange={e => setDestId(e.target.value)}>
                <option value="">Select Destination</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
          
          <h3 style={{ marginTop: '16px', marginBottom: '16px' }}>Batches to Transfer</h3>
          {lines.map((line, idx) => (
            <div key={idx} className="grid-2" style={{ marginBottom: '16px' }}>
              <select 
                className="glass-input" required
                value={line.batchId} 
                onChange={e => {
                  const newL = [...lines]; newL[idx].batchId = e.target.value; setLines(newL);
                }}
              >
                <option value="">Select Batch from Origin</option>
                {originBatches.map(b => <option key={b.id} value={b.id}>{b.batchId} - {b.quantityRemaining}kg left</option>)}
              </select>
              <input 
                type="number" step="0.1" className="glass-input" required placeholder="Quantity (kg)"
                value={line.quantity || ''}
                onChange={e => {
                  const newL = [...lines]; newL[idx].quantity = parseFloat(e.target.value); setLines(newL);
                }}
              />
            </div>
          ))}
          <button type="button" className="btn-secondary" onClick={handleAddLine} disabled={!originId}>+ Add Batch Line</button>
          
          <div style={{ marginTop: '24px' }}>
            <button type="submit" className="btn-primary" disabled={loading}>Dispatch Transfer</button>
          </div>
        </form>
      )}

      <div className="glass-panel">
        <table>
          <thead>
            <tr>
              <th>Transfer ID</th>
              <th>Origin</th>
              <th>Destination</th>
              <th>Dispatch Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map(t => {
              const orig = locations.find(l => l.id === t.originLocationId);
              const dest = locations.find(l => l.id === t.destinationLocationId);
              return (
                <tr key={t.id}>
                  <td>{t.transferId}</td>
                  <td>{orig?.name || t.originLocationId}</td>
                  <td>{dest?.name || t.destinationLocationId}</td>
                  <td>{new Date(t.dispatchDate).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${t.status === 'received' ? 'badge-success' : 'badge-warning'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td>
                    {t.status === 'pending' && (
                      <button className="btn-primary" onClick={() => handleReceive(t.id, t.lines, t.destinationLocationId)}>
                        Receive
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {transfers.length === 0 && <tr><td colSpan={6} style={{textAlign:'center', padding:'24px'}}>No transfers</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default Transfers;
