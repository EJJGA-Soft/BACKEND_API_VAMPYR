// src/controllers/player.controller.ts
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/database';
import { generateToken } from '../utils/jwt.util';

/**
 * LOGIN DEL JUEGO - El jugador se loguea con su nickname desde el videojuego
 * Si no existe, se crea automáticamente
 */
export const gameLogin = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username } = req.body;

  try {
    // Buscar o crear el jugador (incluir solo unlockedItems)
    let player = await prisma.player.findUnique({
      where: { username },
      include: { unlockedItems: true }
    });

    if (!player) {
      // Crear nuevo jugador con valores por defecto simplificados
      player = await prisma.player.create({
        data: { username },
        include: { unlockedItems: true }
      });
    }

    // Generar token para el jugador (usando el ID del player como string)
    const token = generateToken(`player_${player.id}`);

    res.json({
      message: player.createdAt.getTime() === player.updatedAt.getTime() 
        ? '¡Bienvenido nuevo jugador!' 
        : '¡Bienvenido de vuelta!',
      token,
      player: {
        id: player.id,
        username: player.username,
        level: player.level,
        enemiesDefeated: player.enemiesDefeated,
        defeats: player.defeats,
        playTime: player.playTime,
        unlockedItems: player.unlockedItems,
        isLinkedToAccount: !!player.userId
      }
    });
  } catch (error) {
    console.error('Error en game login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión en el juego' });
  }
};

/**
 * OBTENER PERFIL DEL JUGADOR
 */
export const getPlayerProfile = async (req: Request, res: Response) => {
  const { username } = req.params;

  try {
    const player = await prisma.player.findUnique({
      where: { username },
      include: {
        unlockedItems: {
          select: { id: true, name: true, description: true, itemType: true, rarity: true }
        }
      }
    });

    if (!player) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    // (No restriction: todos los perfiles se crean desde el videojuego)

    res.json({
      player: {
        username: player.username,
        level: player.level,
        enemiesDefeated: player.enemiesDefeated,
        defeats: player.defeats,
        playTime: player.playTime,
        unlockedItems: player.unlockedItems,
        createdAt: player.createdAt,
        isLinkedToAccount: !!player.userId
      }
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error al obtener perfil del jugador' });
  }
};

/**
 * ACTUALIZAR PROGRESO DEL JUGADOR - Llamado desde el videojuego
 */
export const updateProgress = async (req: Request, res: Response) => {
  const { username } = req.params;
  const updateData = req.body;

  try {
    const player = await prisma.player.findUnique({
      where: { username },
      include: { unlockedItems: true }
    });

    if (!player) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    // Construir objeto de actualización con validación de límites (3 niveles, 6 enemigos, 6 items)
    const dataToUpdate: any = {};
    
    if (updateData.level !== undefined) {
      // Validar nivel máximo 3
      dataToUpdate.level = Math.max(1, Math.min(3, updateData.level));
    }
    
    if (updateData.enemiesDefeated !== undefined) {
      // Validar máximo 6 enemigos
      dataToUpdate.enemiesDefeated = Math.max(0, Math.min(6, updateData.enemiesDefeated));
    }
    
    if (updateData.defeats !== undefined) {
      // Validar que no sea negativo
      dataToUpdate.defeats = Math.max(0, updateData.defeats);
    }
    
    if (updateData.playTime !== undefined) {
      // Validar que no sea negativo
      dataToUpdate.playTime = Math.max(0, updateData.playTime);
    }

    // Manejar desbloqueo de items (espadas)
    if (updateData.unlockedItems !== undefined && Array.isArray(updateData.unlockedItems)) {
      // Validar máximo 6 items
      const itemsToUnlock = updateData.unlockedItems.slice(0, 6);
      
      // Buscar o crear los items
      const itemPromises = itemsToUnlock.map(async (itemName: string) => {
        let item = await prisma.item.findFirst({
          where: { name: itemName }
        });

        if (!item) {
          // Crear item si no existe
          item = await prisma.item.create({
            data: {
              name: itemName,
              description: `Item desbloqueado: ${itemName}`,
              itemType: 'weapon',
              rarity: 'common'
            }
          });
        }

        return item;
      });

      const items = await Promise.all(itemPromises);

      // Desconectar todos los items anteriores y conectar los nuevos
      dataToUpdate.unlockedItems = {
        set: items.map(item => ({ id: item.id }))
      };
    }

    // Manejar desbloqueo de logros (achievements)
    if (updateData.achievements !== undefined && Array.isArray(updateData.achievements)) {
      // Buscar o crear achievements por nombre o ID
      const achievementPromises = updateData.achievements.map(async (achievementIdentifier: string | number) => {
        let achievement;

        // Si es un número, buscar por ID
        if (typeof achievementIdentifier === 'number') {
          achievement = await prisma.achievement.findUnique({
            where: { id: achievementIdentifier }
          });
        } else {
          // Si es string, intentar como nombre primero
          achievement = await prisma.achievement.findFirst({
            where: { name: achievementIdentifier }
          });

          // Si no se encuentra, intentar parsearlo como ID
          if (!achievement && !isNaN(Number(achievementIdentifier))) {
            achievement = await prisma.achievement.findUnique({
              where: { id: Number(achievementIdentifier) }
            });
          }

          // Si aún no existe, crearlo automáticamente
          if (!achievement) {
            console.log(`✨ Creando nuevo logro: ${achievementIdentifier}`);
            achievement = await prisma.achievement.create({
              data: {
                name: achievementIdentifier,
                description: `Logro: ${achievementIdentifier}`,
                points: 10 // Puntos por defecto
              }
            });
          }
        }

        return achievement;
      });

      const achievements = await Promise.all(achievementPromises);

      if (achievements.length > 0) {
        // Conectar achievements (se acumulan, no se reemplazan)
        dataToUpdate.achievements = {
          connect: achievements.map(a => ({ id: a!.id }))
        };
      }
    }

    const updatedPlayer = await prisma.player.update({ 
      where: { username }, 
      data: dataToUpdate, 
      include: { 
        unlockedItems: { select: { name: true, description: true, itemType: true, rarity: true } },
        achievements: { select: { id: true, name: true, description: true, points: true } }
      } 
    });

    // Respuesta limpia con solo datos relevantes
    res.json({
      message: 'Progreso guardado exitosamente',
      player: {
        username: updatedPlayer.username,
        level: updatedPlayer.level,
        enemiesDefeated: updatedPlayer.enemiesDefeated,
        defeats: updatedPlayer.defeats,
        playTime: updatedPlayer.playTime,
        unlockedItems: updatedPlayer.unlockedItems.map(item => item.name),
        achievements: updatedPlayer.achievements.map(a => ({
          name: a.name,
          points: a.points
        }))
      }
    });
  } catch (error) {
    console.error('Error al actualizar progreso:', error);
    res.status(500).json({ error: 'Error al guardar progreso' });
  }
};

/**
 * DESBLOQUEAR ITEM
 */
export const unlockItem = async (req: Request, res: Response) => {
  const { username } = req.params;
  const { itemName, itemType = 'weapon', rarity = 'common', description } = req.body;

  try {
    const player = await prisma.player.findUnique({
      where: { username },
      include: { unlockedItems: true }
    });

    if (!player) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    // Validar límite de 6 espadas/items
    if (player.unlockedItems.length >= 6) {
      return res.status(400).json({ 
        error: 'Límite alcanzado',
        message: 'Ya tienes las 6 espadas desbloqueadas' 
      });
    }

    // Buscar o crear el item
    let item = await prisma.item.findUnique({
      where: { name: itemName }
    });

    if (!item) {
      item = await prisma.item.create({
        data: {
          name: itemName,
          description,
          itemType,
          rarity
        }
      });
    }

    // Verificar si ya tiene el item
    const alreadyUnlocked = player.unlockedItems.some(i => i.id === item!.id);
    if (alreadyUnlocked) {
      return res.status(400).json({ 
        error: 'Ya desbloqueado',
        message: `Ya tienes ${itemName}` 
      });
    }

    // Vincular item al jugador
    await prisma.player.update({
      where: { username },
      data: {
        unlockedItems: {
          connect: { id: item.id }
        }
      }
    });

    res.json({
      message: `¡${itemName} desbloqueado!`,
      item,
      totalUnlocked: player.unlockedItems.length + 1
    });
  } catch (error) {
    console.error('Error al desbloquear item:', error);
    res.status(500).json({ error: 'Error al desbloquear item' });
  }
};

/**
 * DESBLOQUEAR PERSONAJE
 */
export const unlockCharacter = async (req: Request, res: Response) => {
  const { username } = req.params;
  const { characterName, rarity = 'common', description } = req.body;

  try {
    const player = await prisma.player.findUnique({
      where: { username }
    });

    if (!player) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    // Buscar o crear el personaje
    let character = await prisma.character.findUnique({
      where: { name: characterName }
    });

    if (!character) {
      character = await prisma.character.create({
        data: {
          name: characterName,
          description,
          rarity
        }
      });
    }

    // Vincular personaje al jugador
    // Nota: en el esquema simplificado, no existe la relación unlockedCharacters
    // Respondemos con el personaje creado pero no lo vinculamos

    res.json({
      message: `¡Personaje ${characterName} desbloqueado!`,
      character
    });
  } catch (error) {
    console.error('Error al desbloquear personaje:', error);
    res.status(500).json({ error: 'Error al desbloquear personaje' });
  }
};

/**
 * DESBLOQUEAR ACHIEVEMENT
 */
export const unlockAchievement = async (req: Request, res: Response) => {
  const { username } = req.params;
  const { achievementName, description, icon, points = 10 } = req.body;

  try {
    const player = await prisma.player.findUnique({
      where: { username },
      include: { achievements: true }
    });

    if (!player) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    // Buscar o crear el logro
    let achievement = await prisma.achievement.findUnique({
      where: { name: achievementName }
    });

    if (!achievement) {
      achievement = await prisma.achievement.create({
        data: {
          name: achievementName,
          description,
          icon,
          points
        }
      });
    }

    // Verificar si ya tiene el logro
    const alreadyUnlocked = player.achievements.some(a => a.id === achievement!.id);
    if (alreadyUnlocked) {
      return res.status(400).json({ 
        error: 'Ya desbloqueado',
        message: `Ya tienes el logro ${achievementName}` 
      });
    }

    // Vincular logro al jugador
    await prisma.player.update({
      where: { username },
      data: {
        achievements: {
          connect: { id: achievement.id }
        }
      }
    });

    res.json({ 
      message: `¡Logro desbloqueado: ${achievementName}!`, 
      achievement,
      totalAchievements: player.achievements.length + 1
    });
  } catch (error) {
    console.error('Error al desbloquear logro:', error);
    res.status(500).json({ error: 'Error al desbloquear logro' });
  }
};

/**
 * OBTENER ESTADÍSTICAS DEL JUGADOR (para la app móvil)
 */
export const getPlayerStats = async (req: Request, res: Response) => {
  const { username } = req.params;

  try {
    const player = await prisma.player.findUnique({
      where: { username },
      include: {
        unlockedItems: { select: { name: true, itemType: true, rarity: true } },
        achievements: { select: { id: true, name: true, description: true, icon: true, points: true } }
      }
    });

    if (!player) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    // Calcular estadísticas agregadas
    const itemsByRarity = player.unlockedItems.reduce((acc: any, item) => {
      acc[item.rarity] = (acc[item.rarity] || 0) + 1;
      return acc;
    }, {});

    const totalAchievementPoints = player.achievements.reduce((sum, ach) => sum + ach.points, 0);

    res.json({
      username: player.username,
      level: player.level,
      combat: {
        enemiesDefeated: player.enemiesDefeated,
        enemiesRemaining: 6 - player.enemiesDefeated,
        defeats: player.defeats
      },
      progression: {
        playTime: player.playTime,
        playTimeFormatted: formatPlayTime(player.playTime),
        totalItems: player.unlockedItems.length,
        itemsRemaining: 6 - player.unlockedItems.length,
        itemsByRarity
      },
      achievements: {
        total: player.achievements.length,
        totalPoints: totalAchievementPoints,
        list: player.achievements
      },
      unlockedItems: player.unlockedItems,
      createdAt: player.createdAt,
      lastUpdated: player.updatedAt,
      isLinkedToAccount: !!player.userId
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

/**
 * VERIFICAR SI UN JUGADOR EXISTE Y SU ESTADO
 * Para que la app móvil pueda verificar antes de registrar
 */
export const checkPlayerExists = async (req: Request, res: Response) => {
  const { username } = req.params;

  try {
    const player = await prisma.player.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        level: true,
        enemiesDefeated: true,
        defeats: true,
        playTime: true,
        userId: true,
        createdAt: true
      }
    });

    if (!player) {
      return res.json({
        exists: false,
        message: 'Este jugador no existe. Primero debes crear tu perfil en el juego.'
      });
    }

    res.json({
      exists: true,
      isLinked: !!player.userId,
      player: {
        username: player.username,
        level: player.level,
        enemiesDefeated: player.enemiesDefeated,
        defeats: player.defeats,
        playTime: player.playTime,
        createdAt: player.createdAt
      },
      message: player.userId 
        ? 'Este jugador ya está vinculado a una cuenta'
        : 'Este jugador está disponible para vincular'
    });
  } catch (error) {
    console.error('Error al verificar jugador:', error);
    res.status(500).json({ error: 'Error al verificar jugador' });
  }
};

/**
 * SINCRONIZACIÓN COMPLETA - Para cuando el jugador inicia el juego
 */
export const syncPlayerData = async (req: Request, res: Response) => {
  const { username } = req.params;

  try {
    const player = await prisma.player.findUnique({
      where: { username },
      include: {
        unlockedItems: {
          select: { id: true, name: true, description: true, itemType: true, rarity: true }
        }
      }
    });

    if (!player) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    res.json({
      message: 'Datos sincronizados',
      player: {
        username: player.username,
        level: player.level,
        enemiesDefeated: player.enemiesDefeated,
        defeats: player.defeats,
        playTime: player.playTime,
        unlockedItems: player.unlockedItems,
        lastSync: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error al sincronizar:', error);
    res.status(500).json({ error: 'Error al sincronizar datos' });
  }
};

// Helper function
function formatPlayTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

/**
 * OBTENER TODOS LOS LOGROS DEL JUGADOR (para el modal en la app)
 */
export const getPlayerAchievements = async (req: Request, res: Response) => {
  const { username } = req.params;

  try {
    const player = await prisma.player.findUnique({
      where: { username },
      include: {
        achievements: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            points: true
          },
          orderBy: {
            points: 'desc' // Ordenar por puntos descendente
          }
        }
      }
    });

    if (!player) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    const totalPoints = player.achievements.reduce((sum, ach) => sum + ach.points, 0);

    res.json({
      username: player.username,
      totalAchievements: player.achievements.length,
      totalPoints,
      achievements: player.achievements
    });
  } catch (error) {
    console.error('Error al obtener logros:', error);
    res.status(500).json({ error: 'Error al obtener logros' });
  }
};

/**
 * OBTENER ESTADÍSTICAS GLOBALES DEL JUEGO
 */
export const getGlobalStats = async (req: Request, res: Response) => {
  try {
    // Obtener total de jugadores
    const totalPlayers = await prisma.player.count();

    // Obtener jugadores vinculados
    const linkedPlayers = await prisma.player.count({
      where: { userId: { not: null } }
    });

    // Obtener todos los jugadores con datos
    const allPlayers = await prisma.player.findMany({
      include: {
        unlockedItems: true,
        achievements: true
      }
    });

    // Calcular promedios y totales
    const totalEnemiesDefeated = allPlayers.reduce((sum, p) => sum + p.enemiesDefeated, 0);
    const totalDefeats = allPlayers.reduce((sum, p) => sum + p.defeats, 0);
    const totalPlayTime = allPlayers.reduce((sum, p) => sum + p.playTime, 0);
    const totalItemsUnlocked = allPlayers.reduce((sum, p) => sum + p.unlockedItems.length, 0);
    const totalAchievements = allPlayers.reduce((sum, p) => sum + p.achievements.length, 0);

    // Jugador con más nivel
    const topLevelPlayer = allPlayers.reduce((max, p) => 
      p.level > max.level ? p : max, 
      allPlayers[0] || { username: 'N/A', level: 0 }
    );

    // Jugador con más enemigos derrotados
    const topKillerPlayer = allPlayers.reduce((max, p) => 
      p.enemiesDefeated > max.enemiesDefeated ? p : max, 
      allPlayers[0] || { username: 'N/A', enemiesDefeated: 0 }
    );

    // Jugador con más tiempo jugado
    const topTimePlayer = allPlayers.reduce((max, p) => 
      p.playTime > max.playTime ? p : max, 
      allPlayers[0] || { username: 'N/A', playTime: 0 }
    );

    // Jugador con más logros
    const topAchievementsPlayer = allPlayers.reduce((max, p) => 
      p.achievements.length > max.achievements.length ? p : max, 
      allPlayers[0] || { username: 'N/A', achievements: [] }
    );

    // Distribución de niveles
    const levelDistribution = {
      level1: allPlayers.filter(p => p.level === 1).length,
      level2: allPlayers.filter(p => p.level === 2).length,
      level3: allPlayers.filter(p => p.level === 3).length
    };

    res.json({
      players: {
        total: totalPlayers,
        linked: linkedPlayers,
        unlinked: totalPlayers - linkedPlayers
      },
      averages: {
        level: totalPlayers > 0 ? (allPlayers.reduce((sum, p) => sum + p.level, 0) / totalPlayers).toFixed(2) : 0,
        enemiesDefeated: totalPlayers > 0 ? (totalEnemiesDefeated / totalPlayers).toFixed(2) : 0,
        defeats: totalPlayers > 0 ? (totalDefeats / totalPlayers).toFixed(2) : 0,
        playTime: totalPlayers > 0 ? Math.floor(totalPlayTime / totalPlayers) : 0,
        itemsUnlocked: totalPlayers > 0 ? (totalItemsUnlocked / totalPlayers).toFixed(2) : 0,
        achievements: totalPlayers > 0 ? (totalAchievements / totalPlayers).toFixed(2) : 0
      },
      totals: {
        enemiesDefeated: totalEnemiesDefeated,
        defeats: totalDefeats,
        playTime: totalPlayTime,
        itemsUnlocked: totalItemsUnlocked,
        achievements: totalAchievements
      },
      topPlayers: {
        highestLevel: {
          username: topLevelPlayer.username,
          level: topLevelPlayer.level
        },
        mostKills: {
          username: topKillerPlayer.username,
          enemiesDefeated: topKillerPlayer.enemiesDefeated
        },
        longestPlayTime: {
          username: topTimePlayer.username,
          playTime: topTimePlayer.playTime,
          playTimeFormatted: formatPlayTime(topTimePlayer.playTime)
        },
        mostAchievements: {
          username: topAchievementsPlayer.username,
          achievements: topAchievementsPlayer.achievements.length
        }
      },
      levelDistribution
    });
  } catch (error) {
    console.error('Error al obtener estadísticas globales:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas globales' });
  }
};
