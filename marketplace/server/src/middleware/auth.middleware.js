import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const { JWT_SECRET } = process.env; // Usa tu clave secreta de .env

export const authRequired = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: 'Token de autorización no proporcionado' });
        }

        const token = authHeader.split(' ')[1]; // Espera formato "Bearer <token>"

        if (!token) {
            return res.status(401).json({ message: 'Token de autorización no proporcionado o formato inválido' });
        }

        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                // Esto podría ser un token expirado o inválido
                return res.status(403).json({ message: 'Token no válido o expirado' });
            }

            // 1. Verificamos el estado del usuario
            if (decoded.status !== 'active') {
                return res.status(403).json({ message: 'La cuenta de usuario está suspendida.' });
            }

            // 2. Adjuntamos la información del usuario al objeto 'req'
            // Esto nos da acceso a req.userId, req.userRole, etc. en los controladores
            req.userId = decoded.id;
            req.userRole = decoded.role;
            req.userStatus = decoded.status;

            next();
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};