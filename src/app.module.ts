import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { OpenAIModule } from './modules/openai/openai.module';
import { PDFModule } from './modules/pdf/pdf.module';
import { StorageModule } from './modules/storage/storage.module';
import { CVGenerationModule } from './modules/cv-generation/cv-generation.module';
import { AdminModule } from './modules/admin/admin.module';
import { GeminiModule } from './modules/gemini/gemini.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    UserModule,
    WhatsAppModule,
    OpenAIModule,
    GeminiModule,
    PDFModule,
    StorageModule,
    CVGenerationModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
