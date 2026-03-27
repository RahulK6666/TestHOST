import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ems_user')) || null; }
    catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ems_token');
    if (token) {
      api.get('/auth/me')
        .then(res => { setUser(res.data); localStorage.setItem('ems_user', JSON.stringify(res.data)); })
        .catch(() => { localStorage.removeItem('ems_token'); localStorage.removeItem('ems_user'); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('ems_token', res.data.token);
    localStorage.setItem('ems_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ems_token');
    localStorage.removeItem('ems_user');
    setUser(null);
  }, []);

  const updateUser = useCallback((data) => {
    const updated = { ...user, ...data };
    localStorage.setItem('ems_user', JSON.stringify(updated));
    setUser(updated);
  }, [user]);

  const isCEO = user?.role === 'super_admin';
  const isManager = user?.role === 'manager';
  const isEmployee = user?.role === 'employee';
  const canManage = isCEO || isManager;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, isCEO, isManager, isEmployee, canManage }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
