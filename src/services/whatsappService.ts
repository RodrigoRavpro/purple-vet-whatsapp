import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import { logger } from '../config/logger';

export interface WhatsAppStatus {
  isConnected: boolean;
  phoneNumber?: string;
  qrCode?: string;
}

export interface WhatsAppSendMessageRequest {
  recipientPhone: string;
  recipientName?: string;
  content: string;
  mediaUrl?: string;
}

/**
 * WhatsApp Service (Singleton)
 * Gerencia uma única instância do WhatsApp Client
 */
class WhatsAppService {
  private static instance: WhatsAppService;
  private client: Client | null = null;
  private isInitializing: boolean = false;
  private qrCodeData: string | null = null;
  private isReady: boolean = false;
  private phoneNumber: string | null = null;

  private constructor() {
    // Private constructor para garantir singleton
  }

  public static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }

  /**
   * Inicializa o cliente WhatsApp
   */
  public async initialize(): Promise<void> {
    if (this.client && this.isReady) {
      logger.info('WhatsApp client already initialized and ready');
      return;
    }

    if (this.isInitializing) {
      logger.info('WhatsApp client is already initializing');
      return;
    }

    try {
      this.isInitializing = true;
      logger.info('Initializing WhatsApp client...');

      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: '.wwebjs_auth',
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
          ],
        },
      });

      // Evento: QR Code gerado
      this.client.on('qr', (qr: string) => {
        logger.info('QR Code received, scan to authenticate');
        this.qrCodeData = qr;
      });

      // Evento: Autenticado com sucesso
      this.client.on('authenticated', () => {
        logger.info('WhatsApp authenticated successfully!');
        this.qrCodeData = null;
      });

      // Evento: Cliente pronto para usar
      this.client.on('ready', async () => {
        logger.info('WhatsApp client is ready!');
        this.isReady = true;
        this.isInitializing = false;

        const info = this.client?.info;
        if (info) {
          this.phoneNumber = info.wid.user;
          logger.info(`Connected with phone: ${this.phoneNumber}`);
        }
      });

      // Evento: Desconectado
      this.client.on('disconnected', async (reason: string) => {
        logger.warn(`WhatsApp client disconnected: ${reason}`);
        this.isReady = false;
        this.qrCodeData = null;
      });

      // Evento: Erro de autenticação
      this.client.on('auth_failure', (msg: string) => {
        logger.error(`WhatsApp authentication failed: ${msg}`);
        this.isReady = false;
        this.qrCodeData = null;
        this.isInitializing = false;
      });

      await this.client.initialize();
    } catch (error) {
      logger.error('Error initializing WhatsApp client:', error);
      this.isInitializing = false;
      throw error;
    }
  }

  /**
   * Retorna o QR Code para autenticação
   */
  public getQRCode(): string | null {
    return this.qrCodeData;
  }

  /**
   * Retorna o status da conexão WhatsApp
   */
  public getStatus(): WhatsAppStatus {
    return {
      isConnected: this.isReady,
      phoneNumber: this.phoneNumber || undefined,
      qrCode: this.qrCodeData || undefined,
    };
  }

  /**
   * Envia mensagem via WhatsApp
   */
  public async sendMessage(
    request: WhatsAppSendMessageRequest
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.client || !this.isReady) {
      return {
        success: false,
        error: 'WhatsApp não está conectado. Inicialize o cliente primeiro.',
      };
    }

    try {
      const formattedPhone = request.recipientPhone.replace(/\D/g, '');
      logger.info(`Sending message to ${formattedPhone}`);

      // Verificar se o número existe no WhatsApp
      const numberId = await this.client.getNumberId(formattedPhone);

      if (!numberId || !numberId._serialized) {
        logger.error(`Number ${formattedPhone} not registered on WhatsApp`);
        return {
          success: false,
          error: `O número ${request.recipientPhone} não está registrado no WhatsApp.`,
        };
      }

      const validChatId = numberId._serialized;
      let sentMessage;

      // Se tiver mídia
      if (request.mediaUrl) {
        logger.info(`Sending message with media: ${request.mediaUrl}`);
        const media = await MessageMedia.fromUrl(request.mediaUrl);
        sentMessage = await this.client.sendMessage(validChatId, media, {
          caption: request.content,
        });
      } else {
        logger.info(`Sending text message to: ${validChatId}`);
        sentMessage = await this.client.sendMessage(validChatId, request.content);
      }

      logger.info(`Message sent successfully: ${sentMessage.id._serialized}`);

      return {
        success: true,
        messageId: sentMessage.id._serialized,
      };
    } catch (error: any) {
      logger.error('Error sending WhatsApp message:', error);
      return {
        success: false,
        error: error.message || 'Erro ao enviar mensagem',
      };
    }
  }

  /**
   * Desconecta o WhatsApp
   */
  public async disconnect(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      logger.info('Disconnecting WhatsApp client...');
      await this.client.logout();
      await this.client.destroy();
      this.client = null;
      this.isReady = false;
      this.qrCodeData = null;
      this.phoneNumber = null;
      logger.info('WhatsApp client disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting WhatsApp client:', error);
      throw error;
    }
  }
}

export default WhatsAppService.getInstance();
