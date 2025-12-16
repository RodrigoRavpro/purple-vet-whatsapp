import { Router, Request, Response } from 'express';
import whatsappService from '../services/whatsappService';
import { logger } from '../config/logger';
import Joi from 'joi';

const router = Router();

// Schema de validação para envio de mensagem
const sendMessageSchema = Joi.object({
  recipientPhone: Joi.string().required()
    .pattern(/^[\d\s\+\-\(\)]+$/)
    .min(10)
    .max(20)
    .messages({
      'string.pattern.base': 'Número de telefone inválido',
      'string.min': 'Número deve ter no mínimo 10 dígitos',
      'string.max': 'Número deve ter no máximo 20 dígitos',
    }),
  recipientName: Joi.string().optional(),
  message: Joi.string().required().min(1).max(4096).messages({
    'string.min': 'Mensagem não pode estar vazia',
    'string.max': 'Mensagem muito longa (máximo 4096 caracteres)',
  }),
  linkUrl: Joi.string().uri().optional().messages({
    'string.uri': 'URL do link inválida',
  }),
  linkPreview: Joi.boolean().optional().default(true),
});

// Schema de validação para envio de template
const sendTemplateSchema = Joi.object({
  recipientPhone: Joi.string().required().pattern(/^[\d\s\+\-\(\)]+$/),
  templateName: Joi.string().required(),
  languageCode: Joi.string().optional().default('pt_BR'),
  parameters: Joi.array().items(Joi.string()).optional(),
});

/**
 * GET /api/whatsapp/status
 * Obter status da configuração do WhatsApp Cloud API
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = whatsappService.getStatus();
    res.json({
      success: true,
      ...status,
    });
  } catch (error: any) {
    logger.error('Error getting WhatsApp status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/whatsapp/send
 * Enviar mensagem de texto (com ou sem link)
 * 
 * Body:
 * - recipientPhone: Número do destinatário (com ou sem código do país)
 * - message: Texto da mensagem
 * - linkUrl: (opcional) URL do link a ser enviado
 * - linkPreview: (opcional) Mostrar preview do link (default: true)
 * - recipientName: (opcional) Nome do destinatário (para logs)
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    // Validar request body
    const { error, value } = sendMessageSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
    }

    const { recipientPhone, recipientName, message, linkUrl, linkPreview } = value;

    logger.info(`Sending WhatsApp message to ${recipientPhone}`, {
      recipientName,
      hasLink: !!linkUrl,
    });

    const result = await whatsappService.sendMessage({
      recipientPhone,
      recipientName,
      message,
      linkUrl,
      linkPreview,
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    logger.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao enviar mensagem',
    });
  }
});

/**
 * POST /api/whatsapp/send-template
 * Enviar mensagem usando template aprovado do WhatsApp
 * (Para notificações e mensagens promocionais)
 * 
 * Body:
 * - recipientPhone: Número do destinatário
 * - templateName: Nome do template aprovado
 * - languageCode: Código do idioma (default: pt_BR)
 * - parameters: Array de parâmetros para substituição no template
 */
router.post('/send-template', async (req: Request, res: Response) => {
  try {
    const { error, value } = sendTemplateSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
    }

    const { recipientPhone, templateName, languageCode, parameters } = value;

    logger.info(`Sending WhatsApp template message to ${recipientPhone}`, {
      templateName,
      languageCode,
    });

    const result = await whatsappService.sendTemplateMessage(
      recipientPhone,
      templateName,
      languageCode,
      parameters
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    logger.error('Error sending template message:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/whatsapp/send-link
 * Atalho para enviar apenas um link (simplificado)
 * 
 * Body:
 * - recipientPhone: Número do destinatário
 * - linkUrl: URL do link
 * - message: (opcional) Mensagem adicional antes do link
 */
router.post('/send-link', async (req: Request, res: Response) => {
  try {
    const { recipientPhone, linkUrl, message } = req.body;

    if (!recipientPhone || !linkUrl) {
      return res.status(400).json({
        success: false,
        error: 'recipientPhone e linkUrl são obrigatórios',
      });
    }

    const messageText = message || 'Acesse o link abaixo:';

    const result = await whatsappService.sendMessage({
      recipientPhone,
      message: messageText,
      linkUrl,
      linkPreview: true,
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    logger.error('Error sending link:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
