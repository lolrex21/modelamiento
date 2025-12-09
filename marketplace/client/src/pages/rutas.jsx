import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import NavBar from "../components/NavBar"; 
import Register from "./Register";
import Login from "./components/Login"; // El componente de login
import Home from "./pages/Home"; // El componente que muestras después del login (Explora productos y servicios)
import AdminPanel from './AdminPanel'; // <-- IMPORTAR NUEVA PÁGINA
import ProtectedRoute from './ProtectedRoute'
import ProductPublish from '../components/ProductPublish';
import FavoritesPage from './FavoritesPage';
import MessagePage from "./MessagePage";

const AppLayout = () => {
  return (
    <div className="app-layout">
      {/* 1. El menú (NavBar) siempre es visible */}
      <NavBar />
      
      {/* 2. <Outlet> renderiza el componente de la ruta hija */}
      <main className="page-content" style={{ padding: '20px' }}>
        <Outlet />
      </main>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Rutas Protegidas (Requieren estar logueado) */}
        {/* Solo buyer (vendedor) puede publicar productos */}
        <Route element={<ProtectedRoute roles={['buyer']} />}>
          <Route path="/publish" element={<ProductPublish />} />
          <Route path="/messages" element={<MessagePage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/favorites" element={<FavoritesPage />} />
          {/* Aquí irían otras rutas de usuario, ej: /my-products, /profile */}
        </Route>

        {/* Rutas de Admin/Moderador */}
        <Route element={<ProtectedRoute roles={['admin', 'moderator']} />}>
          <Route path="/admin" element={<AdminPanel />} />
        </Route>

        {/* Ruta para 404 */}
        <Route path="*" element={<div>404 - Página no encontrada</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
