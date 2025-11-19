// src/routes/player.routes.ts
import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  gameLogin,
  getPlayerProfile,
  updateProgress,
  unlockItem,
  unlockCharacter,
  unlockAchievement,
  getPlayerStats,
  syncPlayerData,
  checkPlayerExists,
  getPlayerAchievements,
  getGlobalStats
} from '../controllers/player.controller';

const router = Router();

/**
 * GET /api/players/global/stats
 * Obtener estadísticas globales del juego
 * IMPORTANTE: Esta ruta debe estar ANTES de las rutas con :username
 */
router.get('/global/stats', getGlobalStats);

/**
 * POST /api/players/login
 * Login desde el videojuego con nickname (crea el jugador si no existe)
 */
router.post('/login',
  [
    body('username')
      .isLength({ min: 3, max: 20 })
      .withMessage('El username debe tener entre 3 y 20 caracteres')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('El username solo puede contener letras, números y guiones bajos')
  ],
  gameLogin
);

/**
 * GET /api/players/check/:username
 * Verificar si un jugador existe y si está vinculado
 */
router.get('/check/:username',
  [
    param('username').notEmpty().withMessage('Username requerido')
  ],
  checkPlayerExists
);

/**
 * GET /api/players/:username
 * Obtener perfil completo de un jugador
 */
router.get('/:username',
  [
    param('username').notEmpty().withMessage('Username requerido')
  ],
  getPlayerProfile
);

/**
 * PUT /api/players/:username/progress
 * Actualizar progreso del jugador (nivel, experiencia, stats, etc.)
 */
router.put('/:username/progress',
  [
    param('username').notEmpty().withMessage('Username requerido')
  ],
  updateProgress
);

/**
 * POST /api/players/:username/items
 * Desbloquear un item para el jugador
 */
router.post('/:username/items',
  [
    param('username').notEmpty().withMessage('Username requerido'),
    body('itemName').notEmpty().withMessage('Nombre del item requerido'),
    body('itemType').optional().isIn(['weapon', 'armor', 'consumable', 'special']),
    body('rarity').optional().isIn(['common', 'rare', 'epic', 'legendary'])
  ],
  unlockItem
);

/**
 * POST /api/players/:username/characters
 * Desbloquear un personaje para el jugador
 */
router.post('/:username/characters',
  [
    param('username').notEmpty().withMessage('Username requerido'),
    body('characterName').notEmpty().withMessage('Nombre del personaje requerido'),
    body('rarity').optional().isIn(['common', 'rare', 'epic', 'legendary'])
  ],
  unlockCharacter
);

/**
 * POST /api/players/:username/achievements
 * Desbloquear un logro para el jugador
 */
router.post('/:username/achievements',
  [
    param('username').notEmpty().withMessage('Username requerido'),
    body('achievementName').notEmpty().withMessage('Nombre del logro requerido'),
    body('points').optional().isInt({ min: 1 })
  ],
  unlockAchievement
);

/**
 * GET /api/players/:username/stats
 * Obtener estadísticas agregadas del jugador (para app móvil)
 */
router.get('/:username/stats',
  [
    param('username').notEmpty().withMessage('Username requerido')
  ],
  getPlayerStats
);

/**
 * GET /api/players/:username/achievements
 * Obtener todos los logros del jugador (para modal en la app)
 */
router.get('/:username/achievements',
  [
    param('username').notEmpty().withMessage('Username requerido')
  ],
  getPlayerAchievements
);

/**
 * GET /api/players/:username/sync
 * Sincronización completa de datos (para cuando inicia el juego)
 */
router.get('/:username/sync',
  [
    param('username').notEmpty().withMessage('Username requerido')
  ],
  syncPlayerData
);

export default router;
