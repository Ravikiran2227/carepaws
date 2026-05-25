import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, PawPrint } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AdminDashboard from './AdminDashboard';

export default function AdminAccess() {
  const { currentUser, userData, loading, adminLogin, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!loading && currentUser && userData?.role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [currentUser, userData, loading, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await adminLogin(email, password);
    } catch (err) {
      console.error('Admin login failed:', err);
      setError(err.message || 'Admin login failed. Please check the credentials or Firebase configuration.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetAdminPassword() {
    setError('');
    setSuccess('');
    setResetting(true);

    try {
      await resetPassword('admin@gmail.com');
      setSuccess('Admin password reset email sent to admin@gmail.com.');
    } catch (err) {
      console.error('Admin reset failed:', err);
      setError('Could not send admin reset email. Add your Vercel domain to Firebase Authentication authorized domains.');
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-600">
        <Loader2 className="animate-spin inline mr-2" /> Loading admin access...
      </div>
    );
  }

  if (currentUser && userData?.role === 'admin') {
    return <AdminDashboard />;
  }

  if (currentUser && userData && userData.role !== 'admin') {
    if (userData.role === 'carer') return <Navigate to="/carer" replace />;
    return <Navigate to="/dashboard?tab=carers" replace />;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 glass-card p-8 rounded-2xl">
        <div className="text-center">
          <PawPrint className="mx-auto h-12 w-12 text-brand-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-slate-900">Admin Login</h2>
          <p className="mt-2 text-sm text-slate-600">Access the CarePaws admin dashboard</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm text-center">
            {success}
          </div>
        )}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit} autoComplete="off">
          <input
            type="email"
            required
            name="carepaws-admin-email"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            readOnly
            onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
            className="appearance-none block w-full px-3 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
            placeholder="Admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              name="carepaws-admin-passcode"
              autoComplete="new-password"
              readOnly
              onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
              className="appearance-none block w-full px-3 py-3 pr-12 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-brand-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-full text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? <Loader2 className="animate-spin h-5 w-5" /> : 'Open Admin Dashboard'}
          </button>
          <button
            type="button"
            onClick={handleResetAdminPassword}
            disabled={resetting}
            className="w-full text-sm font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50"
          >
            {resetting ? 'Sending reset link...' : 'Reset admin password'}
          </button>
        </form>
      </div>
    </div>
  );
}
