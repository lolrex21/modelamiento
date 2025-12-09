import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * Protege rutas.
 * Si se pasan 'roles', también valida que el rol del usuario esté en la lista.

* Si no está autenticado, redirige a '/login' (Login/Register públicas).
 * Si intenta acceder a rutas de admin sin permisos, redirige a '/home'.
 */
function ProtectedRoute({ roles }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div>Cargando...</div>; // O un spinner
  }

  // 1. No está autenticado -> Redirige a Login
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // 2. Está autenticado, pero se requieren roles específicos
  if (roles && roles.length > 0) {
    if (!user || !roles.includes(user.role)) {
      // Usuario logueado pero sin permiso (ej: un 'user' intentando entrar a 'admin')
      return <Navigate to="/home" replace />; // Redirige a Home
    }
  }

  // 3. Está autenticado y tiene el rol (o no se requieren roles)
  return <Outlet />; // Muestra el componente hijo (ej: AdminPanel)
}

export default ProtectedRoute;