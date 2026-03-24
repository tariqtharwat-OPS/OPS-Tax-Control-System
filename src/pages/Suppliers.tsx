import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Supplier } from '../types';
import { useAuth } from '../AuthContext';

export const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { profile } = useAuth();
  
  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<'fisherman' | 'collector' | 'company' | 'service_provider'>('fisherman');
  const [nik, setNik] = useState('');
  const [npwp, setNpwp] = useState('');
  const [village, setVillage] = useState('');
  const [island, setIsland] = useState('');

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const q = collection(db, 'suppliers');
      const querySnapshot = await getDocs(q);
      const fetched: Supplier[] = [];
      querySnapshot.forEach((d) => {
        fetched.push({ id: d.id, ...d.data() } as Supplier);
      });
      setSuppliers(fetched);
    } catch (e) {
      console.error(e);
      alert('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !type) {
      return alert('Name and Type are required.');
    }

    // Check Duplicate Rule
    const duplicateCheck = query(collection(db, 'suppliers'), where('name', '==', name));
    const dupSnapshot = await getDocs(duplicateCheck);
    if (!dupSnapshot.empty) {
      return alert('A supplier with this name already exists.');
    }

    try {
      const newSupplierData = {
        supplierId: `SUP-${Date.now()}`,
        name,
        type,
        nik: nik || null,
        npwp: npwp || null,
        village: village || null,
        island: island || null,
        identityStatus: (!nik && !npwp) ? 'pending' : 'verified',
        isActive: true,
        createdAt: Timestamp.now(),
        createdBy: profile?.uid
      };

      await addDoc(collection(db, 'suppliers'), newSupplierData);
      
      setShowForm(false);
      setName('');
      setNik('');
      setNpwp('');
      setVillage('');
      setIsland('');
      fetchSuppliers();
    } catch (e) {
      console.error(e);
      alert('Failed to save supplier.');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Supplier Master</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Supplier'}
        </button>
      </div>

      {showForm && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3>Add New Supplier</h3>
          <form onSubmit={handleAddSupplier} style={{ marginTop: '16px' }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input required className="glass-input" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Type *</label>
                <select className="glass-input" value={type} onChange={e => setType(e.target.value as any)}>
                  <option value="fisherman">Fisherman</option>
                  <option value="collector">Collector</option>
                  <option value="company">Company</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">NIK (KTP)</label>
                <input className="glass-input" value={nik} onChange={e => setNik(e.target.value)} placeholder="If available" />
              </div>
              <div className="form-group">
                <label className="form-label">NPWP (Tax ID)</label>
                <input className="glass-input" value={npwp} onChange={e => setNpwp(e.target.value)} placeholder="If available" />
              </div>
              <div className="form-group">
                <label className="form-label">Village</label>
                <input className="glass-input" value={village} onChange={e => setVillage(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Island</label>
                <input className="glass-input" value={island} onChange={e => setIsland(e.target.value)} />
              </div>
            </div>
            {!nik && !npwp && (
              <div style={{ color: 'var(--warning-color)', marginBottom: '16px', fontSize: '0.875rem' }}>
                Warning: Registering a fisherman without NIK or NPWP will flag their identity status as 'Pending'. Remote evidence (declarations) will be required at purchase time.
              </div>
            )}
            <button type="submit" className="btn-primary">Save Supplier</button>
          </form>
        </div>
      )}

      <div className="glass-panel">
        {loading ? (
          <div style={{ padding: '24px' }}>Loading...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Type</th>
                <th>ID Status</th>
                <th>Location</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id}>
                  <td>{s.supplierId}</td>
                  <td>{s.name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{s.type}</td>
                  <td>
                    <span className={`badge ${s.identityStatus === 'verified' ? 'badge-success' : s.identityStatus === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                      {s.identityStatus}
                    </span>
                  </td>
                  <td>{s.village || '-'}, {s.island || '-'}</td>
                  <td>
                    <span className={`badge ${s.isActive ? 'badge-info' : 'badge-danger'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>No suppliers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
export default Suppliers;
