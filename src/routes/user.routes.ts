import { Router } from 'express';
import { updateProfile, deleteAccount } from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken); // Todas las rutas requieren autenticación

router.put('/profile', updateProfile);
router.delete('/account', deleteAccount);

export default router;
