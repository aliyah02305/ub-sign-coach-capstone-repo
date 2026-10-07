import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth } from '../lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updateProfile,
} from 'firebase/auth';


const AuthContext = createContext(null);

function getDashboardRoute(role) {
  if (role === 'admin')   return '/dashboard/admin';
  if (role === 'faculty') return '/dashboard/faculty';
  return '/dashboard/student';
}

function normalizeProfile(raw, fbUser) {
  const p = (Array.isArray(raw) ? raw[0] : (raw?.user ?? raw?.data ?? raw)) || {};
  const name = p.name || p.fullName || p.full_name || p.displayName || fbUser?.displayName || '';
  return {
    ...p,
    name,
    id: p.id ?? p._id ?? fbUser?.uid,
    email: p.email || fbUser?.email,
    avatar: p.avatar || name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2),
  };
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
        if (!res.ok) throw new Error(`Profile API returned ${res.status}`);
        const raw = await res.json();
        const profile = normalizeProfile(raw, fbUser);
        setUser(profile);
        try {
          localStorage.setItem('sc_profile', JSON.stringify({ uid: fbUser.uid, profile }));
        } catch {}
      } catch (err) {
        console.error('Failed to load profile', err);
        // fall back to the last known profile for this same user
        try {
          const cached = JSON.parse(localStorage.getItem('sc_profile') || 'null');
          if (cached && cached.uid === fbUser.uid) setUser(cached.profile);
        } catch {}
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
      if (!res.ok) {
        return { success: false, error: 'Signed in, but could not load your profile. Is the database running?' };
      }

      const raw = await res.json();
      const profile = normalizeProfile(raw, cred.user);
      setUser(profile);
      router.push(getDashboardRoute(profile.role));
      return { success: true };
    } catch (err) {
      console.error('LOGIN ERROR:', err.code, err.message);
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found'
      ) {
        return { success: false, error: 'Invalid email or password.' };
      }
      if (err.code === 'auth/too-many-requests') {
        return { success: false, error: 'Too many attempts. Try again later.' };
      }
      return { success: false, error: 'Login failed. Please try again.' };
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

      // save the name in Firebase too
      await updateProfile(cred.user, { displayName: name });

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
      setUser({ ...profile, name: profile.name || name });
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
    try { localStorage.removeItem('sc_profile'); } catch {}
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