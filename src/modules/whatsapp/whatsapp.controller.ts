import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  HttpCode,
} from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { ConversationService } from '../cv-generation/conversation.service';

@Controller('webhook')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private whatsappService: WhatsAppService,
    private conversationService: ConversationService,
  ) {}

  @Post('whatsapp')
  @HttpCode(200)
  async handleIncomingMessage(
    @Body() payload: any,
    @Headers('x-webhook-signature') signature: string,
  ) {
    try {
      this.logger.log('Received WhatsApp webhook');
      this.logger.log(`Payload: ${JSON.stringify(payload, null, 2)}`);

      // Validate webhook signature if needed
      // const isValid = this.whatsappService.validateWebhookSignature(
      //   JSON.stringify(payload),
      //   signature,
      // );
      // if (!isValid) {
      //   this.logger.warn('Invalid webhook signature');
      //   return { status: 'rejected' };
      // }

      // Parse incoming message
      const message = this.whatsappService.parseIncomingMessage(payload);
      if (!message) {
        this.logger.warn('Unable to parse message');
        return { status: 'ignored' };
      }

      // Mark message as read
      if (message.messageId) {
        await this.whatsappService.markMessageAsRead(message.messageId);
      }

      // Check if message contains an image
      if (message.type === 'image' && message.mediaId) {
        this.logger.log('Image message received, processing...');
        await this.conversationService.handleImageMessage(
          message.from,
          message.mediaId,
          message.mediaUrl,
        );
      } else {
        // Process text message through conversation flow
        await this.conversationService.handleUserMessage(
          message.from,
          message.text,
        );
      }

      return { status: 'processed' };
    } catch (error) {
      this.logger.error(`Error handling webhook: ${error.message}`);
      return { status: 'error', message: error.message };
    }
  }

  @Post('status')
  @HttpCode(200)
  async handleStatusUpdate(@Body() payload: any) {
    try {
      this.logger.log('Received status update:', payload);
      // Handle message status updates (sent, delivered, read, failed)
      return { status: 'processed' };
    } catch (error) {
      this.logger.error(`Error handling status update: ${error.message}`);
      return { status: 'error' };
    }
  }

  @Post('test/messages')
  @HttpCode(200)
  async getTestMessages(@Body() payload: { phoneNumber: string }) {
    try {
      this.logger.log(`Retrieving test messages for: ${payload.phoneNumber}`);
      const messages = this.whatsappService.getTestMessages(payload.phoneNumber);
      this.logger.log(`Found ${messages.length} messages`);
      // Clear messages after retrieving them
      this.whatsappService.clearTestMessages(payload.phoneNumber);
      return { messages };
    } catch (error) {
      this.logger.error(`Error getting test messages: ${error.message}`);
      return { messages: [] };
    }
  }
}
