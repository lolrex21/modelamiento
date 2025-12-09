import React from "react";
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import NavBar from "./components/NavBar";
import Login from "./components/login";
import Home from "./pages/Home";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Register from "./pages/Register";
import ProtectedRoute from "./pages/ProtectedRoute";
import ProductPublish from "./components/ProductPublish";
import FavoritesPage from "./pages/FavoritesPage";
import AdminPanel from "./pages/AdminPanel";
import ModerationPanel from "./pages/ModerationPanel";
import MessagePage from "./pages/MessagePage";
import { useAuth, AuthProvider } from './context/AuthContext';

// Componente que contiene la lógica de las rutas y el renderizado
function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Muestra una pantalla en blanco (o un spinner) mientras se verifica el estado de autenticación.
  // Esto previene renderizados incorrectos o bucles.
  if (loading) {
    return (
      <div style={{ color: '#e7ebf3', padding: '24px', textAlign: 'center' }}>
        Cargando...
      </div>
    );
  }

  // Rutas donde no se debe mostrar la barra de navegación
  const hideNavOnPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password'];

  return (
    <>
      {isAuthenticated && !hideNavOnPaths.includes(location.pathname) && <NavBar />}

      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/register" element={<Register />} />

        {/* Rutas protegidas: requieren estar autenticado */}
        <Route element={<ProtectedRoute />}>
          <Route path="/publish" element={<ProductPublish />} />
          <Route path="/messages" element={<MessagePage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
        </Route>

        {/* Rutas de Admin: solo para rol 'admin' */}
        <Route element={<ProtectedRoute roles={["admin"]} />}>
          <Route path="/admin" element={<AdminPanel />} />
        </Route>

        {/* Rutas de Moderación: para roles 'admin' y 'moderator' */}
        <Route element={<ProtectedRoute roles={["admin", "moderator"]} />}>
          <Route path="/moderation" element={<ModerationPanel />} />
        </Route>

        {/* Página no encontrada */}
        <Route path="*" element={<div>404 - Página no encontrada</div>} />
      </Routes>
    </>
  );
}

// Componente principal que envuelve la aplicación con el Router y el AuthProvider
function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;


