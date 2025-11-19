import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import axios from 'axios';
import prisma from '../config/database';

const RAG_API_URL = process.env.RAG_API_URL || 'http://localhost:8000';

export const sendMessageToRAG = async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId, message } = req.body;

    if (!conversationId || !message) {
      return res.status(400).json({
        error: 'conversationId y message son requeridos',
      });
    }

    // Verificar que la conversación existe y pertenece al usuario
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: req.userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 10, // Últimos 10 mensajes para contexto
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversación no encontrada',
      });
    }

    console.log(`📩 Enviando mensaje al RAG API: "${message}"`);

    // Preparar historial para el RAG (últimos mensajes)
    const history = conversation.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Llamar al RAG API (Python)
    const ragResponse = await axios.post(
      `${RAG_API_URL}/chat`,
      {
        message,
        history,
      },
      {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const answer = ragResponse.data.answer;
    console.log(`✅ Respuesta del RAG: "${answer.substring(0, 50)}..."`);

    // Guardar mensaje del usuario en la BD
    const userMessage = await prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content: message,
      },
    });

    // Guardar respuesta del asistente en la BD
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: answer,
      },
    });

    // Actualizar timestamp de la conversación
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    console.log(`💾 Mensajes guardados en BD (conversación ${conversationId})`);

    return res.json({
      userMessage: {
        id: userMessage.id,
        role: userMessage.role,
        content: userMessage.content,
        createdAt: userMessage.createdAt,
      },
      assistantMessage: {
        id: assistantMessage.id,
        role: assistantMessage.role,
        content: assistantMessage.content,
        createdAt: assistantMessage.createdAt,
      },
    });
  } catch (error: any) {
    console.error('❌ Error en chat controller:', error.message);

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        return res.status(503).json({
          error: 'El servidor RAG no está disponible. Verifica que esté ejecutándose.',
        });
      }
      if (error.response) {
        return res.status(error.response.status).json({
          error: error.response.data,
        });
      }
    }

    return res.status(500).json({
      error: 'Error al procesar el mensaje',
    });
  }
};
