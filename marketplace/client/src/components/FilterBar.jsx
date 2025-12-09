import React, { useState } from 'react';
import CATEGORIES from '../constants/categories';
import LocationPicker from './LocationPicker';
import './FilterBar.css';

export default function FilterBar({ onApply, onReset, initial = {} }) {
  const [category, setCategory] = useState(initial.category || '');
  const [location, setLocation] = useState(initial.location || '');
  const [maxPrice, setMaxPrice] = useState(initial.maxPrice || '');
  const [order, setOrder] = useState(initial.order || 'relevance');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);

  const apply = () => {
    const filters = {};
    if (category) filters.category = category;
    if (location) filters.location = location; // Filtrado por ciudad/provincia
    if (maxPrice) filters.max_price = maxPrice;
    if (order) filters.order = order;
    if (onApply) onApply(filters);
  };

  const clear = () => {
    setCategory('');
    setLocation('');
    setMaxPrice('');
    setOrder('relevance');
    setSelectedLocation(null);
    if (onReset) onReset();
  };

  return (
    <>
      <div className="filterbar card">
        <div className="filterbar__row">
          <div className="field">
            <label>Categoría</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Todas</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Ubicación: texto o mapa (solo ciudad/provincia) */}
          <div className="field">
            <label>Ubicación (ciudad/provincia)</label>
            <input 
              value={location} 
              onChange={(e) => setLocation(e.target.value)} 
              type="text" 
              placeholder="Ej. Ambato, Quito, Guayaquil"
            />
            <button 
              type="button"
              onClick={() => setShowMapModal(true)}
              style={{ marginTop: '8px', padding: '6px 12px', fontSize: '0.85em', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              🗺️ Elegir en mapa
            </button>
            {selectedLocation && (
              <p style={{ marginTop: '6px', fontSize: '0.9em', color: '#0277bd' }}>
                📍 {selectedLocation.city || selectedLocation.province || selectedLocation.address}
              </p>
            )}
          </div>

          <div className="field">
            <label>Precio (máx.)</label>
            <input 
              value={maxPrice} 
              onChange={(e) => setMaxPrice(e.target.value)} 
              type="number" 
              min="0" 
              placeholder="Ej. 300" 
            />
          </div>

          <div className="field">
            <label>Ordenar</label>
            <select value={order} onChange={(e) => setOrder(e.target.value)}>
              <option value="relevance">Relevancia</option>
              <option value="newest">Más nuevos</option>
              <option value="price_asc">Menor precio</option>
              <option value="price_desc">Mayor precio</option>
            </select>
          </div>

          <div className="filterbar__actions">
            <button type="button" className="btn btn--primary" onClick={apply}>Aplicar</button>
            <button type="button" className="btn btn--ghost" onClick={clear}>Limpiar</button>
          </div>
        </div>
      </div>

      {/* Modal del Mapa */}
      {showMapModal && (
        <div className="map-modal-overlay">
          <div className="map-modal-container">
            <div className="map-modal-header">
              <h2>Selecciona una ubicación</h2>
              <button 
                className="map-modal-close"
                type="button"
                onClick={() => setShowMapModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="map-modal-content">
              <LocationPicker 
                onLocationSelected={(loc) => {
                  const coarse = loc.city || loc.province || loc.country || loc.address;
                  setSelectedLocation(loc);
                  setLocation(coarse || '');
                  setShowMapModal(false);
                }}
                initialLocation={selectedLocation}
              />
            </div>
            <div className="map-modal-footer">
              <button 
                type="button"
                className="btn btn--ghost"
                onClick={() => setShowMapModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
