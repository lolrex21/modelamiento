import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './NotificationCenter.css';

export default function NotificationCenter() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Obtener notificaciones cuando el componente monta o cuando el usuario cambia
    useEffect(() => {
        if (user?.id) {
            fetchNotifications();
            fetchUnreadCount();
            // Refrescar notificaciones cada 30 segundos
            const interval = setInterval(() => {
                fetchNotifications();
                fetchUnreadCount();
            }, 30000);
            return () => clearInterval(interval);
        }
    }, [user?.id]);

    const fetchNotifications = async () => {
        try {
            const response = await api.get('/notifications');
            setNotifications(response.data);
        } catch (error) {
            console.error('Error al obtener notificaciones:', error);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const response = await api.get('/notifications/unread/count');
            setUnreadCount(response.data.unreadCount);
        } catch (error) {
            console.error('Error al obtener conteo de notificaciones:', error);
        }
    };

    const handleMarkAsRead = async (notificationId) => {
        try {
            setIsLoading(true);
            await api.put(`/notifications/${notificationId}/read`);
            // Actualizar la notificación localmente
            setNotifications(prev =>
                prev.map(notif =>
                    notif.id === notificationId ? { ...notif, is_read: true } : notif
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error al marcar como leída:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'info':
                return 'ℹ️';
            case 'warning':
                return '⚠️';
            case 'danger':
                return '🚨';
            default:
                return '📢';
        }
    };

    const getNotificationColor = (type) => {
        switch (type) {
            case 'info':
                return '#4CAF50';
            case 'warning':
                return '#FF9800';
            case 'danger':
                return '#F44336';
            default:
                return '#2196F3';
        }
    };

    if (!user?.id) {
        return null; // No mostrar si no hay usuario autenticado
    }

    return (
        <div className="notification-center">
            <button
                className="notification-bell"
                onClick={() => setIsOpen(!isOpen)}
                title="Notificaciones"
            >
                🔔
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h3>Notificaciones</h3>
                        <button
                            className="close-btn"
                            onClick={() => setIsOpen(false)}
                        >
                            ✕
                        </button>
                    </div>

                    {notifications.length === 0 ? (
                        <div className="empty-notifications">
                            <p>No tienes notificaciones</p>
                        </div>
                    ) : (
                        <div className="notifications-list">
                            {notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
                                    style={{
                                        borderLeft: `4px solid ${getNotificationColor(notification.type)}`
                                    }}
                                >
                                    <div className="notification-content">
                                        <div className="notification-title">
                                            <span className="notification-icon">
                                                {getNotificationIcon(notification.type)}
                                            </span>
                                            <span>{notification.title}</span>
                                        </div>
                                        <p className="notification-message">{notification.message}</p>
                                        <small className="notification-time">
                                            {new Date(notification.created_at).toLocaleDateString('es-ES', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </small>
                                    </div>
                                    {!notification.is_read && (
                                        <button
                                            className="mark-read-btn"
                                            onClick={() => handleMarkAsRead(notification.id)}
                                            disabled={isLoading}
                                        >
                                            ✓
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
