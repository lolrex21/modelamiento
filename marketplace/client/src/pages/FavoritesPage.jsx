// --- CONTENIDO COMPLETO PARA FavoritesPages.jsx ---
import React, { useState, useEffect } from 'react';
import api from '../services/api'; // Importamos el helper de Axios
import ProductGrid from '../components/ProductGrid';
import { useAuth } from '../context/AuthContext';
import ProductDetailModal from '../components/ProductDetailModal'; // Importamos el Modal
import './FavoritesPage.css';

const FavoritesPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { isAuthenticated } = useAuth();

  const fetchFavorites = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      // 1. Llamamos al nuevo endpoint del backend
      const res = await api.get('/favorites');
      setProducts(res.data);
      setError('');
    } catch (err) {
      console.error("Error al cargar favoritos:", err);
      setError('Error al cargar tus favoritos.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFavorites();
  }, [isAuthenticated]); // Se recarga si el estado de autenticación cambia

  // --- Funciones del Modal (copiadas de ProductGrid/Home) ---
  const handleCardClick = (product) => {
    setSelectedProduct(product);
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
  };
  // --- Fin de funciones del Modal ---

  if (loading) return <div style={{padding: '20px'}}>Cargando favoritos...</div>;
  if (error) return <div style={{padding: '20px', color: 'red'}}>{error}</div>;

  return (
    <>
      <div className="favorites-container" style={{ padding: '20px' }}>
        <h2>Mis Productos Favoritos</h2>
        {products.length > 0 ? (
          <ProductGrid 
            products={products} 
            onProductSelect={handleCardClick}
            // Pasamos la función de refresco para que el botón de "quitar favorito" funcione
            refreshProducts={fetchFavorites}
            // No pasamos onEditProduct porque no son sus productos
          />
        ) : (
          <p>Aún no has añadido productos a favoritos.</p>
        )}
      </div>

      {/* Renderizado del Modal de Detalles */}
      {selectedProduct && (
          <ProductDetailModal 
              product={selectedProduct} 
              onClose={handleCloseModal} 
              // No pasamos onDelete o currentUserId, ya que no es el dueño
          />
      )}
    </>
  );
};

export default FavoritesPage;