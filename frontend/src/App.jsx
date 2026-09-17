import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import InsightsPage from './pages/InsightsPage';
import RouteComparisonPage from './pages/RouteComparisonPage';
import AboutPage from './pages/AboutPage';
import ConductorPage from './pages/ConductorPage';
import SimulatorPage from './pages/SimulatorPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

function AppContent() {
  const [activeTab, setActiveTab] = useState('home');
  const [socketConnected, setSocketConnected] = useState(false);
  const [latestEvent, setLatestEvent] = useState(null);

  useEffect(() => {
    // Socket.IO passenger connection listener
    const socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      timeout: 3000
    });

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('passenger:subscribe-trip', { trip_id: 'TRIP-101' });
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('trip:location-updated', (data) => {
      setLatestEvent(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const renderActivePage = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage setActiveTab={setActiveTab} />;
      case 'login':
        return <LoginPage setActiveTab={setActiveTab} />;
      case 'register':
        return <RegisterPage setActiveTab={setActiveTab} />;
      case 'dashboard':
        return (
          <ProtectedRoute allowedRoles={['farmer', 'passenger', 'admin', 'officer', 'insurer', 'conductor']} setActiveTab={setActiveTab}>
            <DashboardPage />
          </ProtectedRoute>
        );
      case 'conductor':
        return (
          <ProtectedRoute allowedRoles={['officer', 'conductor', 'admin']} setActiveTab={setActiveTab}>
            <ConductorPage />
          </ProtectedRoute>
        );
      case 'simulator':
        return (
          <ProtectedRoute allowedRoles={['officer', 'conductor', 'admin']} setActiveTab={setActiveTab}>
            <SimulatorPage />
          </ProtectedRoute>
        );
      case 'insights':
        return (
          <ProtectedRoute allowedRoles={['admin']} setActiveTab={setActiveTab}>
            <InsightsPage />
          </ProtectedRoute>
        );
      case 'routes':
        return (
          <ProtectedRoute allowedRoles={['insurer', 'admin']} setActiveTab={setActiveTab}>
            <RouteComparisonPage />
          </ProtectedRoute>
        );
      case 'about':
        return <AboutPage />;
      default:
        return <HomePage setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        socketConnected={socketConnected}
        latestEvent={latestEvent}
      />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderActivePage()}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">TransitIQ</span>
            <span>•</span>
            <span>Public Transit Information System</span>
          </div>
          <p className="text-slate-400">
            Pilot Corridor: Sehore Bus Stand ↔ VIT Bhopal Outer Highway
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
