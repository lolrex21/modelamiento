import { supabase } from './db.js';

// --- (AUTHENTICATED USER) Obtener notificaciones del usuario logueado ---
export const getNotifications = async (req, res) => {
    try {
        const userId = req.userId; // Obtenido del middleware authRequired

        const { data: notifications, error } = await supabase
            .from('notifications')
            .select('id, user_id, product_id, title, message, type, is_read, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        res.status(200).json(notifications || []);
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        res.status(500).json({ message: 'Error interno al obtener notificaciones.' });
    }
};

// --- (AUTHENTICATED USER) Marcar notificación como leída ---
export const markNotificationAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        // Verificar que la notificación pertenece al usuario
        const { data: notification, error: fetchError } = await supabase
            .from('notifications')
            .select('id')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (fetchError || !notification) {
            return res.status(404).json({ message: 'Notificación no encontrada.' });
        }

        const { data: updated, error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id)
            .select('id, is_read');

        if (error) {
            throw error;
        }

        res.status(200).json(updated[0]);
    } catch (error) {
        console.error('Error al marcar notificación como leída:', error);
        res.status(500).json({ message: 'Error interno al actualizar notificación.' });
    }
};

// --- (AUTHENTICATED USER) Obtener conteo de notificaciones no leídas ---
export const getUnreadNotificationsCount = async (req, res) => {
    try {
        const userId = req.userId;

        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            throw error;
        }

        res.status(200).json({ unreadCount: count || 0 });
    } catch (error) {
        console.error('Error al obtener conteo de notificaciones no leídas:', error);
        res.status(500).json({ message: 'Error interno al obtener conteo de notificaciones.' });
    }
};
