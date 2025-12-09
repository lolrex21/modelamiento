import React, { useState, useEffect } from 'react';
import api from '../services/api'; // Importamos el helper de Axios
import ProductGrid from '../components/ProductGrid';
import { useAuth } from '../context/AuthContext';

const FavoritesPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isAuthenticated } = useAuth(); // Para asegurarnos de que está logueado

  useEffect(() => {
    // No intentes cargar si el contexto aún no confirma la autenticación
    if (!isAuthenticated) return;

    const fetchFavorites = async () => {
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

    fetchFavorites();
  }, [isAuthenticated]); // Se recarga si el estado de autenticación cambia

  if (loading) return <div>Cargando favoritos...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="favorites-container" style={{ padding: '20px' }}>
      <h2>Mis Productos Favoritos</h2>
      {products.length > 0 ? (
        // Reutilizamos el ProductGrid. 
        // No pasamos 'onEditProduct' o 'refreshProducts'
        // porque en esta vista el usuario no es el dueño.
        <ProductGrid 
          products={products} 
          onProductSelect={() => {}} // O la lógica para abrir el modal
        />
      ) : (
        <p>Aún no has añadido productos a favoritos.</p>
      )}
    </div>
  );
};

export default FavoritesPage;