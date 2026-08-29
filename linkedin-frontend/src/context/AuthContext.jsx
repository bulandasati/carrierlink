import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('jwt_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user_info');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse user info', e);
      }
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    const response = await api.post('/api/v1/auth/login', { email, password });
    const data = response.data;
    const jwtToken = data.accessToken || data.token;
    
    const userInfo = {
      id: data.userId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
    };
    
    localStorage.setItem('jwt_token', jwtToken);
    localStorage.setItem('user_info', JSON.stringify(userInfo));
    
    setToken(jwtToken);
    setUser(userInfo);
    return response.data;
  };

  const register = async (firstName, lastName, email, password) => {
    const response = await api.post('/api/v1/auth/register', {
      firstName,
      lastName,
      email,
      password,
    });
    const data = response.data;
    const jwtToken = data.accessToken || data.token;
    
    const userInfo = {
      id: data.userId,
      email: data.email,
      firstName: data.firstName || firstName,
      lastName: data.lastName || lastName,
    };
    
    localStorage.setItem('jwt_token', jwtToken);
    localStorage.setItem('user_info', JSON.stringify(userInfo));
    
    setToken(jwtToken);
    setUser(userInfo);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_info');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
