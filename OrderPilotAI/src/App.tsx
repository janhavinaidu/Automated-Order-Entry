import React from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './components/layout/Sidebar';
import BottomNav from './components/layout/BottomNav';
import TopHeader from './components/layout/TopHeader';
import Dashboard from './pages/Dashboard';
import InventoryDashboard from './pages/InventoryDashboard';
import AIInbox from './pages/AIInbox';
import EmailDetail from './pages/EmailDetail';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Inventory from './pages/Inventory';
import Billing from './pages/Billing';
import Dispatch from './pages/Dispatch';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Reports from './pages/Reports';
import { useAuthStore } from './store/useAuthStore';
import './styles/globals.css';

function AppContent() {
  const location = useLocation();
  const { user } = useAuthStore();
  const defaultPath = user?.role === 'INVENTORY' ? '/inventory' : '/dashboard';
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopHeader />
        <div className="page-container">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/"              element={<Navigate to={defaultPath} replace />} />
              <Route path="/dashboard"     element={user?.role === 'INVENTORY' ? <InventoryDashboard /> : <Dashboard />} />
              <Route path="/inbox"         element={<AIInbox />} />
              <Route path="/inbox/:id"     element={<EmailDetail />} />
              <Route path="/orders"        element={<Orders />} />
              <Route path="/orders/:id"    element={<OrderDetail />} />
              <Route path="/inventory"     element={<Inventory />} />
              <Route path="/billing"       element={<Billing />} />
              <Route path="/dispatch"      element={<Dispatch />} />
              <Route path="/reports"       element={user?.role === 'ADMIN' ? <Reports /> : <Navigate to={defaultPath} replace />} />
              <Route path="/analytics"     element={<Navigate to={defaultPath} replace />} />
              <Route path="/profile"       element={<Profile />} />
            </Routes>
          </AnimatePresence>
        </div>
        <BottomNav />
      </div>
    </div>
  );
}

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        {isAuthenticated ? (
          <AppContent key="app" />
        ) : (
          <Login key="login" />
        )}
      </AnimatePresence>
    </BrowserRouter>
  );
}

export default App;
