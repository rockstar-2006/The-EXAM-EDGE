import { useState, useEffect } from 'react';
import api, { storage } from '@/services/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Auth Timeout')), 5000));
    try {
      const resPromise = api.get('/auth/me');
      const response: any = await Promise.race([resPromise, timeout]);
      setUser(response.data.user);
    } catch (error) {
      setUser(null);
    }
    setLoading(false);
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.token) {
        storage.setItem('token', response.data.token);
      }
      setUser(response.data.user);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const register = async (name: string, email: string, password: string, role: string = 'faculty'): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await api.post('/auth/register', { name, email, password, role });
      if (response.data.token) {
        storage.setItem('token', response.data.token);
      }
      setUser(response.data.user);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    }
    storage.removeItem('token');
    setUser(null);
  };

  return { user, loading, login, register, logout, isAuthenticated: !!user };
};
