import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

// 1. Crear el Contexto
const AuthContext = createContext();

// 2. Crear un "hook" personalizado para usar el contexto fácilmente
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// 3. Crear el Proveedor del Contexto
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true); // Para chequear el token al inicio

  // Chequear si ya existe un token en localStorage al cargar la app
  useEffect(() => {
    const checkLogin = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          setLoading(false);
          return;
        }

        // Verificar el token y obtener datos actualizados del usuario
        try {
          const response = await api.get('/auth/verify');
          
          // Si el backend devuelve un nuevo token (porque el rol cambió), actualizarlo
          if (response.data.token) {
            localStorage.setItem('token', response.data.token);
          }
          
          // Actualizar el usuario con los datos más recientes de la BD
          const userData = response.data.user;
          localStorage.setItem('user', JSON.stringify(userData));
          
          const userId = userData.id || userData._id || userData.userId || '';
          if (userId) localStorage.setItem('userId', String(userId));
          
          setUser(userData);
          setIsAuthenticated(true);
        } catch (err) {
          // Si el token es inválido o expiró, limpiar todo
          console.error("Token inválido o expirado:", err);
          localStorage.clear();
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Error al cargar autenticación:", error);
        localStorage.clear();
      }
      setLoading(false);
    };
    
    checkLogin();
  }, []);

  // Función para guardar datos de login
  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    // Guardar también el id del usuario para usos directos (ej: Home.jsx)
    const userId = userData.id || userData._id || userData.userId || '';
    if (userId) localStorage.setItem('userId', String(userId));
    setUser(userData);
    setIsAuthenticated(true);
  };

  // Función para cerrar sesión
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};