import { Response } from 'express';
import axios from 'axios';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

const RAG_API_URL = process.env.RAG_API_URL || 'http://localhost:8000';

export const sendMessage = async (req: AuthRequest, res: Response) => {
  const { conversationId, message } = req.body;

  if (!conversationId || !message) {
    return res.status(400).json({ 
      error: 'conversationId y message son requeridos' 
    });
  }

  try {
    // Verificar que la conversación pertenezca al usuario
    const conversation = await prisma.conversation.findFirst({
      where: { 
        id: conversationId,
        userId: req.userId 
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 10 // Últimos 10 mensajes para contexto
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    // Guardar mensaje del usuario
    const userMessage = await prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content: message
      }
    });

    // Preparar historial para el RAG
    const history = conversation.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Llamar al backend RAG (Python)
    const ragResponse = await axios.post(`${RAG_API_URL}/chat`, {
      message,
      history
    });

    const assistantAnswer = ragResponse.data.answer;

    // Guardar respuesta del asistente
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: assistantAnswer
      }
    });

    // Actualizar timestamp de la conversación
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    res.json({
      userMessage,
      assistantMessage
    });
  } catch (error: any) {
    console.error('Error al enviar mensaje:', error);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'El servicio RAG no está disponible. Verifica que el backend Python esté corriendo.' 
      });
    }

    res.status(500).json({ error: 'Error al procesar el mensaje' });
  }
};
