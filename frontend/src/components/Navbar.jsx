import React from 'react';
import { Bus, Search, MapPin, Navigation, Cpu, BookOpen, LogOut, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activeTab, setActiveTab, socketConnected, latestEvent }) {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'home', label: 'Home', icon: Bus },
    { id: 'dashboard', label: 'Track Bus', icon: Search },
    { id: 'routes', label: 'Routes', icon: MapPin },
    { id: 'insights', label: 'Admin Insights', icon: Cpu },
    { id: 'conductor', label: 'Conductor Mode', icon: Navigation },
    { id: 'simulator', label: 'Try Demo', icon: Cpu },
    { id: 'about', label: 'About', icon: BookOpen },
  ];

  const handleLogout = () => {
    logout();
    setActiveTab('login');
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'conductor': return 'Bus Conductor';
      case 'admin': return 'Admin';
      case 'passenger':
      default: return 'Passenger';
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 lg:px-8 py-3 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
          <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center shadow-sm">
            <Bus className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Transit<span className="text-teal-600">IQ</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">Real-Time Bus Tracking</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 border border-teal-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User Auth Profile & Socket Connection Status */}
        <div className="flex items-center gap-3">
          {/* Socket Connection Pill */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600">
            {socketConnected ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </span>
                <span className="text-teal-700 font-medium text-[11px]">Connected</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                <span className="text-slate-500 text-[11px]">Connecting...</span>
              </>
            )}
          </div>

          {/* User Auth State Bar */}
          {user ? (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1 pr-2">
              <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs uppercase">
                {user.full_name ? user.full_name.charAt(0) : 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-800 leading-none">{user.full_name}</p>
                <span className="text-[10px] font-semibold text-teal-700 uppercase tracking-wider">
                  {getRoleDisplayName(user.role)}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Log Out"
                className="ml-1 p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('login')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'login'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
              <button
                onClick={() => setActiveTab('register')}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'register'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Register
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
