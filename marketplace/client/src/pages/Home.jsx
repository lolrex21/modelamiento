import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import FilterBar from '../components/FilterBar'; 
import ProductGrid from '../components/ProductGrid';
import ProductDetailModal from '../components/ProductDetailModal';
import './Home.css';

function Home() {
    // ESTADOS
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const navigate = useNavigate();

    // ID del usuario actual para la lógica de "dueño del producto" en el modal
    const currentUserId = localStorage.getItem('userId');
    
    // FUNCIONES ASÍNCRONAS Y CALLBACKS

    const fetchProducts = async (filters = {}) => {
        console.log('Recargando productos...', filters);
        try {
            const res = await api.get('/products', { params: filters });
            console.log('Productos recibidos del backend:', res.data);
            console.log('Primer producto (si existe):', res.data[0]);
            setProducts(res.data || []);
        } catch (error) {
            // Mostrar detalle de error para depuración
            console.error('Error al cargar los productos:', error?.response?.status, error?.response?.data || error.message || error);
        }
    };
    
    const handleDeleteProduct = async (productId) => {
        const token = localStorage.getItem('token');
        if (!token) return alert('No autorizado. Por favor, inicia sesión.');

        if (!window.confirm("¿Estás seguro de que quieres eliminar este producto?")) return;

        try {
            const response = await fetch(`http://localhost:4000/api/products/${productId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                alert('Producto eliminado con éxito.');
                // Cierra el modal y recarga la lista
                setSelectedProduct(null); 
                fetchProducts(); 
            } else {
                const errorData = await response.json();
                alert(`Error al eliminar: ${errorData.message}`);
            }
        } catch (error) {
            alert('Error de conexión o fallo al eliminar.');
        }
    };

    //Handler para el botón "Editar" de la Card ---
    const handleEditClick = (product) => {
        // Navegar a la ruta de publicar con el producto en el estado (la ruta está protegida)
        navigate('/publish', { state: { productToEdit: product } });
    };
    
    // FUNCIONES DE VISTA/EVENTOS

    // Nota: El acceso a la ruta /publish se hace desde la NavBar. Eliminamos el botón "Crear Publicación" para evitar duplicados.

    // Función para abrir el modal al hacer clic en la tarjeta (la pasa a ProductGrid)
    const handleCardClick = (product) => {
        setSelectedProduct(product);
    };

    // Función para cerrar el modal
    const handleCloseModal = () => {
        setSelectedProduct(null);
    };

    // EFECTO DE CARGA INICIAL
    useEffect(() => {
        fetchProducts();
    }, []);

    
    return (
        <div className="home-container">
            {/* El botón para publicar se encuentra ahora en la NavBar; aquí mostramos solo el contenido principal */}
            <FilterBar onApply={fetchProducts} onReset={() => fetchProducts({})} /> 
            {/* PASAMOS LA FUNCIÓN DE CLIC A LA CUADRÍCULA */}
            <ProductGrid 
                products={products} 
                onProductSelect={handleCardClick} // <--- CORRECCIÓN DE LLAMADA
                refreshProducts={fetchProducts}
                onEditProduct={handleEditClick}
            /> 
            
            {/* Renderizado del Modal de Detalles */}
            {selectedProduct && (
                <ProductDetailModal 
                    product={selectedProduct} 
                    onClose={handleCloseModal} 
                    onDelete={handleDeleteProduct} // Función para llamar al backend DELETE
                    currentUserId={currentUserId} // ID del usuario logueado para verificación
                />
            )}
        </div>
    );
}

export default Home;