// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import prisma from '../config/database';
import { generateToken } from '../utils/jwt.util';
import { AuthRequest } from '../middleware/auth.middleware';
import { PlayerLinkService } from '../services/playerLink.service';

export const register = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, username, password, fullName } = req.body;

  try {
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'El email o username ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, username, password: hashedPassword, fullName }
    });

    const token = generateToken(user.id);

    res.status(201).json({
      message: '¡Bienvenido a VAMPYR Assistant!',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

export const login = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    // Si el usuario no tiene password (creado vía QR), no puede iniciar sesión con email/password
    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = generateToken(user.id);

    res.json({
      message: '¡Bienvenido de vuelta, luchador!',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, username: true, fullName: true, avatarUrl: true, createdAt: true }
    });

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

// === QR LINK SYSTEM ===
/**
 * GENERAR QR - Desde el videojuego después del login del jugador
 * El jugador ya debe existir (creado con POST /api/players/login)
 * Devuelve la imagen PNG del QR directamente
 */
export const generateQR = async (req: Request, res: Response) => {
  console.log('🔍 generate-qr request body:', req.body);
  console.log('🔍 generate-qr headers:', req.headers['content-type']);
  
  const { username, format = 'image' } = req.body;
  if (!username) {
    console.log('❌ username no proporcionado');
    return res.status(400).json({ error: 'username requerido' });
  }

  try {
    const linkCode = await PlayerLinkService.generateLinkCode(username);
    
    // URL base del servidor (detecta automáticamente o usa variable de entorno)
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const autoFlag = req.body.auto === true || req.body.auto === '1' || req.body.auto === 'true';
  let qrData = `${baseUrl}/link?qr=${linkCode.code}`;
  if (autoFlag) qrData = `${qrData}&auto=1`;

    // Si se pide en formato JSON (para testing o apps que manejan el QR manualmente)
    if (format === 'json') {
      return res.json({
        code: linkCode.code,
        qrUrl: qrData,
        expiresIn: 300,
        message: 'Escanea este código QR desde tu app móvil para vincular tu cuenta'
      });
    }

    // Por defecto, generar imagen PNG del QR
    const qrImageBuffer = await QRCode.toBuffer(qrData, {
      type: 'png',
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',  // Color del QR
        light: '#FFFFFF'  // Color del fondo
      }
    });

    // Enviar la imagen PNG directamente
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="qr_${linkCode.code}.png"`);
    res.setHeader('X-QR-Code', linkCode.code); // Código en header por si lo necesitan
    res.setHeader('X-QR-Expires-In', '300'); // Tiempo de expiración en header
    res.send(qrImageBuffer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const linkWithQR = async (req: AuthRequest, res: Response) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code requerido' });

  try {
    const player = await PlayerLinkService.linkPlayerWithUser(code, req.userId!);
    
    // Obtener datos del usuario para confirmación
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, username: true, email: true, fullName: true }
    });

    res.json({
      message: '¡Jugador vinculado exitosamente!',
      user: {
        id: user?.id,
        username: user?.username,
        email: user?.email,
        fullName: user?.fullName
      },
      player: {
        username: player.username,
        level: player.level,
        enemiesDefeated: player.enemiesDefeated,
        defeats: player.defeats
      }
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getMyPlayer = async (req: AuthRequest, res: Response) => {
  try {
    const player = await prisma.player.findFirst({
      where: { userId: req.userId },
      include: { 
        unlockedItems: { select: { name: true, description: true, itemType: true, rarity: true } },
        achievements: { select: { id: true, name: true, description: true, icon: true, points: true } }
      }
    });

    if (!player) return res.status(404).json({ error: 'No tienes un jugador vinculado' });
    res.json({ player });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener jugador' });
  }
};

/**
 * REGISTRO CON JUGADOR EXISTENTE
 * Para cuando el usuario crea cuenta desde la app móvil y ya tiene un jugador
 * Se vincula automáticamente si el nickname del jugador está disponible
 */
export const registerWithPlayer = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, username, password, fullName, playerUsername } = req.body;

  try {
    // Verificar que el email no exista
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'El email o username ya está registrado' });
    }

    // Verificar que el jugador exista
    const player = await prisma.player.findUnique({
      where: { username: playerUsername }
    });

    if (!player) {
      return res.status(404).json({ 
        error: 'Jugador no encontrado. Primero debes crear tu perfil en el juego.' 
      });
    }

    // Verificar que el jugador no esté vinculado a otra cuenta
    if (player.userId) {
      return res.status(400).json({ 
        error: 'Este jugador ya está vinculado a otra cuenta' 
      });
    }

    // Crear usuario
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, username, password: hashedPassword, fullName }
    });

    // Vincular jugador con usuario
    await prisma.player.update({
      where: { id: player.id },
      data: { userId: user.id }
    });

    const token = generateToken(user.id);

    res.status(201).json({
      message: '¡Cuenta creada y jugador vinculado exitosamente!',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl
      },
      player: {
        username: player.username,
        level: player.level,
        enemiesDefeated: player.enemiesDefeated,
        defeats: player.defeats,
        playTime: player.playTime
      }
    });
  } catch (error) {
    console.error('Error en registro con jugador:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

/**
 * DESVINCULAR JUGADOR
 * Desvincula el jugador asociado a la cuenta del usuario autenticado
 */
export const unlinkPlayer = async (req: AuthRequest, res: Response) => {
  try {
    // Buscar el jugador vinculado a este usuario
    const player = await prisma.player.findFirst({
      where: { userId: req.userId },
      select: { id: true, username: true, userId: true }
    });

    if (!player) {
      return res.status(404).json({ error: 'No tienes ningún jugador vinculado' });
    }

    // Desvincular el jugador (poner userId en null)
    await prisma.player.update({
      where: { id: player.id },
      data: { userId: null }
    });

    console.log(`✅ Jugador ${player.username} desvinculado del usuario ${req.userId}`);

    res.json({
      message: 'Jugador desvinculado exitosamente',
      player: {
        username: player.username
      }
    });
  } catch (error) {
    console.error('Error al desvincular jugador:', error);
    res.status(500).json({ error: 'Error al desvincular jugador' });
  }
};