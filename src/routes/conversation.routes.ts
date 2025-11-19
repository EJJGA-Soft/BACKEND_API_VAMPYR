// src/routes/conversation.routes.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import * as conversationController from '../controllers/conversation.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// CRUD de conversaciones
router.post('/', conversationController.createConversation);
router.get('/', conversationController.getConversations);
router.get('/:id', conversationController.getConversation);
router.delete('/:id', conversationController.deleteConversation);
router.put('/:id', conversationController.updateConversationTitle); // Actualizar título (usado por Flutter)
router.patch('/:id/title', conversationController.updateConversationTitle); // Alternativa

// Agregar mensajes a conversación
router.post('/:id/messages', conversationController.addMessage);

export default router;
