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
import { UserService } from '../user/user.service';

@Controller('webhook')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);
  // Cache to track processed message IDs (prevents duplicate processing)
  private processedMessages: Map<string, number> = new Map();
  // Cache to track messages being processed (prevents concurrent processing)
  private processingMessages: Set<string> = new Set();
  // Rate limiter: track last response time per user (prevents spam)
  private lastResponseTime: Map<string, number> = new Map();
  // Minimum time between responses to same user (5 seconds)
  private readonly MIN_RESPONSE_INTERVAL = 5000;
  // Cleanup old entries every 5 minutes
  private readonly MESSAGE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private whatsappService: WhatsAppService,
    private conversationService: ConversationService,
    private userService: UserService,
  ) {
    // Cleanup old message IDs periodically
    setInterval(() => this.cleanupMessageCache(), this.MESSAGE_CACHE_TTL);
  }

  private cleanupMessageCache(): void {
    const now = Date.now();
    for (const [messageId, timestamp] of this.processedMessages.entries()) {
      if (now - timestamp > this.MESSAGE_CACHE_TTL) {
        this.processedMessages.delete(messageId);
      }
    }
    // Also cleanup rate limiter entries
    for (const [userId, timestamp] of this.lastResponseTime.entries()) {
      if (now - timestamp > this.MESSAGE_CACHE_TTL) {
        this.lastResponseTime.delete(userId);
      }
    }
  }

  @Post('whatsapp')
  @HttpCode(200)
  async handleIncomingMessage(
    @Body() payload: any,
    @Headers('x-webhook-signature') signature: string,
  ) {
    try {
      this.logger.log('Received WhatsApp webhook');
      this.logger.log(`Payload: ${JSON.stringify(payload, null, 2)}`);

      // Parse incoming message
      const message = this.whatsappService.parseIncomingMessage(payload);
      if (!message) {
        this.logger.warn('Unable to parse message');
        return { status: 'ignored' };
      }

      // Generate a unique key for deduplication (messageId + text + from)
      const dedupeKey = message.messageId || `${message.from}-${message.text}-${message.timestamp}`;

      // Check if this message was already processed (duplicate webhook)
      if (this.processedMessages.has(dedupeKey)) {
        this.logger.warn(`Duplicate message detected, skipping: ${dedupeKey}`);
        return { status: 'duplicate' };
      }

      // Check if this message is currently being processed (concurrent request)
      if (this.processingMessages.has(dedupeKey)) {
        this.logger.warn(`Message already being processed, skipping: ${dedupeKey}`);
        return { status: 'processing' };
      }

      // Rate limiting: check if we responded to this user recently (increased to 5 seconds)
      const lastResponse = this.lastResponseTime.get(message.from);
      const now = Date.now();
      if (lastResponse && (now - lastResponse) < this.MIN_RESPONSE_INTERVAL) {
        this.logger.warn(`Rate limited: User ${message.from} - last response ${now - lastResponse}ms ago`);
        return { status: 'rate_limited' };
      }

      // Per-user lock: prevent processing multiple messages from same user concurrently
      const userLockKey = `user-${message.from}`;
      if (this.processingMessages.has(userLockKey)) {
        this.logger.warn(`User ${message.from} already has a message being processed, skipping`);
        return { status: 'user_locked' };
      }

      // Mark as processing (both message-level and user-level)
      this.processingMessages.add(dedupeKey);
      this.processingMessages.add(userLockKey);

      try {
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

        // Mark as processed with timestamp
        this.processedMessages.set(dedupeKey, Date.now());
        // Update rate limiter
        this.lastResponseTime.set(message.from, Date.now());

        return { status: 'processed' };
      } finally {
        // Remove from processing sets (both message-level and user-level)
        this.processingMessages.delete(dedupeKey);
        this.processingMessages.delete(`user-${message.from}`);
      }
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

  @Post('reset')
  @HttpCode(200)
  async resetConversation(@Body() payload: { phoneNumber: string }) {
    try {
      this.logger.log(`Resetting conversation for: ${payload.phoneNumber}`);
      const result = await this.userService.resetUserConversation(payload.phoneNumber);
      return result;
    } catch (error) {
      this.logger.error(`Error resetting conversation: ${error.message}`);
      return { success: false, message: error.message };
    }
  }
}
