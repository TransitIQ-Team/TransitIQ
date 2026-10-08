import React, { useState } from 'react';
import { Bus, Lock, Mail, AlertCircle } from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    email: 'passenger@demo.com',
    password: 'passenger123',
    role: 'Passenger',
    name: 'Passenger User',
    defaultTab: 'home',
    description: 'Track buses, check ETAs & view routes'
  },
  {
    email: 'driver@demo.com',
    password: 'driver123',
    role: 'Conductor',
    name: 'Bus Conductor',
    defaultTab: 'conductor',
    description: 'Stream live phone GPS & manage active trip'
  },
  {
    email: 'admin@demo.com',
    password: 'admin123',
    role: 'Admin',
    name: 'System Admin',
    defaultTab: 'insights',
    description: 'Access ML insights & system performance'
  }
];

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();
    const account = DEMO_ACCOUNTS.find(
      (acc) => acc.email.toLowerCase() === trimmedEmail && acc.password === password
    );

    if (account) {
      const userSession = {
        email: account.email,
        role: account.role,
        name: account.name,
        defaultTab: account.defaultTab
      };
      onLoginSuccess(userSession);
    } else {
      setError('Invalid email or password. Please use one of the demo credentials below.');
    }
  };

  const fillDemoAccount = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="max-w-md mx-auto py-6 sm:py-10">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center mx-auto shadow-md">
            <Bus className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Transit<span className="text-teal-600">IQ</span> Portal Sign In
          </h1>
          <p className="text-xs text-slate-500">
            Choose your role or enter your credentials to sign in
          </p>
        </div>

        {/* Quick Fill Demo Roles */}
        <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Quick Role Login
          </span>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => fillDemoAccount(acc)}
                className={`py-2 px-2 text-center rounded-xl border text-xs font-semibold transition-all ${
                  email === acc.email
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-teal-400 hover:bg-teal-50/50'
                }`}
              >
                <div className="font-bold">{acc.role}</div>
                <div className="text-[10px] opacity-80 font-normal">Click to fill</div>
              </button>
            ))}
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. passenger@demo.com"
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
          >
            Sign In
          </button>
        </form>

        {/* Demo Credentials Reference Box */}
        <div className="pt-2 border-t border-slate-100">
          <p className="text-[11px] font-semibold text-slate-600 mb-2">Available Test Accounts:</p>
          <div className="space-y-1.5 text-[11px]">
            {DEMO_ACCOUNTS.map((acc) => (
              <div key={acc.email} className="flex justify-between items-center text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                <div>
                  <span className="font-bold text-slate-800">{acc.role}: </span>
                  <span className="font-mono text-slate-600">{acc.email}</span>
                </div>
                <span className="font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
                  {acc.password}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
