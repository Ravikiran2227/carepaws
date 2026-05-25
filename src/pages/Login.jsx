import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PawPrint, Loader2 } from 'lucide-react';


export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const { login, adminLogin } = useAuth();
  const navigate = useNavigate();

  const { currentUser, userData, loading: authLoading } = useAuth();
  //const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && currentUser && userData) {
      if (userData.role === 'owner') {
        navigate('/dashboard?tab=carers');
      } else if (userData.role === 'carer') {
        navigate('/carer');
      } else if (userData.role === 'admin') {
        navigate('/admin');
      }
    }
  }, [currentUser, userData, authLoading, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError('');
      setFormLoading(true);
      if (email === 'admin@gmail.com' && password === 'admin@987') {
        await adminLogin(email, password);
      } else {
        await login(email, password);
      }
      // Wait for auth context to update and redirect naturally based on role
      // Or we can just redirect to home and let protected routes handle it
      //navigate('/');
    } catch (err) {
      setError('Failed to log in. Please check your credentials.');
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 glass-card p-8 rounded-2xl">
        <div className="text-center">
          <PawPrint className="mx-auto h-12 w-12 text-brand-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-slate-900">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-600">
            Or{' '}
            <Link to="/signup" className="font-medium text-brand-600 hover:text-brand-500">
              create a new account
            </Link>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm text-center">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit} autoComplete="off">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="carepaws-login-email"
                type="email"
                required
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                readOnly
                onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
                className="appearance-none relative block w-full px-3 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:z-10 sm:text-sm transition-shadow"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="carepaws-login-passcode"
                type="password"
                required
                autoComplete="new-password"
                readOnly
                onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
                className="appearance-none relative block w-full px-3 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:z-10 sm:text-sm transition-shadow"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={formLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-full text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-colors"
            >
              {formLoading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/forgot-password"
              className="text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Forgot password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
