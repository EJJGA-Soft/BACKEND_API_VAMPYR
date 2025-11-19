import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import bcrypt from 'bcryptjs';

export const updateProfile = async (req: AuthRequest, res: Response) => {
  const { fullName, avatarUrl, username, email } = req.body;

  try {
    // Verificar si el email ya existe (si se está actualizando)
    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingUser && existingUser.id !== req.userId) {
        return res.status(400).json({ error: 'El correo ya está en uso' });
      }
    }

    // Verificar si el username ya existe (si se está actualizando)
    if (username) {
      const existingUser = await prisma.user.findUnique({
        where: { username }
      });
      
      if (existingUser && existingUser.id !== req.userId) {
        return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
      }
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        fullName: fullName || undefined,
        avatarUrl: avatarUrl || undefined,
        username: username || undefined,
        email: email || undefined,
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        createdAt: true
      }
    });

    res.json({ 
      message: 'Perfil actualizado',
      user 
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
};

export const updatePassword = async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Si el usuario no tiene contraseña (creado vía QR), informar que primero debe establecer una
    if (!user.password) {
      return res.status(400).json({ error: 'No hay contraseña establecida para esta cuenta. Usa la opción para establecer una contraseña.' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.userId },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error al actualizar contraseña:', error);
    res.status(500).json({ error: 'Error al actualizar contraseña' });
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.delete({
      where: { id: req.userId }
    });

    res.json({ message: 'Cuenta eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar cuenta:', error);
    res.status(500).json({ error: 'Error al eliminar cuenta' });
  }
};

/**
 * OBTENER TODOS LOS USUARIOS CON SUS JUGADORES VINCULADOS
 * Útil para administración y debugging
 */
export const getAllUsersWithPlayers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        createdAt: true,
        players: {
          select: {
            id: true,
            username: true,
            level: true,
            enemiesDefeated: true,
            defeats: true,
            playTime: true,
            unlockedItems: true,
            achievements: {
              select: {
                id: true,
                name: true,
                description: true,
                points: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transformar para mostrar solo el primer player (en práctica solo hay 1 por usuario)
    const usersFormatted = users.map(u => ({
      ...u,
      player: u.players.length > 0 ? u.players[0] : null,
      players: undefined // Remover el array
    }));

    const stats = {
      totalUsers: users.length,
      usersWithPlayer: users.filter(u => u.players.length > 0).length,
      usersWithoutPlayer: users.filter(u => u.players.length === 0).length
    };

    res.json({ 
      stats,
      users: usersFormatted
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};
