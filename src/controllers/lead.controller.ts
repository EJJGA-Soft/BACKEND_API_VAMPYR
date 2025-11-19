import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * CREAR UN NUEVO LEAD
 * POST /api/leads
 */
export const createLead = async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message, source } = req.body;

    // Validaciones
    if (!name || !email || !message) {
      return res.status(400).json({
        error: 'Los campos nombre, email y mensaje son requeridos'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'El formato del email no es válido'
      });
    }

    // Crear el lead
    const lead = await prisma.lead.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: subject?.trim() || null,
        message: message.trim(),
        source: source || 'landing',
        status: 'new'
      }
    });

    res.status(201).json({
      message: '¡Gracias por contactarnos! Te responderemos pronto.',
      lead: {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        createdAt: lead.createdAt
      }
    });
  } catch (error) {
    console.error('Error al crear lead:', error);
    res.status(500).json({
      error: 'Error al procesar tu solicitud. Por favor intenta de nuevo.'
    });
  }
};

/**
 * OBTENER TODOS LOS LEADS (con filtros opcionales)
 * GET /api/leads?status=new&source=landing
 */
export const getAllLeads = async (req: Request, res: Response) => {
  try {
    const { status, source, page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Construir filtros
    const where: any = {};
    if (status) where.status = status;
    if (source) where.source = source;

    // Obtener leads con paginación
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.lead.count({ where })
    ]);

    res.json({
      leads,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error al obtener leads:', error);
    res.status(500).json({ error: 'Error al obtener leads' });
  }
};

/**
 * OBTENER UN LEAD POR ID
 * GET /api/leads/:id
 */
export const getLeadById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const lead = await prisma.lead.findUnique({
      where: { id }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }

    res.json({ lead });
  } catch (error) {
    console.error('Error al obtener lead:', error);
    res.status(500).json({ error: 'Error al obtener lead' });
  }
};

/**
 * ACTUALIZAR ESTADO DE UN LEAD
 * PATCH /api/leads/:id
 */
export const updateLeadStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['new', 'contacted', 'converted', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}`
      });
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: { status }
    });

    res.json({
      message: 'Estado del lead actualizado',
      lead
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }
    console.error('Error al actualizar lead:', error);
    res.status(500).json({ error: 'Error al actualizar lead' });
  }
};

/**
 * ELIMINAR UN LEAD
 * DELETE /api/leads/:id
 */
export const deleteLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.lead.delete({
      where: { id }
    });

    res.json({ message: 'Lead eliminado exitosamente' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }
    console.error('Error al eliminar lead:', error);
    res.status(500).json({ error: 'Error al eliminar lead' });
  }
};

/**
 * OBTENER ESTADÍSTICAS DE LEADS
 * GET /api/leads/stats
 */
export const getLeadStats = async (req: Request, res: Response) => {
  try {
    const [total, newLeads, contacted, converted, archived, bySource] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { status: 'new' } }),
      prisma.lead.count({ where: { status: 'contacted' } }),
      prisma.lead.count({ where: { status: 'converted' } }),
      prisma.lead.count({ where: { status: 'archived' } }),
      prisma.lead.groupBy({
        by: ['source'],
        _count: true
      })
    ]);

    // Leads recientes (últimos 7 días)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentLeads = await prisma.lead.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo
        }
      }
    });

    res.json({
      total,
      byStatus: {
        new: newLeads,
        contacted,
        converted,
        archived
      },
      bySource: bySource.reduce((acc, item) => {
        acc[item.source] = item._count;
        return acc;
      }, {} as Record<string, number>),
      recentLeads,
      conversionRate: total > 0 ? ((converted / total) * 100).toFixed(2) : '0.00'
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de leads:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};
