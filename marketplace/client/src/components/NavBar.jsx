import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationCenter from './NotificationCenter';
import './NavBar.css';

const NavBar = () => {
  const { isAuthenticated, user, logout, loading } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);

  if (loading) return null;
  if (!isAuthenticated) return null;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const goToMessages = () => {
    navigate('/messages'); // aquí luego montas tu bandeja de conversaciones
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/home">Marketplace</Link>
      </div>

      <div className="navbar-links">
        <Link to="/home">Inicio</Link>
        {/* Mostrar 'Publicar' SOLO para vendedores (buyer), NO para clientes (user) ni admin */}
        {user && user.role === 'buyer' && (
          <Link to="/publish">Publicar</Link>
        )}

        {user?.role === "admin" && (
          <Link to="/admin">Admin</Link>
        )}

        {(user?.role === "admin" || user?.role === "moderator") && (
          <Link to="/moderation">Moderación</Link>
        )}

        {/* Botón de Mensajes → página de mensajes */}
        <button
          onClick={goToMessages}
          className="navbar-chat-btn"
          style={{
            background: "transparent",
            border: "1px solid #6ee7b7",
            padding: "6px 12px",
            borderRadius: "8px",
            cursor: "pointer",
            color: "#6ee7b7",
          }}
        >
          Mensajes 💬
        </button>

        <NotificationCenter />

        <div className="user-menu">
          <button className="user-button" onClick={() => setOpen(!open)}>
            {user ? (user.name || user.email) : 'Usuario'} ▾
          </button>

        {open && (
          <div className="user-dropdown">
            <Link to="/favorites" onClick={() => setOpen(false)}>
              Mis Favoritos
            </Link>
            <button onClick={handleLogout} className="logout-button">
              Cerrar Sesión
            </button>
          </div>
        )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
