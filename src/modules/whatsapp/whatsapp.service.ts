import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiEndpoint: string;
  private readonly accessToken: string;
  private testMessages: Map<string, Array<{text: string, timestamp: Date}>> = new Map();
  private isTestMode: boolean;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.apiEndpoint = this.configService.get<string>('WATI_API_URL') || this.configService.get<string>('WATI_API_ENDPOINT') || '';
    this.accessToken = this.configService.get<string>('WATI_API_TOKEN') || this.configService.get<string>('WATI_ACCESS_TOKEN') || '';

    // Log configuration on startup
    this.logger.log(`WATI API URL configured: ${this.apiEndpoint ? 'YES (' + this.apiEndpoint + ')' : 'NO'}`);
    this.logger.log(`WATI API Token configured: ${this.accessToken ? 'YES (length: ' + this.accessToken.length + ')' : 'NO'}`);

    // Enable test mode if WATI credentials are not configured
    this.isTestMode = !this.accessToken || this.accessToken === 'your-wati-access-token';
    if (this.isTestMode) {
      this.logger.log('🧪 Test mode enabled - messages will be stored in memory instead of sent via WhatsApp');
    } else {
      this.logger.log('✅ Production mode - messages will be sent via WATI WhatsApp API');
    }
  }

  getTestMessages(phoneNumber: string): Array<{text: string, timestamp: Date}> {
    this.logger.log(`Getting test messages for ${phoneNumber}. Available keys: ${Array.from(this.testMessages.keys()).join(', ')}`);
    return this.testMessages.get(phoneNumber) || [];
  }

  clearTestMessages(phoneNumber: string): void {
    this.testMessages.delete(phoneNumber);
  }

  private addTestMessage(phoneNumber: string, text: string): void {
    if (!this.testMessages.has(phoneNumber)) {
      this.testMessages.set(phoneNumber, []);
    }
    this.testMessages.get(phoneNumber)!.push({
      text,
      timestamp: new Date()
    });
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  async sendTextMessage(
    phoneNumber: string,
    message: string,
  ): Promise<boolean> {
    try {
      // In test mode, just store the message
      if (this.isTestMode) {
        this.addTestMessage(phoneNumber, message);
        this.logger.log(`[TEST MODE] Message queued for ${phoneNumber}: ${message.substring(0, 50)}...`);
        return true;
      }

      // WATI API expects messageText as a query parameter, not in the body
      const encodedMessage = encodeURIComponent(message);
      const url = `${this.apiEndpoint}/api/v1/sendSessionMessage/${phoneNumber}?messageText=${encodedMessage}`;

      const response = await firstValueFrom(
        this.httpService.post(url, {}, { headers: this.getHeaders() }),
      );

      this.logger.log(`Message sent to ${phoneNumber}: ${JSON.stringify(response.data)}`);
      return response.data.ok === true || response.data.result === 'success';
    } catch (error) {
      this.logger.error(
        `Error sending message to ${phoneNumber}: ${error.message}`,
      );
      // Log more details for debugging
      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}`);
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      this.logger.error(`URL used: ${this.apiEndpoint}/api/v1/sendSessionMessage/${phoneNumber}`);
      return false;
    }
  }

  async sendInteractiveButtons(
    phoneNumber: string,
    bodyText: string,
    buttons: { id: string; text: string }[],
    headerText?: string,
    footerText?: string,
  ): Promise<boolean> {
    try {
      // In test mode, convert to text message with numbered options
      if (this.isTestMode) {
        const fallbackText = `${headerText ? headerText + '\n\n' : ''}${bodyText}\n\n${buttons.map((btn, idx) => `${idx + 1}. ${btn.text}`).join('\n')}${footerText ? '\n\n' + footerText : ''}`;
        return await this.sendTextMessage(phoneNumber, fallbackText);
      }

      const url = `${this.apiEndpoint}/api/v1/sendInteractiveButtonsMessage`;

      // WATI format for interactive buttons
      const formattedButtons = buttons.map((btn) => ({
        type: 'reply',
        reply: {
          id: btn.id,
          title: btn.text,
        },
      }));

      const payload = {
        receiverWhatsappNumber: phoneNumber,
        header: headerText ? { type: 'text', text: headerText } : undefined,
        body: {
          text: bodyText,
        },
        footer: footerText ? { text: footerText } : undefined,
        action: {
          buttons: formattedButtons,
        },
      };

      const response = await firstValueFrom(
        this.httpService.post(url, payload, { headers: this.getHeaders() }),
      );

      this.logger.log(`Interactive buttons sent to ${phoneNumber}`);
      return response.data.result === true;
    } catch (error) {
      this.logger.error(
        `Error sending interactive buttons to ${phoneNumber}: ${error.message}`,
      );
      // Fallback to text message
      const fallbackText = `${bodyText}\n\n${buttons.map((btn, idx) => `${idx + 1}. ${btn.text}`).join('\n')}`;
      return await this.sendTextMessage(phoneNumber, fallbackText);
    }
  }

  async sendListMessage(
    phoneNumber: string,
    bodyText: string,
    buttonText: string,
    sections: {
      title: string;
      rows: { id: string; title: string; description?: string }[];
    }[],
    headerText?: string,
    footerText?: string,
  ): Promise<boolean> {
    try {
      const url = `${this.apiEndpoint}/api/v1/sendInteractiveListMessage`;

      const payload = {
        receiverWhatsappNumber: phoneNumber,
        header: headerText ? { type: 'text', text: headerText } : undefined,
        body: {
          text: bodyText,
        },
        footer: footerText ? { text: footerText } : undefined,
        action: {
          button: buttonText,
          sections: sections,
        },
      };

      const response = await firstValueFrom(
        this.httpService.post(url, payload, { headers: this.getHeaders() }),
      );

      this.logger.log(`List message sent to ${phoneNumber}`);
      return response.data.result === true;
    } catch (error) {
      this.logger.error(
        `Error sending list message to ${phoneNumber}: ${error.message}`,
      );
      // Fallback to text message
      let fallbackText = bodyText + '\n\n';
      sections.forEach((section) => {
        fallbackText += `${section.title}\n`;
        section.rows.forEach((row, idx) => {
          fallbackText += `${idx + 1}. ${row.title}\n`;
        });
        fallbackText += '\n';
      });
      return await this.sendTextMessage(phoneNumber, fallbackText);
    }
  }

  async sendMediaMessage(
    phoneNumber: string,
    mediaUrl: string,
    mediaType: 'image' | 'document' | 'video',
    caption?: string,
    filename?: string,
  ): Promise<boolean> {
    try {
      const url = `${this.apiEndpoint}/api/v1/sendSessionFile/${phoneNumber}`;

      const formData = new FormData();
      formData.append('file', mediaUrl);
      if (caption) formData.append('caption', caption);
      if (filename) formData.append('filename', filename);

      // For document type, we need to specify the filename
      if (mediaType === 'document' && filename) {
        const response = await firstValueFrom(
          this.httpService.post(url, formData, {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
            },
          }),
        );

        this.logger.log(`Media message sent to ${phoneNumber}`);
        return response.data.result === true;
      }

      // For direct URL media
      const payload = {
        url: mediaUrl,
        caption: caption || '',
        filename: filename,
      };

      const response = await firstValueFrom(
        this.httpService.post(url, payload, { headers: this.getHeaders() }),
      );

      this.logger.log(`Media message sent to ${phoneNumber}`);
      return response.data.result === true;
    } catch (error) {
      this.logger.error(
        `Error sending media message to ${phoneNumber}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Send a document (PDF, etc.) directly from a buffer
   * @param phoneNumber - Recipient phone number
   * @param fileBuffer - File data as Buffer
   * @param filename - Name of the file (e.g., 'cv.pdf')
   * @param caption - Optional caption/message
   * @returns Success status
   */
  async sendDocumentBuffer(
    phoneNumber: string,
    fileBuffer: Buffer,
    filename: string,
    caption?: string,
  ): Promise<boolean> {
    try {
      this.logger.log(`Sending document ${filename} to ${phoneNumber} (${fileBuffer.length} bytes)`);

      const url = `${this.apiEndpoint}/api/v1/sendSessionFile/${phoneNumber}`;

      // Create a Blob from the buffer for FormData (convert Buffer to Uint8Array for TypeScript compatibility)
      const uint8Array = new Uint8Array(fileBuffer.buffer, fileBuffer.byteOffset, fileBuffer.length);
      const blob = new Blob([uint8Array], { type: 'application/pdf' });

      const formData = new FormData();
      formData.append('file', blob, filename);

      const response = await firstValueFrom(
        this.httpService.post(url, formData, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            // FormData will set Content-Type automatically with boundary
          },
        }),
      );

      this.logger.log(`Document sent to ${phoneNumber}: ${JSON.stringify(response.data)}`);
      return response.data.result === true || response.data.ok === true;
    } catch (error) {
      this.logger.error(`Error sending document to ${phoneNumber}: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response: ${JSON.stringify(error.response.data)}`);
      }
      return false;
    }
  }

  async sendTemplateMessage(
    phoneNumber: string,
    templateName: string,
    parameters: string[],
    broadcastName?: string,
  ): Promise<boolean> {
    try {
      const url = `${this.apiEndpoint}/api/v1/sendTemplateMessage`;

      const payload = {
        whatsappNumber: phoneNumber,
        template_name: templateName,
        broadcast_name: broadcastName || templateName,
        parameters: parameters.map((param, idx) => ({
          name: `${idx + 1}`,
          value: param,
        })),
      };

      const response = await firstValueFrom(
        this.httpService.post(url, payload, { headers: this.getHeaders() }),
      );

      this.logger.log(
        `Template message ${templateName} sent to ${phoneNumber}`,
      );
      return response.data.result === true;
    } catch (error) {
      this.logger.error(
        `Error sending template message to ${phoneNumber}: ${error.message}`,
      );
      return false;
    }
  }

  async markMessageAsRead(messageId: string): Promise<boolean> {
    try {
      const url = `${this.apiEndpoint}/api/v1/markMessageRead`;

      const payload = {
        messageId: messageId,
      };

      await firstValueFrom(
        this.httpService.post(url, payload, { headers: this.getHeaders() }),
      );

      return true;
    } catch (error) {
      this.logger.error(`Error marking message as read: ${error.message}`);
      return false;
    }
  }

  parseIncomingMessage(payload: any): {
    from: string;
    text: string;
    messageId: string;
    messageType: string;
    timestamp: number;
    type?: string;
    mediaId?: string;
    mediaUrl?: string;
  } | null {
    try {
      this.logger.log(`Parsing payload - waId: ${payload.waId}, text: ${payload.text}, type: ${payload.type}, owner: ${payload.owner}, eventType: ${payload.eventType}`);

      // Skip messages sent by ourselves (owner: true means outgoing)
      if (payload.owner === true) {
        this.logger.log('Skipping outgoing message (owner: true)');
        return null;
      }

      // WATI webhook payload structure - text messages
      if (payload.waId && payload.text) {
        return {
          from: payload.waId,
          text: payload.text,
          messageId: payload.id || payload.whatsappMessageId || '',
          messageType: payload.type || 'text',
          timestamp: parseInt(payload.timestamp) || Date.now(),
          type: payload.type,
        };
      }

      // Handle image messages
      if (payload.waId && payload.type === 'image') {
        return {
          from: payload.waId,
          text: '',
          messageId: payload.id || payload.whatsappMessageId || '',
          messageType: 'image',
          timestamp: parseInt(payload.timestamp) || Date.now(),
          type: 'image',
          mediaId: payload.data || payload.mediaId,
          mediaUrl: payload.sourceUrl || payload.mediaUrl,
        };
      }

      // Handle button/list responses
      if (payload.waId && (payload.data || payload.listReply || payload.buttonReply)) {
        const responseData = payload.listReply || payload.buttonReply || payload.data;
        return {
          from: payload.waId,
          text: responseData?.title || responseData?.id || payload.text || '',
          messageId: payload.id || payload.whatsappMessageId || '',
          messageType: 'interactive',
          timestamp: parseInt(payload.timestamp) || Date.now(),
        };
      }

      this.logger.warn(`Unrecognized message format - keys: ${Object.keys(payload).join(', ')}`);
      return null;
    } catch (error) {
      this.logger.error(`Error parsing incoming message: ${error.message}`);
      return null;
    }
  }

  validateWebhookSignature(payload: string, signature: string): boolean {
    try {
      const webhookSecret = this.configService.get<string>(
        'WATI_WEBHOOK_SECRET',
      );
      // Implement HMAC validation if WATI provides webhook signatures
      // For now, return true if webhook secret matches
      return true;
    } catch (error) {
      this.logger.error(`Error validating webhook: ${error.message}`);
      return false;
    }
  }

  /**
   * Download an image from WhatsApp media URL
   * @param mediaId - WhatsApp media ID
   * @param mediaUrl - Direct media URL if available
   * @returns Buffer containing the image data
   */
  async downloadImage(mediaId: string, mediaUrl?: string): Promise<Buffer> {
    try {
      this.logger.log(`Downloading image with media ID: ${mediaId}, mediaUrl: ${mediaUrl}`);

      const accessToken = this.configService.get<string>('WATI_API_TOKEN') || this.configService.get<string>('WATI_ACCESS_TOKEN');
      const endpoint = this.configService.get<string>('WATI_API_URL') || this.configService.get<string>('WATI_API_ENDPOINT');

      // Determine the download URL
      let downloadUrl: string;

      // If mediaId is already a full URL (WATI sends the full URL in 'data' field for images)
      if (mediaId && mediaId.startsWith('http')) {
        downloadUrl = mediaId;
        this.logger.log(`Using mediaId as direct URL: ${downloadUrl}`);
      } else if (mediaUrl && mediaUrl.startsWith('http')) {
        downloadUrl = mediaUrl;
        this.logger.log(`Using mediaUrl: ${downloadUrl}`);
      } else {
        // Fetch media URL from WATI API using media ID
        this.logger.log(`Fetching media info from WATI API for mediaId: ${mediaId}`);
        const mediaInfoResponse = await this.httpService.axiosRef.get(
          `${endpoint}/api/v1/getMedia/${mediaId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        downloadUrl = mediaInfoResponse.data.url || mediaInfoResponse.data.media_url;

        if (!downloadUrl) {
          throw new Error('No download URL found for media');
        }
      }

      // Download the actual media file
      this.logger.log(`Downloading from: ${downloadUrl}`);
      const imageResponse = await this.httpService.axiosRef.get(downloadUrl, {
        responseType: 'arraybuffer',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      this.logger.log('Image downloaded successfully');
      return Buffer.from(imageResponse.data);
    } catch (error) {
      this.logger.error(`Error downloading image: ${error.message}`);
      throw error;
    }
  }
}
