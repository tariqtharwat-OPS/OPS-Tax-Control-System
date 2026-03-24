import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';

// Layout wrapper for authenticated pages
const AppLayout = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <Outlet />
      </div>
    </div>
  );
};

import Suppliers from './pages/Suppliers';
import Purchases from './pages/Purchases';
import Inventory from './pages/Inventory';
import Transfers from './pages/Transfers';
import Payments from './pages/Payments';
import ExportSupport from './pages/ExportSupport';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/transfers" element={<Transfers />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/export-support" element={<ExportSupport />} />
          </Route>
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
