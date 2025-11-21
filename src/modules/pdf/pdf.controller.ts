import { Controller, Get, Query, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PDFService } from './pdf.service';
import { TemplateMetadata } from './templates/template-registry';

@Controller('templates')
export class PDFController {
  constructor(private readonly pdfService: PDFService) {}

  @Get()
  getAllTemplates(): TemplateMetadata[] {
    return this.pdfService.getAvailableTemplates();
  }

  @Get('recommend')
  getRecommendedTemplates(
    @Query('profession') profession?: string,
  ): TemplateMetadata[] {
    return this.pdfService.getRecommendedTemplates(profession);
  }

  @Get(':id/preview')
  async previewTemplate(
    @Param('id') templateId: string,
    @Res() res: Response,
  ): Promise<void> {
    const pdfBuffer = await this.pdfService.generatePreviewPDF(templateId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${templateId}-preview.pdf"`);
    res.send(pdfBuffer);
  }

  @Get(':id')
  getTemplateById(@Param('id') id: string): TemplateMetadata | undefined {
    return this.pdfService.getTemplateMetadata(id);
  }
}
