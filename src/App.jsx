import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Signup from './pages/Signup';
import OwnerDashboard from './pages/OwnerDashboard';
import CarerDashboard from './pages/CarerDashboard';
import AdminAccess from './pages/AdminAccess';
import ChatPage from './pages/ChatPage';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import CarerDetail from './pages/CarerDetail';

function App() {
  return (
    <Router>
      <AuthProvider>
        {/* <div className="min-h-screen bg-slate-50 flex flex-col"> */}

        <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
          <Navbar />
          <main className="flex-grow">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/signup" element={<Signup />} />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['owner']}>
                    <OwnerDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/carer"
                element={
                  <ProtectedRoute allowedRoles={['carer']}>
                    <CarerDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin"
                element={<AdminAccess />}
              />

              <Route
                path="/chat"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'carer']}>
                    <ChatPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat/:conversationId"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'carer']}>
                    <ChatPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/carers/:carerId"
                element={
                  <ProtectedRoute allowedRoles={['owner']}>
                    <CarerDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'carer', 'admin']}>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'carer', 'admin']}>
                    <Notifications />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
