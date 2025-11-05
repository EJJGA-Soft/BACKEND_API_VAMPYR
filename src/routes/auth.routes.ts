import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, getProfile } from '../controllers/auth.controller';
import { updateProfile, updatePassword } from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/register',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('username').isLength({ min: 3 }).withMessage('El username debe tener al menos 3 caracteres'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('fullName').optional().trim()
  ],
  register
);

router.post('/login',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Contraseña requerida')
  ],
  login
);

router.get('/profile', authenticateToken, getProfile);

router.put('/profile', authenticateToken, updateProfile);

router.put('/password',
  authenticateToken,
  [
    body('currentPassword').notEmpty().withMessage('Contraseña actual requerida'),
    body('newPassword').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres')
  ],
  updatePassword
);

export default router;
