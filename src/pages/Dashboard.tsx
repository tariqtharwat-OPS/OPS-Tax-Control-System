import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { seedData } from '../seed';

export const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState({ purchases: 0, pendingIds: 0, pendingPayments: 0 });
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const pSnap = await getDocs(collection(db, 'purchases'));
      const purchases = pSnap.docs.map(d => d.data());
      
      const sSnap = await getDocs(collection(db, 'suppliers'));
      const suppliers = sSnap.docs.map(d => d.data());

      setMetrics({
        purchases: purchases.filter(p => !profile?.locationId || p.locationId === profile.locationId).length,
        pendingIds: suppliers.filter(s => s.identityStatus === 'pending').length,
        pendingPayments: purchases.filter(p => p.paymentStatus === 'pending').length
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [profile]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        {profile?.role === 'Admin' && (
          <button className="btn-secondary" onClick={() => seedData().then(fetchMetrics)}>
            Run Admin Setup / Seed
          </button>
        )}
      </div>
      
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h2>Welcome back, {profile?.displayName || 'User'}!</h2>
        <p style={{ color: '#94a3b8', marginTop: '8px' }}>
          Role: <span style={{fontWeight: 600, color: 'var(--primary-color)'}}>{profile?.role}</span> | Location Access: {profile?.locationId || 'All Sites'}
        </p>
      </div>

      <div className="grid-3">
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ color: '#94a3b8', marginBottom: '8px' }}>Total Purchases</h3>
          <div style={{ fontSize: '2rem', fontWeight: 600 }}>{loading ? '-' : metrics.purchases}</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ color: '#94a3b8', marginBottom: '8px' }}>Pending Identity Reviews</h3>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: metrics.pendingIds > 0 ? 'var(--warning-color)' : 'var(--text-color)' }}>
            {loading ? '-' : metrics.pendingIds}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ color: '#94a3b8', marginBottom: '8px' }}>Pending Payments</h3>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: metrics.pendingPayments > 0 ? 'var(--danger-color)' : 'var(--text-color)' }}>
            {loading ? '-' : metrics.pendingPayments}
          </div>
        </div>
      </div>
    </div>
  );
};

