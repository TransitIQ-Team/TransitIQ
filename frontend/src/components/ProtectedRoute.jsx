import React from 'react';
import { useAuth } from '../context/AuthContext';
import LoginPage from '../pages/LoginPage';
import { ShieldAlert, ArrowRight } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles, setActiveTab }) {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 text-xs">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <span>Verifying TransitIQ authentication session...</span>
      </div>
    );
  }

  // Not authenticated -> Render Login page
  if (!user) {
    return <LoginPage setActiveTab={setActiveTab} />;
  }

  // Enforce role-based access control
  if (allowedRoles && allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    const getRoleDashboard = (role) => {
      switch (role) {
        case 'admin':
          return 'insights';
        case 'conductor':
          return 'conductor';
        case 'passenger':
        default:
          return 'dashboard';
      }
    };

    const targetDashboard = getRoleDashboard(user.role);
    const roleDisplayName =
      user.role === 'conductor'
        ? 'Bus Conductor'
        : user.role === 'admin'
        ? 'Admin'
        : 'Passenger';

    return (
      <div className="max-w-md mx-auto my-12 bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm">
        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-600">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">403 — Access Restricted</h2>
        <p className="text-xs text-slate-500 mt-2">
          Your current account role (<span className="font-bold text-slate-700">{roleDisplayName}</span>) does not have permission to view this section.
        </p>

        <button
          onClick={() => setActiveTab(targetDashboard)}
          className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
        >
          Go to Your {roleDisplayName} Interface
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return children;
}
