import React from 'react';
import { useAuth } from '../context/AuthContext'; // <-- IMPORTAR
import api from '../services/api';
import './ProductCard.css';
// Aceptamos la nueva prop: onClick
export default function ProductCard({ product, onClick, refreshProducts, onEditProduct }) { 
  const { user, isAuthenticated } = useAuth();
  const { 
    name, 
    price, 
    location, 
    category, 
    size, 
    material, 
    images, 
    created_at,
    user_id // <-- ¡IMPORTANTE!
  } = product || {};

  // Preferimos images (array de strings). Si no, usamos product_images del backend; fallback a placeholder.
  const firstImage = (images && images.length > 0)
    ? images[0]
    : (product?.product_images && product.product_images.length > 0 ? product.product_images[0].image_url : null);
  const placeholder = 'https://placehold.co/300x200?text=Sin+Imagen';
  const dateString = created_at ? new Date(created_at).toLocaleDateString() : 'N/A';
  const priceDisplay = price ? price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00';

  // --- Handlers Corregidos ---
  const handleEdit = (e) => {
    e.stopPropagation(); 
    // Llama a la función que Home.jsx nos pasó
    if (onEditProduct) {
      onEditProduct(product);
    } else {
      // Fallback por si no se pasa la prop
      alert(`EDITAR: ${product.name} (ID: ${product.id})`);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (window.confirm(`¿Seguro que quieres eliminar "${product.name}"?`)) {
      try {
        await api.delete(`/products/${product.id}`);

        alert('Producto eliminado');
        if (refreshProducts) refreshProducts();
      } catch (err) {
        alert('Error al eliminar: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleModerate = async (e, newState) => {
    e.stopPropagation();
    if (window.confirm(`¿Cambiar estado de "${product.name}" a "${newState}"?`)) {
      try {
        await api.put(`/admin/products/${product.id}/state`, { state: newState });

        alert('Estado del producto actualizado');
        if (refreshProducts) refreshProducts(); 
      } catch (err) {
        alert('Error al moderar: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleToggleFavorite = async (e) => {
    e.stopPropagation(); // Evita que se abra el modal
    try {
      // Usamos el helper 'api' de Axios, que ya incluye el token
      // Alternativa con tu fetch:
      // await fetch(`http://localhost:4000/api/products/${product.id}/favorite`, {
      //   method: 'POST',
      //   headers: getAuthHeaders()
      // });
      
      await api.post(`/products/${product.id}/favorite`);
      
      // Opcional: Feedback visual inmediato
      // (Aquí podrías cambiar el color del botón, pero es más complejo)
      alert('¡Favorito actualizado!');
      
      // Si estamos en la página de Favoritos, refrescarla
      if (refreshProducts) refreshProducts(); 

    } catch (err) {
      alert('Error al guardar favorito: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <article className="product-card" onClick={onClick}>
      <div className="product-image-wrapper">
        <img 
          src={firstImage || placeholder} 
          alt={`Imagen de ${name || 'Producto'}`} 
          loading="lazy"
          onError={(e) => { 
            e.target.onerror = null; 
            e.target.src = placeholder; 
          }}
        />
        <button 
          className="product-favorite-btn" 
          title="Agregar a favoritos" 
          onClick={handleToggleFavorite}
        >
          ❤️
        </button>
      </div>

      <div className="product-content">
        <h3 className="product-title" title={name}>{name}</h3>

        <div className="product-meta">
          {category && <span className="product-category">{category}</span>}
          {location && <span>{location}</span>}
        </div>

        {(size || material) && (
          <div className="product-info">
            {size && <div>📏 {size}</div>}
            {material && <div>🧵 {material}</div>}
          </div>
        )}

        <div className="product-footer">
          <span className="product-price">${priceDisplay}</span>
        </div>

        {isAuthenticated && (
          <div className="product-actions">
            {user.id === user_id && (
              <>
                <button onClick={handleEdit} className="product-action-btn">Editar</button>
                <button onClick={handleDelete} className="product-action-btn danger">Eliminar</button>
              </>
            )}

            {(user.role === 'admin' || user.role === 'moderator') && user.id !== user_id && (
              <>
                <button onClick={(e) => handleModerate(e, 'oculto')} className="product-action-btn">Ocultar</button>
                <button onClick={(e) => handleModerate(e, 'suspendido')} className="product-action-btn danger">Suspender</button>
              </>
            )}
          </div>
        )}

        <div className="product-date">Publicado: {dateString}</div>
      </div>
    </article>
  );
}