import { Router } from 'express';
import {
  createLead,
  getAllLeads,
  getLeadById,
  updateLeadStatus,
  deleteLead,
  getLeadStats
} from '../controllers/lead.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

/**
 * Ruta pública para crear un lead desde la landing page
 * POST /api/leads
 */
router.post('/', createLead);

/**
 * Rutas protegidas para gestión de leads (requieren autenticación)
 */

/**
 * GET /api/leads/stats
 * Obtener estadísticas de leads
 */
router.get('/stats', authenticateToken, getLeadStats);

/**
 * GET /api/leads
 * Obtener todos los leads con filtros opcionales
 */
router.get('/', authenticateToken, getAllLeads);

/**
 * GET /api/leads/:id
 * Obtener un lead por ID
 */
router.get('/:id', authenticateToken, getLeadById);

/**
 * PATCH /api/leads/:id
 * Actualizar estado de un lead
 */
router.patch('/:id', authenticateToken, updateLeadStatus);

/**
 * DELETE /api/leads/:id
 * Eliminar un lead
 */
router.delete('/:id', authenticateToken, deleteLead);

export default router;
