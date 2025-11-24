import { Module, forwardRef } from '@nestjs/common';
import { CVGenerationService } from './cv-generation.service';
import { ConversationService } from './conversation.service';
import { StepHandlerService } from './step-handler.service';
import { PictureTestController } from './picture-test.controller';
import { UserModule } from '../user/user.module';
import { OpenAIModule } from '../openai/openai.module';
import { GeminiModule } from '../gemini/gemini.module';
import { PDFModule } from '../pdf/pdf.module';
import { StorageModule } from '../storage/storage.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { AdminModule } from '../admin/admin.module';
import { ElevenLabsModule } from '../elevenlabs/elevenlabs.module';

@Module({
  imports: [
    UserModule,
    OpenAIModule,
    GeminiModule,
    PDFModule,
    StorageModule,
    AdminModule,
    ElevenLabsModule,
    forwardRef(() => WhatsAppModule),
  ],
  controllers: [PictureTestController],
  providers: [CVGenerationService, ConversationService, StepHandlerService],
  exports: [CVGenerationService, ConversationService, StepHandlerService],
})
export class CVGenerationModule {}
