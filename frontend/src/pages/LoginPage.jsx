import React, { useState } from 'react';
import { Bus, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage({ setActiveTab }) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleQuickDemoFill = (roleEmail, rolePass) => {
    setIdentifier(roleEmail);
    setPassword(rolePass);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError('Please enter your email or username.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      setLoading(true);
      const user = await login(identifier.trim(), password);

      // Redirect based on exact TransitIQ role
      switch (user.role) {
        case 'admin':
          setActiveTab('insights');
          break;
        case 'conductor':
          setActiveTab('conductor');
          break;
        case 'passenger':
        default:
          setActiveTab('dashboard');
          break;
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials or server availability.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 sm:my-12">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-md">
        {/* TransitIQ Branding */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md text-white">
            <Bus className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Transit<span className="text-teal-600">IQ</span> Authentication
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Sign in to access your TransitIQ role dashboard
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Authentication Error</p>
              <p className="mt-0.5 text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email Address or Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="passenger@example.com or passenger"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500 border-slate-300 h-4 w-4"
              />
              Remember session
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold text-xs rounded-xl shadow-sm hover:shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Logging in...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Accounts (Click to Fill) */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Quick Demo Accounts (Click to Fill)
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickDemoFill('passenger@example.com', 'passenger123')}
              className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-left hover:border-teal-400 transition"
            >
              <div className="font-semibold text-slate-800">Passenger</div>
              <div className="text-[10px] text-slate-500 truncate">passenger@example.com</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoFill('conductor@example.com', 'conductor123')}
              className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-left hover:border-teal-400 transition"
            >
              <div className="font-semibold text-slate-800">Conductor</div>
              <div className="text-[10px] text-slate-500 truncate">conductor@example.com</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoFill('admin@example.com', 'admin123')}
              className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-left hover:border-teal-400 transition"
            >
              <div className="font-semibold text-slate-800">Admin</div>
              <div className="text-[10px] text-slate-500 truncate">admin@example.com</div>
            </button>
          </div>
        </div>

        {/* Register Link */}
        <div className="mt-6 text-center text-xs text-slate-600">
          Don't have an account?{' '}
          <button
            onClick={() => setActiveTab('register')}
            className="font-semibold text-teal-600 hover:text-teal-700 hover:underline"
          >
            Register here
          </button>
        </div>
      </div>
    </div>
  );
}
