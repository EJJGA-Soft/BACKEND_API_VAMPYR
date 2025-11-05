import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: req.userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { messages: true }
        }
      }
    });

    res.json({ conversations });
  } catch (error) {
    console.error('Error al obtener conversaciones:', error);
    res.status(500).json({ error: 'Error al obtener conversaciones' });
  }
};

export const getConversationById = async (req: AuthRequest, res: Response) => {
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

export const updateConversation = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title } = req.body;

  try {
    const conversation = await prisma.conversation.updateMany({
      where: { 
        id,
        userId: req.userId 
      },
      data: { title }
    });

    if (conversation.count === 0) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    res.json({ message: 'Conversación actualizada' });
  } catch (error) {
    console.error('Error al actualizar conversación:', error);
    res.status(500).json({ error: 'Error al actualizar conversación' });
  }
};

export const deleteConversation = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const result = await prisma.conversation.deleteMany({
      where: { 
        id,
        userId: req.userId 
      }
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    res.json({ message: 'Conversación eliminada' });
  } catch (error) {
    console.error('Error al eliminar conversación:', error);
    res.status(500).json({ error: 'Error al eliminar conversación' });
  }
};
