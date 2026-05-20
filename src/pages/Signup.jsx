import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PawPrint, Loader2 } from 'lucide-react';

export default function Signup() {

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [role, setRole] = useState('owner'); // 'owner' or 'carer'

  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // const { signup } = useAuth();
  const navigate = useNavigate();

  //const { currentUser, userData, loading: authLoading } = useAuth();
  // const { currentUser, userData, loading } = useAuth();
  // const navigate = useNavigate();
  const { signup, currentUser, userData, loading: authLoading } = useAuth();

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
    //}, [currentUser, userData, loading, navigate]);
  }, [currentUser, userData, authLoading, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (password !== passwordConfirm) {
      return setError('Passwords do not match');
    }

    try {
      setError('');
      setFormLoading(true);
      await signup(email, password, role, { firstName, lastName });
      //navigate('/');
    } catch (err) {
      setError('Failed to create an account. ' + err.message);
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
          <h2 className="mt-6 text-3xl font-extrabold text-slate-900">Create your account</h2>
          <p className="mt-2 text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-brand-600 hover:text-brand-500">
              Sign in
            </Link>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm text-center">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="appearance-none block w-full px-3 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className="appearance-none block w-full px-3 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none block w-full px-3 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none block w-full px-3 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <input
                  id="passwordConfirm"
                  name="passwordConfirm"
                  type="password"
                  required
                  className="appearance-none block w-full px-3 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                  placeholder="Confirm Password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4">
              <span className="block text-sm font-medium text-slate-700 mb-2">I am a...</span>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  className={`py-3 border rounded-lg text-sm font-medium flex justify-center items-center gap-2 transition-colors ${role === 'owner' ? 'border-brand-600 bg-brand-50 text-brand-700 ring-1 ring-brand-600' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setRole('owner')}
                >
                  <PawPrint className="w-4 h-4" /> Pet Owner
                </button>
                <button
                  type="button"
                  className={`py-3 border rounded-lg text-sm font-medium flex justify-center items-center gap-2 transition-colors ${role === 'carer' ? 'border-brand-600 bg-brand-50 text-brand-700 ring-1 ring-brand-600' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setRole('carer')}
                >
                  Carer
                </button>
              </div>
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
                'Sign up'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
