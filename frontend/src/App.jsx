import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import InsightsPage from './pages/InsightsPage';
import RouteComparisonPage from './pages/RouteComparisonPage';
import AboutPage from './pages/AboutPage';
import ConductorPage from './pages/ConductorPage';
import SimulatorPage from './pages/SimulatorPage';
import LoginPage from './pages/LoginPage';

const API_URL = import.meta.env.VITE_API_URL || 'https://transitiq-backend-1icp.onrender.com';

const ROLE_CONFIG = {
  Passenger: {
    landing: 'home',
    allowedTabs: ['home', 'dashboard', 'routes', 'about']
  },
  Conductor: {
    landing: 'conductor',
    allowedTabs: ['dashboard', 'routes', 'conductor', 'simulator', 'about']
  },
  Admin: {
    landing: 'insights',
    allowedTabs: ['home', 'dashboard', 'routes', 'insights', 'simulator', 'about']
  },
  Guest: {
    landing: 'home',
    allowedTabs: ['home', 'dashboard', 'routes', 'simulator', 'about', 'login']
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [socketConnected, setSocketConnected] = useState(false);
  const [latestEvent, setLatestEvent] = useState(null);

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('transitiq_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.error('Failed to parse saved user from localStorage:', e);
      return null;
    }
  });

  const currentRoleConfig = ROLE_CONFIG[user?.role] || ROLE_CONFIG.Guest;

  // Route protection: If activeTab is not allowed for the current role, redirect to role landing page
  useEffect(() => {
    if (!currentRoleConfig.allowedTabs.includes(activeTab)) {
      setActiveTab(currentRoleConfig.landing);
    }
  }, [user, activeTab, currentRoleConfig]);

  useEffect(() => {
    // Socket.IO passenger connection listener
    const socket = io(API_URL, {
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

  const handleLoginSuccess = (userSession) => {
    setUser(userSession);
    try {
      localStorage.setItem('transitiq_user', JSON.stringify(userSession));
    } catch (e) {
      console.error('Failed to save user session to localStorage:', e);
    }
    const config = ROLE_CONFIG[userSession.role] || ROLE_CONFIG.Guest;
    setActiveTab(config.landing);
  };

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem('transitiq_user');
    } catch (e) {
      console.error('Failed to clear user session from localStorage:', e);
    }
    setActiveTab('home');
  };

  const renderActivePage = () => {
    // Safety fallback: if not allowed, render landing page
    if (!currentRoleConfig.allowedTabs.includes(activeTab)) {
      const LandingComponent = {
        home: HomePage,
        conductor: ConductorPage,
        insights: InsightsPage
      }[currentRoleConfig.landing] || HomePage;

      return <LandingComponent setActiveTab={setActiveTab} />;
    }

    switch (activeTab) {
      case 'home':
        return <HomePage setActiveTab={setActiveTab} />;
      case 'dashboard':
        return <DashboardPage />;
      case 'conductor':
        return <ConductorPage />;
      case 'simulator':
        return <SimulatorPage />;
      case 'insights':
        return <InsightsPage />;
      case 'routes':
        return <RouteComparisonPage />;
      case 'about':
        return <AboutPage />;
      case 'login':
        return user ? <HomePage setActiveTab={setActiveTab} /> : <LoginPage onLoginSuccess={handleLoginSuccess} />;
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
        user={user}
        onLogout={handleLogout}
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
