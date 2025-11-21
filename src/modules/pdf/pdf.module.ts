import { Module } from '@nestjs/common';
import { PDFService } from './pdf.service';
import { PDFController } from './pdf.controller';

@Module({
  controllers: [PDFController],
  providers: [PDFService],
  exports: [PDFService],
})
export class PDFModule {}
