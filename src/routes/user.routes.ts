import { Router } from 'express';
import { updateProfile, deleteAccount, getAllUsersWithPlayers } from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken); // Todas las rutas requieren autenticación

router.get('/', getAllUsersWithPlayers); // Listar todos los usuarios con sus jugadores
router.put('/profile', updateProfile);
router.delete('/account', deleteAccount);

export default router;
