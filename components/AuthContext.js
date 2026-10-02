import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth } from '../lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';

const AuthContext = createContext(null);

function getDashboardRoute(role) {
  if (role === 'admin')   return '/dashboard/admin';
  if (role === 'faculty') return '/dashboard/faculty';
  return '/dashboard/student';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const res = await fetch(`/api/users?uid=${fbUser.uid}`);
          if (res.ok) setUser(await res.json());
        } catch (err) {
          console.error('Failed to load profile', err);
        }
      } else {
        setUser(null);
      }
      setHydrated(true);
    });
    return unsub;
  }, []);

  const login = async (email, password) => {
    if (!email.endsWith('@ub.edu.ph'))
      return { success: false, error: 'Invalid credentials. Use a @ub.edu.ph email.' };
    if (password.length < 6)
      return { success: false, error: 'Password must be at least 6 characters.' };

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const res = await fetch(`/api/users?uid=${cred.user.uid}`);
      const profile = await res.json();
      setUser(profile);
      router.push(getDashboardRoute(profile.role));
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Invalid email or password.' };
    }
  };

  const register = async (name, email, level, password) => {
    if (!email.endsWith('@ub.edu.ph'))
      return { success: false, error: 'Use your UB email address.' };
    if (password.length < 6)
      return { success: false, error: 'Password must be at least 6 characters.' };

    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const role = level === 'ADMIN' ? 'admin' : level === 'staff' ? 'faculty' : 'student';

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: cred.user.uid,
          name,
          email,
          role,
          level: role === 'student' ? `FSL Level ${level}` : null,
          avatar: initials,
        }),
      });

      if (!res.ok) return { success: false, error: 'Could not save profile. Try again.' };

      const profile = await res.json();
      setUser(profile);
      router.push(getDashboardRoute(role));
      return { success: true };
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        return { success: false, error: 'An account with this email already exists.' };
      }
      return { success: false, error: 'Registration failed. Try again.' };
    }
  };

  const updateUser = (updates) => setUser(prev => ({ ...prev, ...updates }));

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    router.push('/');
  };

  if (!hydrated) return null;

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}