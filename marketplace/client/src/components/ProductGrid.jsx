import React from 'react';
import ProductCard from './ProductCard'; 

import './ProductGrid.css';

// Asegúrate de que el componente acepte products como prop
function ProductGrid({ products,  onProductSelect, refreshProducts, onEditProduct }) { 
    
    return (
        <>
            <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px', padding: '20px' }}>
                {products.length === 0 ? (
                    <p>No se encontraron productos. ¡Sé el primero en publicar!</p>
                ) : (
                    products.map(product => (
                        <ProductCard 
                            key={product.id} 
                            product={product} 
                            // Le pasamos la función para que la tarjeta sea clickeable
                            onClick={() => onProductSelect(product)} 
                            refreshProducts={refreshProducts} 
                            onEditProduct={onEditProduct}
                        />
                    ))
                )}
            </div>

            
        </>
    );
}

export default ProductGrid;