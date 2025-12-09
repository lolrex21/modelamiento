export const isModerator = (req, res, next) => {
    if (req.userRole === 'moderator' || req.userRole === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Acceso denegado. Se requiere rol de Moderador o Administrador.' });
    }
};

export const isAdmin = (req, res, next) => {
    if (req.userRole === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Acceso denegado. Se requiere rol de Administrador.' });
    }
};