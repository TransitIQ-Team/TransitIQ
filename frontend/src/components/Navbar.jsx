import React from 'react';
import { Bus, Search, MapPin, Navigation, Cpu, BookOpen, LogIn, LogOut } from 'lucide-react';

const ALL_NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Bus },
  { id: 'dashboard', label: 'Track Bus', icon: Search },
  { id: 'routes', label: 'Routes', icon: MapPin },
  { id: 'insights', label: 'Insights', icon: Cpu },
  { id: 'conductor', label: 'Driver Mode', icon: Navigation },
  { id: 'simulator', label: 'Simulator', icon: Cpu },
  { id: 'about', label: 'About', icon: BookOpen },
];

const ROLE_ALLOWED_TABS = {
  Passenger: ['home', 'dashboard', 'routes', 'about'],
  Conductor: ['dashboard', 'routes', 'conductor', 'simulator', 'about'],
  Admin: ['home', 'dashboard', 'routes', 'insights', 'simulator', 'about'],
  Guest: ['home', 'dashboard', 'routes', 'simulator', 'about', 'login']
};

export default function Navbar({ activeTab, setActiveTab, socketConnected, latestEvent, user, onLogout }) {
  const currentRole = user?.role || 'Guest';
  const allowedTabs = ROLE_ALLOWED_TABS[currentRole] || ROLE_ALLOWED_TABS.Guest;

  const visibleNavItems = ALL_NAV_ITEMS.filter((item) => allowedTabs.includes(item.id));

  const handleBrandClick = () => {
    if (user?.role === 'Conductor') {
      setActiveTab('conductor');
    } else if (user?.role === 'Admin') {
      setActiveTab('insights');
    } else {
      setActiveTab('home');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 lg:px-8 py-3 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={handleBrandClick}>
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
          {visibleNavItems.map((item) => {
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

        {/* User Auth & Socket Pill Section */}
        <div className="flex items-center gap-3">
          {/* Socket Connection Pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600">
            {socketConnected ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </span>
                <span className="text-teal-700 font-medium text-[11px]">
                  Live Server
                </span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                <span className="text-slate-500 text-[11px]">
                  Connecting...
                </span>
              </>
            )}
          </div>

          {/* User Account Pill / Demo Login Button */}
          {user ? (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
              <div className="flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800 leading-none">{user.name}</span>
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wide leading-tight">
                  {user.role}
                </span>
              </div>
              <button
                onClick={onLogout}
                title="Sign out of demo account"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveTab('login')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'login'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
