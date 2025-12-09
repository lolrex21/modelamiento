import React, { useState } from 'react';
import api from '../services/api';
import './ImageUploader.css';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ImageUploader = ({ onImagesUploaded, onError }) => {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);

  // Validar que sea imagen válida
  const isValidImage = (file) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    return validTypes.includes(file.type);
  };

  // Validar tipo y tamaño
  const validateFiles = (selectedFiles) => {
    setErrorMsg(null);
    const fileArray = Array.from(selectedFiles);

    // Verificar tipo
    const invalidType = fileArray.find(file => !isValidImage(file));
    if (invalidType) {
      const msg = `El archivo "${invalidType.name}" no es una imagen válida. Solo se permiten JPG, PNG, GIF, WebP.`;
      setErrorMsg(msg);
      setFiles([]);
      if (onError) onError(msg);
      return false;
    }

    // Verificar tamaño
    const oversize = fileArray.find(file => file.size > MAX_FILE_SIZE);
    if (oversize) {
      const msg = `El archivo "${oversize.name}" excede el tamaño máximo permitido de 5 MB.`;
      setErrorMsg(msg);
      setFiles([]);
      if (onError) onError(msg);
      return false;
    }

    return true;
  };

  const handleFileChange = (e) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && validateFiles(selectedFiles)) {
      setFiles(Array.from(selectedFiles));
    }
    e.target.value = '';
  };

  const handleUpload = async () => {
    setErrorMsg(null);
    if (files.length === 0) return;

    setIsUploading(true);
    const uploadedResults = [];

    try {
      // Subir cada archivo uno por uno
      for (const file of files) {
        const formData = new FormData();
        formData.append('image', file);

        const response = await api.post('/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data?.url) {
          uploadedResults.push({
            url: response.data.url,
            fileName: file.name,
            path: response.data.path
          });
        } else {
          throw new Error(`No se pudo obtener URL para "${file.name}"`);
        }
      }

      // Actualizar estado con URLs subidas
      const newUrls = uploadedResults.map(r => r.url);
      setUploadedUrls(prev => [...prev, ...newUrls]);

      // Notificar al padre
      if (onImagesUploaded) {
        onImagesUploaded(newUrls);
      }

      setFiles([]);
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Error al subir imágenes.';
      setErrorMsg(msg);
      if (onError) onError(msg);
      console.error('Error uploading images:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = (index) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleRemoveUploaded = (index) => {
    setUploadedUrls(prevUrls => prevUrls.filter((_, i) => i !== index));
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      {files.length === 0 && uploadedUrls.length === 0 && (
        <div style={{ marginBottom: '10px' }}>
          <input
            type="file"
            multiple
            accept="image/*"
            id="imageInput"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => document.getElementById('imageInput').click()}
            style={{
              padding: '10px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1em'
            }}
          >
            Seleccionar Imágenes
          </button>
        </div>
      )}

      {/* Mostrar archivos seleccionados */}
      {files.length > 0 && (
        <div style={{ marginBottom: '15px' }}>
          <h4>Archivos seleccionados:</h4>
          <div style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '4px', marginBottom: '10px' }}>
            {files.map((file, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px',
                  backgroundColor: '#fff',
                  marginBottom: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}
              >
                <span style={{ fontSize: '0.9em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '0.9em',
                    marginLeft: '8px'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
            style={{
              padding: '10px 16px',
              backgroundColor: isUploading ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              fontSize: '1em'
            }}
          >
            {isUploading ? 'Subiendo...' : 'Subir Imágenes'}
          </button>
        </div>
      )}

      {/* Mostrar imágenes subidas */}
      {uploadedUrls.length > 0 && (
        <div style={{ marginBottom: '15px' }}>
          <h4>Imágenes subidas:</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
            {uploadedUrls.map((url, index) => (
              <div
                key={index}
                style={{
                  position: 'relative',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  border: '1px solid #ddd'
                }}
              >
                <img
                  src={url}
                  alt={`Imagen ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100px',
                    objectFit: 'cover'
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveUploaded(index)}
                  style={{
                    position: 'absolute',
                    top: '0',
                    right: '0',
                    padding: '4px 8px',
                    backgroundColor: 'rgba(220, 53, 69, 0.9)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0',
                    cursor: 'pointer',
                    fontSize: '1.2em'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Botón para añadir más imágenes */}
          <button
            type="button"
            onClick={() => document.getElementById('imageInput2').click()}
            style={{
              marginTop: '10px',
              padding: '8px 12px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.95em'
            }}
          >
            + Añadir más imágenes
          </button>
          <input
            type="file"
            multiple
            accept="image/*"
            id="imageInput2"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Mostrar errores */}
      {errorMsg && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '10px',
          borderRadius: '4px',
          border: '1px solid #f5c6cb',
          marginTop: '10px'
        }}>
          {errorMsg}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
