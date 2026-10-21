import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserSession, LoginPayload, RegisterPayload, UpdateVehiclePayload } from '../../../shared/types';
import { buildApiUrl } from '../config/api';

interface AuthContextType {
  user: UserSession | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginPayload) => Promise<{ success: boolean; error?: string }>;
  register: (payload: RegisterPayload) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateVehicle: (payload: UpdateVehiclePayload) => Promise<{ success: boolean; error?: string }>;
  quickLoginDemo: (role: 'DRIVER' | 'OPERATOR' | 'ADMIN') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'voltiq_jwt_token';
const API_BASE = buildApiUrl('/api/auth');

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session from stored JWT on initial mount
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/me`, {
          headers: {
            Authorization: `Bearer ${storedToken}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setToken(storedToken);
        } else {
          // Token expired or invalid
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to verify session token:', err);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (credentials: LoginPayload): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Invalid credentials' };
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Network error connecting to auth server' };
    }
  };

  const register = async (payload: RegisterPayload): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Network error connecting to auth server' };
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const updateVehicle = async (payload: UpdateVehiclePayload): Promise<{ success: boolean; error?: string }> => {
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const res = await fetch(`${API_BASE}/vehicle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to update vehicle' };
      }

      if (user) {
        setUser({
          ...user,
          primaryVehicle: data.vehicle
        });
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: 'Network error updating vehicle' };
    }
  };

  const quickLoginDemo = async (role: 'DRIVER' | 'OPERATOR' | 'ADMIN'): Promise<void> => {
    let email = 'driver@voltiq.in';
    let password = 'Driver@123';

    if (role === 'OPERATOR') {
      email = 'operator@tatapower.in';
      password = 'Operator@123';
    } else if (role === 'ADMIN') {
      email = 'admin@voltiq.in';
      password = 'Admin@123';
    }

    await login({ email, password });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateVehicle,
        quickLoginDemo
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
