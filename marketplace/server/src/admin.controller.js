import { supabase } from './db.js';

// --- (ADMIN) Obtener todos los usuarios ---
export const getAllUsers = async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, name, email, role, status, created_at')
            .order('id', { ascending: true });

        if (error) {
            throw error;
        }

        res.status(200).json(users);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ message: 'Error interno al obtener usuarios.' });
    }
};

// --- (ADMIN) Cambiar el ROL de un usuario ---
export const updateUserRole = async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    const adminId = req.userId;

    console.log('[DEBUG] updateUserRole - Recibido:', { id, role, adminId, body: req.body });

    // Verificar que role existe
    if (!role) {
        console.log('[DEBUG] ERROR: Rol no proporcionado');
        return res.status(400).json({ message: "El campo 'role' es requerido." });
    }

    const validRoles = ['user', 'buyer', 'moderator'];
    if (!validRoles.includes(role)) {
        console.log('[DEBUG] ERROR: Rol no válido:', role);
        return res.status(400).json({ message: `Rol no válido: '${role}'. Solo se puede asignar 'user', 'buyer' o 'moderator'.` });
    }
    
    if (Number(id) === Number(adminId)) {
        console.log('[DEBUG] ERROR: Admin intenta cambiar su propio rol');
        return res.status(403).json({ message: 'Un administrador no puede cambiar su propio rol.' });
    }

    console.log('[DEBUG] Validaciones pasadas, actualizando usuario...');

    try {
        const { data: users, error } = await supabase
            .from('users')
            .update({ role })
            .eq('id', id)
            .neq('role', 'admin')
            .select('id, name, email, role, status');

        if (error) {
            throw error;
        }

        if (!users || users.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado o es otro administrador.' });
        }
        
        // Nota: El usuario afectado deberá cerrar sesión y volver a entrar
        res.status(200).json({
            ...users[0],
            message: 'Rol actualizado. El usuario debe cerrar sesión y volver a entrar para ver los cambios.'
        });
    } catch (error) {
        console.error('Error al cambiar rol:', error);
        res.status(500).json({ message: 'Error interno al cambiar rol.' });
    }
};

// --- (MODERATOR + ADMIN) Cambiar el ESTADO de un usuario ---
export const updateUserStatus = async (req, res) => {
    const { id } = req.params; // ID del usuario a modificar
    const { status } = req.body; // Nuevo status (ej: 'active' o 'suspended')
    const requesterId = req.userId; // ID del usuario que hace la solicitud
    const requesterRole = req.userRole; // Rol del usuario que hace la solicitud

    if (!status || (status !== 'active' && status !== 'suspended')) {
        return res.status(400).json({ message: "Estado no válido. Solo se puede asignar 'active' o 'suspended'." });
    }

    // Evitar que un usuario se suspenda a sí mismo
    if (Number(id) === Number(requesterId)) {
        return res.status(403).json({ message: 'No puedes cambiar tu propio estado.' });
    }

    try {
        // Primero, obtenemos el usuario objetivo para verificar su rol
        const { data: targetUser, error: fetchError } = await supabase
            .from('users')
            .select('id, role')
            .eq('id', id)
            .single();

        if (fetchError || !targetUser) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        // Si el que hace la petición es MODERADOR, NO puede suspender a admins o moderadores
        if (requesterRole === 'moderator') {
            if (targetUser.role === 'admin' || targetUser.role === 'moderator') {
                return res.status(403).json({ 
                    message: 'Los moderadores no pueden suspender a otros moderadores o administradores.' 
                });
            }
        }

        // Si llegamos aquí, procedemos a actualizar
        const { data: users, error } = await supabase
            .from('users')
            .update({ status })
            .eq('id', id)
            .select('id, name, email, role, status');

        if (error) throw error;

        if (!users || users.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        res.status(200).json(users[0]);
    } catch (error) {
        console.error('Error al cambiar status:', error);
        res.status(500).json({ message: 'Error interno al cambiar status.' });
    }
};

// --- (MODERATOR + ADMIN) Listar productos marcados/ocultos/suspendidos ---
export const getFlaggedProducts = async (_req, res) => {
    try {
        // Trae todos los que NO están visibles: oculto, suspendido, peligroso o estado nulo
        const { data: products, error } = await supabase
            .from('products')
            .select('id, name, state, created_at, user_id')
            .or('state.eq.oculto,state.eq.suspendido,state.eq.peligroso,state.is.null')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.status(200).json(products || []);
    } catch (error) {
        console.error('Error al obtener productos moderados:', error);
        res.status(500).json({ message: 'Error interno al obtener productos moderados.' });
    }
};

// --- (MODERATOR + ADMIN) Ocultar/Suspender un producto ---
export const moderateProductState = async (req, res) => {
    const { id } = req.params; // ID del producto
    const { state } = req.body; // 'visible', 'oculto', 'suspendido'

     if (!state || (state !== 'visible' && state !== 'oculto' && state !== 'suspendido' && state !== 'peligroso')) {
        return res.status(400).json({ message: "Estado no válido. ('visible', 'oculto', 'suspendido', 'peligroso')." });
    }
    
    try {
        // Obtener el producto para saber a qué usuario notificar
        const { data: productData, error: fetchError } = await supabase
            .from('products')
            .select('id, name, user_id, state')
            .eq('id', id)
            .single();

        if (fetchError || !productData) {
            return res.status(404).json({ message: 'Producto no encontrado.' });
        }

        // Actualizar estado del producto
        const { data: products, error } = await supabase
            .from('products')
            .update({ state })
            .eq('id', id)
            .select('id, name, state');

        if (error) {
            throw error;
        }

        if (!products || products.length === 0) {
            return res.status(404).json({ message: 'Producto no encontrado.' });
        }

        // Crear notificación para el vendedor según el estado
        const notificationMap = {
            'visible': { title: '✅ Producto Aprobado', message: `Tu producto "${productData.name}" ha sido aprobado y está ahora visible en el marketplace.`, type: 'info' },
            'oculto': { title: '⏸️ Producto en Revisión', message: `Tu producto "${productData.name}" ha sido puesto en revisión. Te notificaremos cuando pase la evaluación.`, type: 'warning' },
            'suspendido': { title: '🚫 Producto Suspendido', message: `Tu producto "${productData.name}" ha sido suspendido temporalmente. Contacta con soporte si tienes dudas.`, type: 'danger' },
            'peligroso': { title: '⛔ Producto Rechazado', message: `Tu producto "${productData.name}" ha sido rechazado por contener contenido inapropiado o palabras no permitidas. El producto será eliminado.`, type: 'danger' }
        };

        const notification = notificationMap[state];
        if (notification) {
            const { error: notifError } = await supabase
                .from('notifications')
                .insert([{
                    user_id: productData.user_id,
                    product_id: id,
                    title: notification.title,
                    message: notification.message,
                    type: notification.type
                }]);

            if (notifError) {
                console.error('Error al crear notificación:', notifError);
                // No bloqueamos la respuesta si falla la notificación
            }
        }

        res.status(200).json(products[0]);
    } catch (error) {
        console.error('Error al moderar producto:', error);
        res.status(500).json({ message: 'Error interno al moderar producto.' });
    }
};