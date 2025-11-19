import prisma from '../config/database';
import { randomBytes } from 'crypto';

export class PlayerLinkService {
  static async generateLinkCode(playerUsername: string) {
    const player = await prisma.player.findUnique({
      where: { username: playerUsername },
    });

    if (!player) throw new Error('Jugador no encontrado');

    // Invalidar códigos anteriores
    await prisma.loginCode.updateMany({
      where: { playerId: player.id, used: false },
      data: { used: true },
    });

    const code = randomBytes(4).toString('hex').toUpperCase().slice(0, 8);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    return prisma.loginCode.create({
      data: {
        code,
        playerId: player.id,
        expiresAt,
      },
    });
  }

  static async linkPlayerWithUser(code: string, userId: string) {
    const loginCode = await prisma.loginCode.findUnique({
      where: { code },
      include: { player: true },
    });

    if (!loginCode || loginCode.expiresAt < new Date()) {
      throw new Error('Código inválido o expirado');
    }

    // Permitir reusar el código si el jugador fue desvinculado (userId es null)
    if (loginCode.used && loginCode.player.userId !== null) {
      throw new Error('Código ya utilizado');
    }

    if (loginCode.player.userId && loginCode.player.userId !== userId) {
      throw new Error('Este jugador ya está vinculado a otra cuenta');
    }

    const updatedPlayer = await prisma.player.update({
      where: { id: loginCode.player.id },
      data: { userId },
    });

    await prisma.loginCode.update({
      where: { id: loginCode.id },
      data: { used: true },
    });

    return updatedPlayer;
  }
}