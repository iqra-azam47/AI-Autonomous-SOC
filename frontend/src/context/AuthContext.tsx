import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (creds: { username_or_email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (allowedRoles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('soc_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('soc_token');
      if (storedToken) {
        try {
          const currentUser = await api.getMe();
          setUser(currentUser);
          setToken(storedToken);
        } catch (err) {
          console.error('Session expired or invalid', err);
          api.removeToken();
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (creds: { username_or_email: string; password: string }) => {
    setLoading(true);
    try {
      const res = await api.login(creds);
      setUser(res.user);
      setToken(res.access_token);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setToken(null);
    }
  };

  const hasRole = (allowedRoles: Role[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role_name);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
