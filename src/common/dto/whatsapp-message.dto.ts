import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class WhatsAppMessageDto {
  @IsString()
  @IsNotEmpty()
  from: string;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsString()
  @IsOptional()
  messageId?: string;

  @IsString()
  @IsOptional()
  messageType?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}

export class SendTemplateMessageDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  templateName: string;

  @IsObject()
  @IsOptional()
  parameters?: Record<string, any>;
}

export class SendMediaMessageDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  mediaUrl: string;

  @IsString()
  @IsOptional()
  caption?: string;

  @IsString()
  @IsNotEmpty()
  mediaType: 'image' | 'document' | 'video' | 'audio';
}
