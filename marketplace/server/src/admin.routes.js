import { Router } from 'express';
import { authRequired } from './middleware/auth.middleware.js';
// ¡Asegúrate de haber creado este archivo!
import { isAdmin, isModerator } from './middleware/role.middleware.js'; 
import {
    getAllUsers,
    updateUserRole,
    updateUserStatus,
    moderateProductState,
    getFlaggedProducts
} from './admin.controller.js';

const router = Router();

router.get('/users', authRequired, isModerator, getAllUsers);
router.put('/users/:id/role', authRequired, isAdmin, updateUserRole);
router.put('/users/:id/status', authRequired, isModerator, updateUserStatus);
router.put('/products/:id/state', authRequired, isModerator, moderateProductState);
router.get('/moderation/items', authRequired, isModerator, getFlaggedProducts);

export default router;