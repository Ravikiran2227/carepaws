// import { Navigate } from 'react-router-dom';
// import { useAuth } from '../contexts/AuthContext';

// export default function ProtectedRoute({ children, allowedRoles }) {
//   const { currentUser, userData } = useAuth();

//   if (!currentUser) {
//     return <Navigate to="/login" replace />;
//   }

//   if (allowedRoles && userData && !allowedRoles.includes(userData.role)) {
//     // If user's role is not in the allowed roles, redirect to their respective dashboard
//     if (userData.role === 'admin') return <Navigate to="/admin" replace />;
//     if (userData.role === 'carer') return <Navigate to="/carer" replace />;
//     return <Navigate to="/dashboard" replace />;
//   }

//   return children;
// }


import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, userData, loading } = useAuth();

  // 🟡 WAIT until Firebase finishes loading
  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  // 🔴 If not logged in → go to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // 🟠 If userData not ready yet → wait
  if (!userData) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  // 🔵 Role check
  if (allowedRoles && !allowedRoles.includes(userData.role)) {
    if (userData.role === 'admin') return <Navigate to="/admin" replace />;
    if (userData.role === 'carer') return <Navigate to="/carer" replace />;
    return <Navigate to="/dashboard?tab=carers" replace />;
  }

  // ✅ All good → allow access
  return children;
}
