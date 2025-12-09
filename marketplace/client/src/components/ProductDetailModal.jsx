import React, { useState } from 'react';
import './ProductDetailModal.css';
import ChatBox from "./ChatBox";

// Acepta las nuevas props: onDelete, currentUserId y onContactSeller (chat)
const ProductDetailModal = ({ product, onClose, onDelete, currentUserId, onContactSeller }) => {
    if (!product) return null;

    const {
        id,
        name,
        price,
        location,
        category,
        size,
        material,
        description,
        images,
        created_at,
        user_id,
        contact_info
    } = product;

    const [showChat, setShowChat] = useState(false);
    const isOwner = currentUserId && (currentUserId.toString() === user_id?.toString());
    const safeImages = images && images.length > 0 ? images : ['https://placehold.co/500x400?text=Sin+Imagen'];
    const [currentIndex, setCurrentIndex] = useState(0);
    const currentImage = safeImages[currentIndex];
    const dateString = created_at ? new Date(created_at).toLocaleDateString() : 'N/A';
    const priceDisplay = price ? price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00';

    const handleDeleteClick = () => {
        if (onDelete) onDelete(id);
    };

    const nextImage = () => {
        setCurrentIndex((prev) => (prev + 1) % safeImages.length);
    };

    const prevImage = () => {
        setCurrentIndex((prev) => (prev - 1 + safeImages.length) % safeImages.length);
    };

    const goToImage = (idx) => {
        setCurrentIndex(idx);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose} aria-label="Cerrar">&times;</button>

                <div className="modal-main">
                    <div className="modal-body">
                        <h2 className="modal-title">{name}</h2>
                        <div className="modal-price">${priceDisplay}</div>

                        <div className="modal-details">
                            <div className="detail-item">
                                <div className="detail-label">Categoría</div>
                                <div className="detail-value">{category || 'N/A'}</div>
                            </div>
                            <div className="detail-item">
                                <div className="detail-label">Ubicación</div>
                                <div className="detail-value">{location || 'N/A'}</div>
                            </div>
                            <div className="detail-item">
                                <div className="detail-label">Tamaño</div>
                                <div className="detail-value">{size || 'N/A'}</div>
                            </div>
                            <div className="detail-item">
                                <div className="detail-label">Material</div>
                                <div className="detail-value">{material || 'N/A'}</div>
                            </div>
                        </div>

                        <div className="modal-description">
                            <div className="detail-label">Publicado</div>
                            <div className="detail-value" style={{ marginBottom: '10px' }}>{dateString}</div>
                            {!isOwner && (
                                <div className="detail-value" style={{ marginBottom: '10px' }}>
                                    <strong>Contacto del vendedor:</strong> {contact_info || 'No proporcionado'}
                                </div>
                            )}
                            <div className="detail-label" style={{ marginTop: '6px' }}>Descripción</div>
                            <p style={{ margin: 0 }}>{description || 'Sin descripción'}</p>
                        </div>

                        <div className="modal-footer">
                            {isOwner && (
                                <button className="modal-btn modal-btn-danger" onClick={handleDeleteClick}>
                                    Eliminar Producto
                                </button>
                            )}

                            {!isOwner && (
                                <>
                                    <button
                                        className="btn btn-primary"
                                        style={{
                                            padding: "10px 20px",
                                            backgroundColor: "#007bff",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "5px",
                                        }}
                                        onClick={() => setShowChat(true)}
                                    >
                                        Contactar Vendedor 💬
                                    </button>
                        
                                    {showChat && (
                                        <div style={{ marginTop: "16px" }}>
                                            <ChatBox
                                                userId={currentUserId}  // comprador
                                                otherUserId={user_id}   // vendedor
                                                otherUserName={name}
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="modal-image-wrapper">
                        <img
                            src={currentImage}
                            alt={name}
                            className="modal-image"
                            onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/500x400?text=Sin+Imagen'; }}
                        />

                        {safeImages.length > 1 && (
                            <>
                                <button className="modal-image-nav prev" onClick={prevImage} aria-label="Imagen anterior">‹</button>
                                <button className="modal-image-nav next" onClick={nextImage} aria-label="Imagen siguiente">›</button>

                                <div className="modal-thumbs">
                                    {safeImages.map((img, idx) => (
                                        <button
                                            key={idx}
                                            className={`thumb ${idx === currentIndex ? 'active' : ''}`}
                                            onClick={() => goToImage(idx)}
                                            aria-label={`Ver imagen ${idx + 1}`}
                                        >
                                            <img src={img} alt={`thumb-${idx}`} onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/80x80?text=IMG'; }} />
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetailModal;