import { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Signup functionality
  async function signup(email, password, role, additionalData = {}) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    let location = null;
    if (navigator.geolocation) {
      try {
        location = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => {
              console.warn('Geolocation error:', err);
              resolve(null);
            },
            { timeout: 10000 }
          );
        });
      } catch (e) {
        console.warn('Geolocation exception:', e);
      }
    }

    // Create user document in Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const newUserData = {
      uid: user.uid,
      email,
      role, // 'owner', 'carer', 'admin'
      createdAt: new Date().toISOString(),
      ...(location && { location }),
      ...additionalData
    };
    
    await setDoc(userDocRef, newUserData);
    setUserData(newUserData);
    
    return user;
  }

  // Login functionality
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  async function adminLogin(email, password) {
    const adminEmail = 'admin@gmail.com';
    const adminPassword = 'admin@987';
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (cleanEmail !== adminEmail || password !== adminPassword) {
      throw new Error('Use the configured admin credentials: admin@gmail.com / admin@987.');
    }

    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    } catch (error) {
      if (!['auth/user-not-found', 'auth/invalid-credential'].includes(error.code)) {
        throw error;
      }

      try {
        userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
      } catch (createError) {
        if (createError.code === 'auth/email-already-in-use') {
          throw new Error('The admin email already exists in Firebase Auth with a different password. Reset that Firebase Auth user password to admin@987, then login again.', { cause: createError });
        }
        throw createError;
      }
    }

    const user = userCredential.user;
    const adminData = {
      uid: user.uid,
      email: adminEmail,
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', user.uid), adminData, { merge: true });
    setUserData(adminData);
    return userCredential;
  }

  // Logout functionality
  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Fetch user role and data from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          } else {
            console.warn('User document not found in Firestore');
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    signup,
    login,
    resetPassword,
    adminLogin,
    logout,
    setUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
