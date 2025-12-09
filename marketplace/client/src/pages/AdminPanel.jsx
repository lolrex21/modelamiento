import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './AdminPanel.css';

const AdminPanel = () => {
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { user } = useAuth();

  // Estado para el formulario de registro de moderador
  const [showModeratorForm, setShowModeratorForm] = useState(false);
  const [moderatorData, setModeratorData] = useState({
    name: '',
    email: '',
    password: ''
  });

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
      setError('No tienes permiso o hubo un error al cargar datos.');
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

  const updateUserRole = async (id, role) => {
    try {
      const response = await api.put(`/admin/users/${id}/role`, { role });
      setMessage(`Usuario ${id} actualizado a rol '${role}'. ${response.data.message || 'El usuario debe cerrar sesión y volver a entrar para ver los cambios.'}`);
      fetchData();
    } catch (err) {
      console.error(err);
      setError(`No se pudo actualizar el rol del usuario ${id}.`);
    }
  };

  const handleRegisterModerator = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setMessage('');
      
      const response = await api.post('/auth/register', {
        ...moderatorData,
        role: 'moderator'
      });
      
      setMessage('Moderador registrado exitosamente.');
      setModeratorData({ name: '', email: '', password: '' });
      setShowModeratorForm(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Error al registrar moderador.');
    }
  };

  if (loading) return <div className="admin-panel"><div style={{padding:20, textAlign: 'center'}}>Cargando panel de administración...</div></div>;
  
  return (
    <div className="admin-panel">
      <div className="admin-container">
        <div className="admin-header">
          <h1>Panel de Administración</h1>
          <p>Accediendo como: <strong>{user?.name || user?.email}</strong></p>
        </div>

        {error && <div className="admin-error">{error}</div>}
        {message && <div className="admin-success">{message}</div>}

        {/* Sección para registrar moderadores */}
        <div className="admin-section">
          <div className="section-header">
            <h2>Registrar Moderador</h2>
            <button 
              className="toggle-form-btn" 
              onClick={() => setShowModeratorForm(!showModeratorForm)}
            >
              {showModeratorForm ? 'Cancelar' : '+ Nuevo Moderador'}
            </button>
          </div>
          
          {showModeratorForm && (
            <div className="moderator-form-container">
              <form onSubmit={handleRegisterModerator} className="moderator-form">
                <div className="form-group">
                  <label>Nombre:</label>
                  <input
                    type="text"
                    value={moderatorData.name}
                    onChange={(e) => setModeratorData({...moderatorData, name: e.target.value})}
                    required
                    placeholder="Nombre del moderador"
                  />
                </div>
                <div className="form-group">
                  <label>Email:</label>
                  <input
                    type="email"
                    value={moderatorData.email}
                    onChange={(e) => setModeratorData({...moderatorData, email: e.target.value})}
                    required
                    placeholder="email@ejemplo.com"
                  />
                </div>
                <div className="form-group">
                  <label>Contraseña:</label>
                  <input
                    type="password"
                    value={moderatorData.password}
                    onChange={(e) => setModeratorData({...moderatorData, password: e.target.value})}
                    required
                    placeholder="Contraseña segura"
                    minLength="6"
                  />
                </div>
                <button type="submit" className="submit-btn">Registrar Moderador</button>
              </form>
            </div>
          )}
        </div>

        {/* Productos en revisión */}
        <div className="admin-section">
          <h2>Productos en revisión</h2>
          <div className="admin-table">
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

        {/* Gestión de usuarios */}
        <div className="admin-section">
          <h2>Gestión de Usuarios</h2>
          <div className="admin-table">
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
                {users.length === 0 && (
                  <tr><td colSpan={6} className="empty-cell">No hay usuarios.</td></tr>
                )}
                {users.map(u => {
                  const isSelf = u.id === user?.id;
                  const isAdmin = u.role === 'admin';

                  return (
                    <tr key={u.id}>
                      <td className="table-id">#{u.id}</td>
                      <td className="table-name">{u.name}</td>
                      <td className="table-email">{u.email}</td>
                      <td>
                        {isSelf || isAdmin ? (
                          <span className="role-badge">{u.role}</span>
                        ) : (
                          <select 
                            className="role-select" 
                            value={u.role}
                            onChange={(e) => updateUserRole(u.id, e.target.value)}
                          >
                            <option value="user">user</option>
                            <option value="buyer">buyer</option>
                            <option value="moderator">moderator</option>
                          </select>
                        )}
                      </td>
                      <td><span className={`status-badge status-${u.status}`}>{u.status}</span></td>
                      <td className="table-actions">
                        {isSelf ? (
                          <span className="self-warning">No puedes modificarte a ti mismo</span>
                        ) : isAdmin ? (
                          <span className="self-warning">No puedes modificar a otros admins</span>
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

export default AdminPanel;