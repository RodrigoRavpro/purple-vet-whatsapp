import { Router, Request, Response } from 'express';
import whatsappService from '../services/whatsappService';
import { logger } from '../config/logger';
import QRCode from 'qrcode';

const router = Router();

/**
 * POST /api/whatsapp/initialize
 * Inicializar cliente WhatsApp (gerar QR Code)
 */
router.post('/initialize', async (req: Request, res: Response) => {
  try {
    logger.info('Initializing WhatsApp client');
    await whatsappService.initialize();
    
    res.json({
      success: true,
      message: 'Cliente WhatsApp inicializado. Aguarde a geração do QR Code.',
    });
  } catch (error: any) {
    logger.error('Error initializing WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao inicializar WhatsApp',
    });
  }
});

/**
 * GET /api/whatsapp/status
 * Obter status da conexão WhatsApp
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = whatsappService.getStatus();
    res.json(status);
  } catch (error: any) {
    logger.error('Error getting WhatsApp status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/whatsapp/qr
 * Obter QR Code para autenticação
 */
router.get('/qr', async (req: Request, res: Response) => {
  try {
    const qrData = whatsappService.getQRCode();

    if (!qrData) {
      return res.status(404).json({
        success: false,
        message: 'QR Code não disponível. Inicialize o cliente primeiro.',
      });
    }

    // Gerar imagem do QR Code
    const qrImage = await QRCode.toDataURL(qrData);

    res.json({
      success: true,
      qrCode: qrImage,
      qrData: qrData,
    });
  } catch (error: any) {
    logger.error('Error getting QR code:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/whatsapp/send
 * Enviar mensagem de texto
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { recipientPhone, recipientName, content } = req.body;

    if (!recipientPhone || !content) {
      return res.status(400).json({
        success: false,
        error: 'recipientPhone e content são obrigatórios',
      });
    }

    logger.info(`Sending message to ${recipientPhone}`);

    const result = await whatsappService.sendMessage({
      recipientPhone,
      recipientName,
      content,
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
      error: error.message,
    });
  }
});

/**
 * POST /api/whatsapp/send-media
 * Enviar mensagem com mídia (PDF, imagem, etc)
 */
router.post('/send-media', async (req: Request, res: Response) => {
  try {
    const { recipientPhone, recipientName, content, mediaUrl } = req.body;

    if (!recipientPhone || !content || !mediaUrl) {
      return res.status(400).json({
        success: false,
        error: 'recipientPhone, content e mediaUrl são obrigatórios',
      });
    }

    logger.info(`Sending media message to ${recipientPhone}`);

    const result = await whatsappService.sendMessage({
      recipientPhone,
      recipientName,
      content,
      mediaUrl,
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    logger.error('Error sending media message:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/whatsapp/disconnect
 * Desconectar cliente WhatsApp
 */
router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    logger.info('Disconnecting WhatsApp client');
    await whatsappService.disconnect();
    
    res.json({
      success: true,
      message: 'Cliente WhatsApp desconectado com sucesso',
    });
  } catch (error: any) {
    logger.error('Error disconnecting WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
