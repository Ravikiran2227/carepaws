import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, PawPrint, MessageCircle, Bell, Moon, Sun } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

export default function Navbar() {
  const { currentUser, userData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { notifications, unreadCount } = useNotifications();
  const currentTab = new URLSearchParams(location.search).get('tab') || 'carers';
  const [theme, setTheme] = useState(() => localStorage.getItem('carepaws-theme') || 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('carepaws-theme', theme);
  }, [theme]);

  console.log("Notifications:", notifications);
  console.log("Unread count:", unreadCount);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    // <nav className="sticky top-0 z-50 w-full glass-card border-b border-slate-200">
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-green-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              {/* <PawPrint className="h-8 w-8 text-brand-600" /> */}
              {/* <span className="font-bold text-xl tracking-tight text-slate-900">CarePaws</span> */}

              <PawPrint className="h-8 w-8 text-brand-700" />
              <span className="font-bold text-xl tracking-tight text-[var(--text)]">CarePaws</span>
            </Link>
          </div>




          <div className="flex items-center gap-4">
            {currentUser ? (
              <>
                <Link to="/profile" className="hidden md:inline-flex items-center text-sm font-medium text-gray-700 hover:text-brand-600 transition-colors">
                  {userData?.photoURL && (
                    <img src={userData.photoURL} alt="" className="mr-2 h-8 w-8 rounded-full object-cover border border-brand-100" />
                  )}
                  Welcome, {userData?.firstName || 'User'}
                </Link>

                {userData?.role === 'admin' && (
                  <Link to="/admin" className="text-sm font-medium text-gray-700 hover:text-brand-700">Admin</Link> // text-slate-600 hover:text-brand-600">Admin</Link>
                )}
                {userData?.role === 'carer' && (
                  <Link to="/carer" className="text-sm font-medium text-slate-600 hover:text-brand-600">Dashboard</Link>
                )}
                {userData?.role === 'owner' && (
                  <>
                    <div className="hidden lg:flex items-center gap-1 rounded-full bg-slate-100 p-1">
                      {[
                        ['carers', 'Find Carers'],
                        ['pets', 'My Pets'],
                        ['bookings', 'My Bookings']
                      ].map(([tab, label]) => (
                        <Link
                          key={tab}
                          to={`/dashboard?tab=${tab}`}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            location.pathname === '/dashboard' && currentTab === tab
                              ? 'bg-white text-brand-700 shadow-sm'
                              : 'text-slate-600 hover:text-brand-700'
                          }`}
                        >
                          {label}
                        </Link>
                      ))}
                    </div>
                  </>
                )}

                {(userData?.role === 'owner' || userData?.role === 'carer') && (
                  <Link
                    to="/chat"
                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                    aria-label="Messages"
                  >
                    <MessageCircle className="h-5 w-5" />
                  </Link>
                )}

                <Link
                  to="/notifications"
                  className="relative inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>

                <button
                  onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                  aria-label="Toggle theme"
                  title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                >
                  {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-[var(--accent)] hover:bg-orange-50 transition-colors"
                  aria-label="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                  aria-label="Toggle theme"
                  title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                >
                  {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
                <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-brand-600">
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 transition-colors"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
