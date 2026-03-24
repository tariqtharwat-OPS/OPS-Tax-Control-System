import React from 'react';
import { LogOut } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../AuthContext';

export const Topbar: React.FC = () => {
  const { profile } = useAuth();
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 600 }}>{profile?.displayName || 'User'}</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{profile?.role}</div>
        </div>
        <button 
          onClick={handleLogout}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          title="Sign out"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};
