import axios from 'axios';
import { logger } from '../config/logger';

export interface WhatsAppSendMessageRequest {
  recipientPhone: string;
  recipientName?: string;
  message: string;
  linkUrl?: string;
  linkPreview?: boolean;
}

export interface WhatsAppStatus {
  isConfigured: boolean;
  phoneNumberId: string;
  apiVersion: string;
}

/**
 * WhatsApp Cloud API Service (Singleton)
 * Usa a API oficial do WhatsApp Business para enviar mensagens
 */
class WhatsAppService {
  private static instance: WhatsAppService;
  private apiUrl: string;
  private accessToken: string;
  private phoneNumberId: string;
  private businessAccountId: string;

  private constructor() {
    this.apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';

    if (!this.accessToken || !this.phoneNumberId) {
      logger.warn('WhatsApp Cloud API not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID');
    } else {
      logger.info('WhatsApp Cloud API configured successfully');
    }
  }

  public static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }

  /**
   * Verifica se o serviço está configurado
   */
  private isConfigured(): boolean {
    return !!(this.accessToken && this.phoneNumberId);
  }

  /**
   * Retorna o status da configuração
   */
  public getStatus(): WhatsAppStatus {
    return {
      isConfigured: this.isConfigured(),
      phoneNumberId: this.phoneNumberId ? this.phoneNumberId.substring(0, 8) + '...' : 'not_set',
      apiVersion: 'v18.0',
    };
  }

  /**
   * Formata número de telefone para WhatsApp (remove caracteres especiais)
   */
  private formatPhoneNumber(phone: string): string {
    // Remove todos os caracteres não numéricos
    let formatted = phone.replace(/\D/g, '');
    
    // Se começar com 0, remove
    if (formatted.startsWith('0')) {
      formatted = formatted.substring(1);
    }
    
    // Se não tiver código do país, adiciona Brasil (55)
    if (formatted.length <= 11) {
      formatted = '55' + formatted;
    }
    
    return formatted;
  }

  /**
   * Envia mensagem de texto via WhatsApp Cloud API
   */
  public async sendMessage(
    request: WhatsAppSendMessageRequest
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'WhatsApp Cloud API não está configurada. Verifique as variáveis de ambiente.',
      };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(request.recipientPhone);
      logger.info(`Sending message to ${formattedPhone} via WhatsApp Cloud API`);

      const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;

      // Construir mensagem com link
      let messageText = request.message;
      if (request.linkUrl) {
        messageText += `\n\n🔗 ${request.linkUrl}`;
      }

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: {
          preview_url: request.linkPreview !== false, // Default true para mostrar preview do link
          body: messageText,
        },
      };

      logger.debug('WhatsApp API Request:', { url, payload });

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      logger.info(`WhatsApp message sent successfully: ${response.data.messages[0].id}`);

      return {
        success: true,
        messageId: response.data.messages[0].id,
      };
    } catch (error: any) {
      logger.error('Error sending WhatsApp message:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      let errorMessage = 'Erro ao enviar mensagem';
      
      if (error.response?.data?.error) {
        const whatsappError = error.response.data.error;
        errorMessage = `WhatsApp API Error: ${whatsappError.message} (Code: ${whatsappError.code})`;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Envia mensagem com template (para notificações aprovadas)
   */
  public async sendTemplateMessage(
    recipientPhone: string,
    templateName: string,
    languageCode: string = 'pt_BR',
    parameters?: string[]
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'WhatsApp Cloud API não está configurada.',
      };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(recipientPhone);
      const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;

      const payload: any = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
        },
      };

      // Adicionar parâmetros se existirem
      if (parameters && parameters.length > 0) {
        payload.template.components = [
          {
            type: 'body',
            parameters: parameters.map(param => ({
              type: 'text',
              text: param,
            })),
          },
        ];
      }

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      logger.info(`WhatsApp template message sent: ${response.data.messages[0].id}`);

      return {
        success: true,
        messageId: response.data.messages[0].id,
      };
    } catch (error: any) {
      logger.error('Error sending template message:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }
}

export default WhatsAppService.getInstance();
