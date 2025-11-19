import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, getProfile, generateQR, linkWithQR, getMyPlayer, registerWithPlayer, unlinkPlayer } from '../controllers/auth.controller';
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

// REGISTRO VINCULANDO JUGADOR EXISTENTE
router.post('/register-with-player',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('username').isLength({ min: 3 }).withMessage('El username debe tener al menos 3 caracteres'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('fullName').optional().trim(),
    body('playerUsername').isLength({ min: 3 }).withMessage('El nickname del jugador es requerido')
  ],
  registerWithPlayer
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

// QR LINK SYSTEM - Para vincular jugador del juego con cuenta de usuario
router.post('/generate-qr', [body('username').exists()], generateQR);
router.post('/link-qr', authenticateToken, [body('code').exists()], linkWithQR);
router.delete('/unlink-player', authenticateToken, unlinkPlayer);
router.get('/my-player', authenticateToken, getMyPlayer);

export default router;
