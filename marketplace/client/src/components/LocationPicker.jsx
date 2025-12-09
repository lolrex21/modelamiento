import React, { useRef, useEffect, useState } from 'react';
import './LocationPicker.css';

const LocationPicker = ({ onLocationSelected, initialLocation = null }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation || {
    lat: -0.2263,
    lng: -78.5292,
    address: 'Quito, Ecuador'
  });
  const [searchInput, setSearchInput] = useState(initialLocation?.address || '');
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Cargar Google Maps script
  useEffect(() => {
    if (window.google) {
      setIsMapLoaded(true);
      return;
    }

    const apiKey = 'AIzaSyDLh3jxw70S0861VHbVK9PAlp5uljH4LK8'; // TODO: Reemplazar con tu API key
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsMapLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Inicializar mapa
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;

    const newMap = new window.google.maps.Map(mapRef.current, {
      zoom: 13,
      center: { lat: selectedLocation.lat, lng: selectedLocation.lng },
      mapTypeControl: true,
      fullscreenControl: true,
    });

    setMap(newMap);

    // Crear marcador inicial
    const newMarker = new window.google.maps.Marker({
      position: { lat: selectedLocation.lat, lng: selectedLocation.lng },
      map: newMap,
      draggable: true,
      title: selectedLocation.address
    });

    setMarker(newMarker);

    // Evento al arrastrar el marcador
    newMarker.addListener('dragend', () => {
      const pos = newMarker.getPosition();
      updateLocation(pos.lat(), pos.lng());
    });

    // Evento al hacer click en el mapa
    newMap.addListener('click', (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      newMarker.setPosition({ lat, lng });
      updateLocation(lat, lng);
    });

    return () => {
      newMarker.setMap(null);
    };
  }, [isMapLoaded]);

  // Extraer ciudad/provincia/país de address_components
  const extractParts = (addressComponents = []) => {
    const find = (type) => {
      const comp = addressComponents.find((c) => c.types?.includes(type));
      return comp ? comp.long_name : '';
    };
    const city = find('locality') || find('sublocality') || find('administrative_area_level_2');
    const province = find('administrative_area_level_1');
    const country = find('country');
    return { city, province, country };
  };

  // Actualizar ubicación (geocodificar)
  const updateLocation = async (lat, lng) => {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({ location: { lat, lng } });

      if (result.results[0]) {
        const address = result.results[0].formatted_address;
        const parts = extractParts(result.results[0].address_components);
        setSelectedLocation({ lat, lng, address, ...parts });
        setSearchInput(address);

        if (onLocationSelected) {
          onLocationSelected({ lat, lng, address, ...parts });
        }
      }
    } catch (error) {
      console.error('Error geocodificando:', error);
    }
  };

  // Buscar dirección
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchInput.trim() || !window.google) return;

    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({ address: searchInput });

      if (result.results[0]) {
        const location = result.results[0].geometry.location;
        const lat = location.lat();
        const lng = location.lng();
        const address = result.results[0].formatted_address;
        const parts = extractParts(result.results[0].address_components);

        setSelectedLocation({ lat, lng, address, ...parts });

        if (map) {
          map.setCenter({ lat, lng });
          map.setZoom(15);
        }

        if (marker) {
          marker.setPosition({ lat, lng });
          marker.setTitle(address);
        }

        if (onLocationSelected) {
          onLocationSelected({ lat, lng, address, ...parts });
        }
      } else {
        alert('Ubicación no encontrada. Intenta de nuevo.');
      }
    } catch (error) {
      console.error('Error buscando ubicación:', error);
      alert('Error al buscar la ubicación.');
    }
  };

  // Usar ubicación actual
  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        updateLocation(lat, lng);

        if (map) {
          map.setCenter({ lat, lng });
          map.setZoom(15);
        }
      }, (error) => {
        alert('No se pudo obtener tu ubicación: ' + error.message);
      });
    } else {
      alert('Tu navegador no soporta geolocalización.');
    }
  };

  if (!isMapLoaded) {
    return <div className="location-picker-loading">Cargando mapa...</div>;
  }

  return (
    <div className="location-picker-container">
      <div className="location-search">
        <form onSubmit={handleSearch}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Busca una dirección, ciudad o lugar..."
            className="location-search-input"
          />
          <button type="submit" className="location-search-btn">
            Buscar
          </button>
          <button 
            type="button" 
            onClick={handleCurrentLocation}
            className="location-current-btn"
            title="Usar mi ubicación actual"
          >
            📍 Mi ubicación
          </button>
        </form>
      </div>

      <div 
        ref={mapRef} 
        className="location-map"
        style={{ width: '100%', height: '400px' }}
      />

      <div className="location-info">
        <p>
          <strong>Ubicación seleccionada:</strong>
        </p>
        <p className="location-address">{selectedLocation.address}</p>
        <p className="location-coords">
          Lat: {selectedLocation.lat.toFixed(4)}, Lng: {selectedLocation.lng.toFixed(4)}
        </p>
      </div>
    </div>
  );
};

export default LocationPicker;
