import { Router } from 'express';
import { 
    getNotifications, 
    markNotificationAsRead, 
    getUnreadNotificationsCount 
} from './notification.controller.js';
import { authRequired } from './middleware/auth.middleware.js';

const router = Router();

// Rutas protegidas: solo usuarios autenticados
// GET notificaciones del usuario logueado
router.get('/notifications', authRequired, getNotifications);

// PUT marcar notificación como leída
router.put('/notifications/:id/read', authRequired, markNotificationAsRead);

// GET conteo de notificaciones no leídas
router.get('/notifications/unread/count', authRequired, getUnreadNotificationsCount);

export default router;
