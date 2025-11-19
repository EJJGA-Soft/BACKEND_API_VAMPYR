import { Router } from 'express';
import { sendMessageToRAG } from '../controllers/chat.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Endpoint para enviar mensajes al chatbot RAG
router.post('/message', authenticateToken, sendMessageToRAG);

export default router;
