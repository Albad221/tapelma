import { Module } from '@nestjs/common';
import { DocumentTypesService } from './document-types.service';
import { DocumentTypesController } from './document-types.controller';
import { PDFModule } from '../pdf/pdf.module';
import { OpenAIModule } from '../openai/openai.module';

@Module({
  imports: [PDFModule, OpenAIModule],
  controllers: [DocumentTypesController],
  providers: [DocumentTypesService],
  exports: [DocumentTypesService],
})
export class DocumentTypesModule {}
