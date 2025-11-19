// src/controllers/conversation.controller.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/database';

/**
 * CREAR NUEVA CONVERSACIÓN
 */
export const createConversation = async (req: AuthRequest, res: Response) => {
  const { title } = req.body;

  try {
    const conversation = await prisma.conversation.create({
      data: {
        title: title || 'Nueva conversación',
        userId: req.userId!
      }
    });

    res.status(201).json({
      message: 'Conversación creada',
      conversation
    });
  } catch (error) {
    console.error('Error al crear conversación:', error);
    res.status(500).json({ error: 'Error al crear conversación' });
  }
};

/**
 * OBTENER TODAS LAS CONVERSACIONES DEL USUARIO
 */
export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: req.userId },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({
      conversations: conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        userId: conv.userId,
        messageCount: conv._count.messages,
        lastMessage: conv.messages[0] || null,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error al obtener conversaciones:', error);
    res.status(500).json({ error: 'Error al obtener conversaciones' });
  }
};

/**
 * OBTENER UNA CONVERSACIÓN CON TODOS SUS MENSAJES
 */
export const getConversation = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const conversation = await prisma.conversation.findFirst({
      where: { 
        id,
        userId: req.userId 
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    res.json({ conversation });
  } catch (error) {
    console.error('Error al obtener conversación:', error);
    res.status(500).json({ error: 'Error al obtener conversación' });
  }
};

/**
 * AGREGAR MENSAJE A CONVERSACIÓN
 */
export const addMessage = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { role, content } = req.body;

  if (!role || !content) {
    return res.status(400).json({ error: 'role y content son requeridos' });
  }

  if (!['user', 'assistant'].includes(role)) {
    return res.status(400).json({ error: 'role debe ser "user" o "assistant"' });
  }

  try {
    // Verificar que la conversación existe y pertenece al usuario
    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: req.userId }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    // Crear mensaje
    const message = await prisma.message.create({
      data: {
        conversationId: id,
        role,
        content
      }
    });

    // Actualizar timestamp de la conversación
    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() }
    });

    res.status(201).json({
      message: 'Mensaje agregado',
      data: message
    });
  } catch (error) {
    console.error('Error al agregar mensaje:', error);
    res.status(500).json({ error: 'Error al agregar mensaje' });
  }
};

/**
 * ELIMINAR CONVERSACIÓN
 */
export const deleteConversation = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    // Verificar que la conversación existe y pertenece al usuario
    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: req.userId }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    // Eliminar conversación (los mensajes se eliminan en cascada)
    await prisma.conversation.delete({
      where: { id }
    });

    res.json({ message: 'Conversación eliminada' });
  } catch (error) {
    console.error('Error al eliminar conversación:', error);
    res.status(500).json({ error: 'Error al eliminar conversación' });
  }
};

/**
 * ACTUALIZAR TÍTULO DE CONVERSACIÓN
 */
export const updateConversationTitle = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'título no puede estar vacío' });
  }

  try {
    // Verificar que la conversación existe y pertenece al usuario
    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: req.userId }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: { title }
    });

    res.json({
      message: 'Título actualizado',
      conversation: updated
    });
  } catch (error) {
    console.error('Error al actualizar título:', error);
    res.status(500).json({ error: 'Error al actualizar título' });
  }
};
