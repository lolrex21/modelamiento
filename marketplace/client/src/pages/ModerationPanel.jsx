import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './ModerationPanel.css';

const ModerationPanel = () => {
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { user } = useAuth();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      setMessage('');

      const [prodRes, userRes] = await Promise.all([
        api.get('/admin/moderation/items').catch(err => {
          console.error('Error al cargar moderation/items:', err);
          return { data: [] };
        }),
        api.get('/admin/users').catch(err => {
          console.error('Error al cargar admin/users:', err);
          return { data: [] };
        })
      ]);

      setProducts(prodRes.data || []);
      setUsers(userRes.data || []);
    } catch (err) {
      console.error(err);
      setError('No tienes permiso o hubo un error al cargar datos de moderación.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateProductState = async (id, state) => {
    try {
      await api.put(`/admin/products/${id}/state`, { state });
      setMessage(`Producto ${id} actualizado a '${state}'.`);
      fetchData();
    } catch (err) {
      console.error(err);
      setError(`No se pudo actualizar el producto ${id}.`);
    }
  };

  const updateUserStatus = async (id, status) => {
    try {
      await api.put(`/admin/users/${id}/status`, { status });
      setMessage(`Usuario ${id} actualizado a '${status}'.`);
      fetchData();
    } catch (err) {
      console.error(err);
      setError(`No se pudo actualizar el usuario ${id}.`);
    }
  };

  if (loading) return <div className="moderation-panel"><div style={{padding:20, textAlign: 'center'}}>Cargando moderación...</div></div>;
  return (
    <div className="moderation-panel">
      <div className="moderation-container">
        <div className="moderation-header">
          <h1>Panel de Moderación</h1>
          <p>Accediendo como: <strong>{user?.name || user?.email}</strong></p>
        </div>

        {error && <div className="moderation-error">{error}</div>}
        {message && <div className="moderation-success">{message}</div>}

        <div className="moderation-section">
          <h2>Productos en revisión</h2>
          <div className="moderation-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 && (
                  <tr><td colSpan={4} className="empty-cell">No hay productos pendientes.</td></tr>
                )}
                {products.map(p => (
                  <tr key={p.id}>
                    <td className="table-id">#{p.id}</td>
                    <td className="table-name">{p.name}</td>
                    <td><span className={`status-badge status-${p.state}`}>{p.state}</span></td>
                    <td className="table-actions">
                      <button className="action-btn btn-success" onClick={() => updateProductState(p.id, 'visible')}>Reactivar</button>
                      <button className="action-btn btn-warning" onClick={() => updateProductState(p.id, 'oculto')}>Ocultar</button>
                      <button className="action-btn btn-danger" onClick={() => updateProductState(p.id, 'suspendido')}>Suspender</button>
                      <button className="action-btn btn-critical" onClick={() => updateProductState(p.id, 'peligroso')}>Marcar peligroso</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="moderation-section">
          <h2>Usuarios (suspender/reactivar)</h2>
          <div className="moderation-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.filter(u => u.role === 'user' || u.role === 'buyer').length === 0 && (
                  <tr><td colSpan={6} className="empty-cell">No hay usuarios.</td></tr>
                )}
                {users.filter(u => u.role === 'user' || u.role === 'buyer').map(u => {
                  // Evitar que el usuario se modifique a sí mismo
                  const isSelf = u.id === user?.id;

                  return (
                    <tr key={u.id}>
                      <td className="table-id">#{u.id}</td>
                      <td className="table-name">{u.name}</td>
                      <td className="table-email">{u.email}</td>
                      <td><span className="role-badge">{u.role}</span></td>
                      <td><span className={`status-badge status-${u.status}`}>{u.status}</span></td>
                      <td className="table-actions">
                        {isSelf ? (
                          <span className="self-warning">No puedes modificarte a ti mismo</span>
                        ) : (
                          <>
                            <button className="action-btn btn-success" onClick={() => updateUserStatus(u.id, 'active')}>Reactivar</button>
                            <button className="action-btn btn-danger" onClick={() => updateUserStatus(u.id, 'suspended')}>Suspender</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModerationPanel;
