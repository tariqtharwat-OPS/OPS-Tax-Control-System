import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { InventoryBatch, Location } from '../types';

export const Inventory: React.FC = () => {
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const bSnap = await getDocs(collection(db, 'inventory'));
      setBatches(bSnap.docs.map(d => ({id: d.id, ...d.data()} as InventoryBatch)));

      const lSnap = await getDocs(collection(db, 'locations'));
      setLocations(lSnap.docs.map(d => ({id: d.id, ...d.data()} as Location)));
    } catch (error: any) {
      alert('Failed to load inventory: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Inventory Batches</h1>
        <button className="btn-secondary" onClick={fetchInventory}>Refresh</button>
      </div>

      <div className="glass-panel">
        {loading ? (
          <div style={{ padding: '24px' }}>Loading...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Batch ID</th>
                <th>Location</th>
                <th>Species</th>
                <th>Grade/Size</th>
                <th>Initial Qty</th>
                <th>Remaining Qty</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(b => {
                const loc = locations.find(l => l.id === b.locationId);
                return (
                  <tr key={b.id}>
                    <td>{b.batchId}</td>
                    <td>{loc?.name || b.locationId}</td>
                    <td>{b.species}</td>
                    <td>{b.grade} / {b.size}</td>
                    <td>{b.quantityReceived} kg</td>
                    <td style={{ fontWeight: 600 }}>{b.quantityRemaining} kg</td>
                    <td>
                      <span className={`badge ${b.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {batches.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>No inventory batches found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
export default Inventory;
