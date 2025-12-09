import { supabase } from './db.js';
import { Resend } from 'resend';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const FROM_EMAIL = process.env.RESEND_FROM || 'onboarding@resend.dev';

// Función para obtener Resend (lazy initialization)
const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY no está configurada en .env');
  }
  return new Resend(apiKey);
};

// POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !/^[\w.+-]+@gmail\.com$/i.test(email)) {
            return res.status(400).json({ error: 'Solo se permite recuperación para cuentas @gmail.com válidas.' });
        }
        // Buscar usuario
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, name')
            .eq('email', email)
            .single();
        // Siempre responder igual para no revelar si existe
        if (error || !user) {
            return res.status(200).json({ message: 'Si el correo existe, recibirás un enlace.' });
        }
        // Generar token y guardar en tabla
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hora
        await supabase.from('password_resets').insert([
            {
                user_id: user.id,
                token,
                expires_at: expiresAt,
                used: false
            }
        ]);
        // Enviar email con Resend
        const resend = getResend();
        const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;
        const emailResult = await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: 'Recupera tu contraseña',
            html: `<p>Hola ${user.name || ''},</p>
                   <p>Haz clic en el siguiente enlace para restablecer tu contraseña. Válido por 1 hora:</p>
                   <p><a href='${resetLink}' style='background:#007bff;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;'>Restablecer contraseña</a></p>
                   <p>Si no solicitaste este cambio, ignora este correo.</p>`
        });
        console.log('[FORGOT] email send result:', emailResult);
        return res.status(200).json({ message: 'Si el correo existe, recibirás un enlace.' });
    } catch (err) {
        console.error('Error en forgotPassword:', err);
        return res.status(500).json({ error: 'Error interno.' });
    }
};

// POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Faltan datos.' });
        }
        // Buscar token válido
        const { data: reset, error } = await supabase
            .from('password_resets')
            .select('id, user_id, expires_at, used')
            .eq('token', token)
            .single();
        if (error || !reset || reset.used || new Date(reset.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Token inválido o expirado.' });
        }
        // Hashear nueva contraseña con bcrypt
        const hash = await bcrypt.hash(newPassword, 10);
        // Actualizar contraseña en usuarios
        await supabase
            .from('users')
            .update({ password_hash: hash })
            .eq('id', reset.user_id);
        // Marcar token como usado
        await supabase
            .from('password_resets')
            .update({ used: true })
            .eq('id', reset.id);
        return res.status(200).json({ message: 'Contraseña actualizada correctamente.' });
    } catch (err) {
        console.error('Error en resetPassword:', err);
        return res.status(500).json({ error: 'Error interno.' });
    }
};
