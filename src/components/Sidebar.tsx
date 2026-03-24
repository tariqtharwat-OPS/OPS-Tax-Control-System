import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Fish, 
  Box, 
  ArrowRightLeft, 
  DollarSign, 
  Globe 
} from 'lucide-react';
import { useAuth } from '../AuthContext';

export const Sidebar: React.FC = () => {
  const { profile } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        OPS System
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Home size={20} /> Dashboard
        </NavLink>
        {(profile?.role === 'Admin' || profile?.role === 'Site Manager' || profile?.role === 'Purchasing Officer') && (
          <NavLink to="/suppliers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Users size={20} /> Suppliers
          </NavLink>
        )}
        <NavLink to="/purchases" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Fish size={20} /> Purchases
        </NavLink>
        <NavLink to="/inventory" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Box size={20} /> Inventory
        </NavLink>
        <NavLink to="/transfers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <ArrowRightLeft size={20} /> Transfers
        </NavLink>
        {(profile?.role === 'Admin' || profile?.role === 'Finance' || profile?.role === 'Tax') && (
          <NavLink to="/payments" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <DollarSign size={20} /> Payments
          </NavLink>
        )}
        {(profile?.role === 'Admin' || profile?.role === 'Tax' || profile?.role === 'Finance') && (
          <NavLink to="/export-support" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Globe size={20} /> Export Support
          </NavLink>
        )}
      </nav>
    </aside>
  );
};
