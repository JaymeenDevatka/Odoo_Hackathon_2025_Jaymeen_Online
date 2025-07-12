import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import BrowseItems from './pages/BrowseItems';
import ItemDetail from './pages/ItemDetail';
import AddItem from './pages/AddItem';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';
import SwapRequests from './pages/SwapRequests';
import Notifications from './pages/Notifications';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/browse" element={<BrowseItems />} />
            <Route path="/item/:id" element={<ItemDetail />} />
            <Route path="/user/:id" element={<Profile />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/add-item" element={
              <PrivateRoute>
                <Layout>
                  <AddItem />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/swaps" element={
              <PrivateRoute>
                <Layout>
                  <SwapRequests />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/notifications" element={
              <PrivateRoute>
                <Layout>
                  <Notifications />
                </Layout>
              </PrivateRoute>
            } />
            
            {/* Admin routes */}
            <Route path="/admin" element={
              <AdminRoute>
                <Layout>
                  <AdminPanel />
                </Layout>
              </AdminRoute>
            } />
          </Routes>
        </div>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App; 