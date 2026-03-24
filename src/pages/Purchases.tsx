import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, Timestamp, writeBatch, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { Purchase, PurchaseLineItem, Supplier, Location, InventoryBatch } from '../types';
import { useAuth } from '../AuthContext';

export const Purchases: React.FC = () => {
  const { profile } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form Header State
  const [supplierId, setSupplierId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [sourceDocRef, setSourceDocRef] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash'|'transfer'|'pending'>('pending');
  const [notes, setNotes] = useState('');
  
  // Remote Evidence State
  const [hasDeclarationLetter, setHasDeclarationLetter] = useState(false);
  const [hasWitness, setHasWitness] = useState(false);
  const [witnessName, setWitnessName] = useState('');
  
  // Form Lines State
  const [lineItems, setLineItems] = useState<PurchaseLineItem[]>([]);

  const fetchDependencies = async () => {
    setLoading(true);
    try {
      const pSnap = await getDocs(collection(db, 'purchases'));
      setPurchases(pSnap.docs.map(d => ({id: d.id, ...d.data()} as Purchase)));

      const sSnap = await getDocs(collection(db, 'suppliers'));
      setSuppliers(sSnap.docs.map(d => ({id: d.id, ...d.data()} as Supplier)));

      const lSnap = await getDocs(collection(db, 'locations'));
      setLocations(lSnap.docs.map(d => ({id: d.id, ...d.data()} as Location)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  const addLineItem = () => {
    setLineItems([...lineItems, {
      id: Date.now().toString(),
      species: '', size: '', grade: '', condition: 'Fresh',
      weightKg: 0, pricePerKg: 0, totalValue: 0
    }]);
  };

  const updateLineItem = (index: number, field: keyof PurchaseLineItem, value: any) => {
    const newLines = [...lineItems];
    newLines[index] = { ...newLines[index], [field]: value };
    // Auto calculate
    if (field === 'weightKg' || field === 'pricePerKg') {
      newLines[index].totalValue = (newLines[index].weightKg || 0) * (newLines[index].pricePerKg || 0);
    }
    setLineItems(newLines);
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !locationId) return alert('Supplier and Location are required.');
    if (lineItems.length === 0) return alert('At least one fish line item is required.');

    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return alert('Invalid supplier');

    if (supplier.identityStatus === 'pending') {
      if (!hasDeclarationLetter) {
        return alert('Cannot finalize no-ID fisherman purchase without enhanced evidence (Declaration Letter).');
      }
    }

    const loc = locations.find(l => l.id === locationId);
    if (!loc) return alert('Invalid location');

    try {
      setLoading(true);
      const batch = writeBatch(db);
      const batchIdStr = `BATCH-${loc.siteCode}-${Date.now()}`;
      
      const newPurchaseRef = doc(collection(db, 'purchases'));
      const totalAmount = lineItems.reduce((acc, curr) => acc + curr.totalValue, 0);

      // Create the Inventory Batches
      const batchLinks: string[] = [];
      for (const item of lineItems) {
        if (!item.species || item.weightKg <= 0) continue;
        const invRef = doc(collection(db, 'inventory'));
        const invBatch: InventoryBatch = {
          id: invRef.id,
          batchId: `${batchIdStr}-${item.species}`,
          locationId,
          sourcePurchaseId: newPurchaseRef.id,
          species: item.species,
          size: item.size,
          grade: item.grade,
          quantityReceived: item.weightKg,
          quantityUsed: 0,
          quantityTransferred: 0,
          quantitySold: 0,
          quantityRemaining: item.weightKg,
          status: 'active',
          createdAt: new Date().toISOString()
        };
        batch.set(invRef, invBatch);
        batchLinks.push(invBatch.batchId);
      }

      const purchase: Omit<Purchase, 'id'> = {
        transactionId: `TX-${loc.siteCode}-${Date.now()}`,
        sourceDocRef,
        purchaseDate,
        deliveryDate: new Date().toISOString(),
        supplierId,
        locationId,
        nitku: loc.nitku,
        landingPoint: loc.name,
        receivingLocation: loc.name,
        batchId: batchLinks.join(','),
        receivingOfficerId: profile?.uid || 'Unknown',
        weighedBy: profile?.uid || 'Unknown',
        hasPhoto: false,
        paymentMethod,
        paymentStatus: 'pending',
        notes,
        escalationFlag: false,
        hasDeclarationLetter,
        hasWitness,
        witnessName,
        hasThumbprint: false,
        lineItems,
        totalAmount,
        createdAt: new Date().toISOString(),
        createdBy: profile?.uid || 'Unknown'
      };

      batch.set(newPurchaseRef, purchase);
      await batch.commit();

      setShowForm(false);
      fetchDependencies();
    } catch (error: any) {
      alert('Error saving purchase: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedSupplier = suppliers.find(s => s.id === supplierId);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Purchases</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'New Purchase'}
        </button>
      </div>

      {showForm && (
        <form className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }} onSubmit={handleSavePurchase}>
          <h3>Header Info</h3>
          <div className="grid-3" style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label className="form-label">Location *</label>
              <select className="glass-input" required value={locationId} onChange={e => setLocationId(e.target.value)}>
                <option value="">Select Location</option>
                {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name} ({loc.siteCode})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Supplier *</label>
              <select className="glass-input" required value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                <option value="">Select Supplier</option>
                {suppliers.map(sup => <option key={sup.id} value={sup.id}>{sup.name} - {sup.identityStatus}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Purchase Date *</label>
              <input type="date" className="glass-input" required value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Source Document Ref</label>
              <input type="text" className="glass-input" value={sourceDocRef} onChange={e => setSourceDocRef(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Config</label>
              <select className="glass-input" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)}>
                <option value="pending">Pending</option>
                <option value="cash">Cash</option>
                <option value="transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          {selectedSupplier?.identityStatus === 'pending' && (
            <div style={{ marginTop: '16px', padding: '16px', border: '1px solid var(--warning-color)', borderRadius: '8px' }}>
              <h4 style={{ color: 'var(--warning-color)' }}>Authentication Escalation: Temporary ID / No NIK</h4>
              <p style={{ fontSize: '0.875rem', marginBottom: '12px' }}>
                This supplier is missing permanent tax identification. You MUST collect a signed declaration to proceed.
              </p>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={hasDeclarationLetter} onChange={e => setHasDeclarationLetter(e.target.checked)} />
                  Declaration Letter Collected
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={hasWitness} onChange={e => setHasWitness(e.target.checked)} />
                  Witness Present
                </label>
              </div>
              {hasWitness && (
                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="form-label">Witness Name</label>
                  <input type="text" className="glass-input" value={witnessName} onChange={e => setWitnessName(e.target.value)} />
                </div>
              )}
            </div>
          )}

          <h3 style={{ marginTop: '32px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Line Items</h3>
          <div style={{ marginTop: '16px' }}>
            {lineItems.map((line, i) => (
              <div key={line.id} className="grid-4" style={{ marginBottom: '16px', alignItems: 'flex-end' }}>
                <div className="form-group">
                  <label className="form-label">Species</label>
                  <input className="glass-input" required value={line.species} onChange={e => updateLineItem(i, 'species', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Weight (KG)</label>
                  <input type="number" step="0.01" className="glass-input" required value={line.weightKg} onChange={e => updateLineItem(i, 'weightKg', parseFloat(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Price / KG</label>
                  <input type="number" className="glass-input" required value={line.pricePerKg} onChange={e => updateLineItem(i, 'pricePerKg', parseFloat(e.target.value))} />
                </div>
                <div style={{ paddingBottom: '24px' }}>
                  <strong>= {(line.totalValue).toLocaleString()} IDR</strong>
                  <button type="button" onClick={() => setLineItems(lineItems.filter((_, idx) => idx !== i))} style={{ marginLeft: '16px', background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer' }}>Remove</button>
                </div>
              </div>
            ))}
            <button type="button" className="btn-secondary" onClick={addLineItem}>+ Add Fish Line</button>
          </div>

          <div style={{ marginTop: '24px', textAlign: 'right' }}>
            <h3 style={{ marginBottom: '16px' }}>Total: {lineItems.reduce((acc, curr) => acc + curr.totalValue, 0).toLocaleString()} IDR</h3>
            <button type="submit" className="btn-primary" disabled={loading}>Save Purchase Record</button>
          </div>
        </form>
      )}

      <div className="glass-panel">
        <table>
          <thead>
            <tr>
              <th>TX ID</th>
              <th>Date</th>
              <th>Location</th>
              <th>Supplier</th>
              <th>Amount</th>
              <th>Payment</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map(p => {
              const loc = locations.find(l => l.id === p.locationId);
              const sup = suppliers.find(s => s.id === p.supplierId);
              return (
                <tr key={p.id}>
                  <td>{p.transactionId}</td>
                  <td>{p.purchaseDate}</td>
                  <td>{loc?.name || p.locationId}</td>
                  <td>{sup?.name || p.supplierId}</td>
                  <td>{p.totalAmount.toLocaleString()} IDR</td>
                  <td>
                    <span className={`badge ${p.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                      {p.paymentStatus}
                    </span>
                  </td>
                </tr>
              );
            })}
            {purchases.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>No purchases found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default Purchases;
