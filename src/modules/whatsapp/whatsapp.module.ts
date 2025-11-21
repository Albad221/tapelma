import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { CVGenerationModule } from '../cv-generation/cv-generation.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [HttpModule, forwardRef(() => CVGenerationModule), UserModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
