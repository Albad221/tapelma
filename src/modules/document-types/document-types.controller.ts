import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  Logger,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { DocumentTypesService } from './document-types.service';
import type {
  CreateDocumentTypeDto,
  UpdateDocumentTypeDto,
  CreateFieldGroupDto,
  UpdateFieldGroupDto,
  CreateFormFieldDto,
  UpdateFormFieldDto,
  CreateTemplateDto,
  UpdateTemplateDto,
} from './interfaces/document-type.interface';
import { PDFService } from '../pdf/pdf.service';
import { OpenAIService } from '../openai/openai.service';
import { CV_TEMPLATES } from '../pdf/templates/template-registry';
import * as fs from 'fs/promises';
import * as path from 'path';

@Controller('admin/document-types')
export class DocumentTypesController {
  private readonly logger = new Logger(DocumentTypesController.name);

  constructor(
    private readonly documentTypesService: DocumentTypesService,
    private readonly pdfService: PDFService,
    private readonly openAIService: OpenAIService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCUMENT TYPES
  // ═══════════════════════════════════════════════════════════════════════════

  @Get()
  async getAllDocumentTypes(@Query('includeInactive') includeInactive?: string) {
    return this.documentTypesService.getAllDocumentTypes(includeInactive === 'true');
  }

  @Get(':slugOrId')
  async getDocumentType(@Param('slugOrId') slugOrId: string) {
    return this.documentTypesService.getDocumentTypeWithRelations(slugOrId);
  }

  @Post()
  @HttpCode(201)
  async createDocumentType(@Body() dto: CreateDocumentTypeDto) {
    this.logger.log(`Creating document type: ${dto.name}`);
    return this.documentTypesService.createDocumentType(dto);
  }

  @Put(':id')
  async updateDocumentType(@Param('id') id: string, @Body() dto: UpdateDocumentTypeDto) {
    this.logger.log(`Updating document type: ${id}`);
    return this.documentTypesService.updateDocumentType(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteDocumentType(@Param('id') id: string) {
    this.logger.log(`Deleting document type: ${id}`);
    await this.documentTypesService.deleteDocumentType(id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIELD GROUPS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':documentTypeId/groups')
  async getFieldGroups(@Param('documentTypeId') documentTypeId: string) {
    return this.documentTypesService.getFieldGroupsByDocumentType(documentTypeId);
  }

  @Post(':documentTypeId/groups')
  @HttpCode(201)
  async createFieldGroup(
    @Param('documentTypeId') documentTypeId: string,
    @Body() dto: Omit<CreateFieldGroupDto, 'documentTypeId'>,
  ) {
    this.logger.log(`Creating field group for document type: ${documentTypeId}`);
    return this.documentTypesService.createFieldGroup({
      ...dto,
      documentTypeId,
    });
  }

  @Put('groups/:id')
  async updateFieldGroup(@Param('id') id: string, @Body() dto: UpdateFieldGroupDto) {
    this.logger.log(`Updating field group: ${id}`);
    return this.documentTypesService.updateFieldGroup(id, dto);
  }

  @Delete('groups/:id')
  @HttpCode(204)
  async deleteFieldGroup(@Param('id') id: string) {
    this.logger.log(`Deleting field group: ${id}`);
    await this.documentTypesService.deleteFieldGroup(id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FORM FIELDS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('groups/:groupId/fields')
  async getFormFields(@Param('groupId') groupId: string) {
    return this.documentTypesService.getFieldsByGroup(groupId);
  }

  @Post('groups/:groupId/fields')
  @HttpCode(201)
  async createFormField(
    @Param('groupId') groupId: string,
    @Body() dto: Omit<CreateFormFieldDto, 'fieldGroupId'>,
  ) {
    this.logger.log(`Creating form field for group: ${groupId}`);
    return this.documentTypesService.createFormField({
      ...dto,
      fieldGroupId: groupId,
    });
  }

  @Put('fields/:id')
  async updateFormField(@Param('id') id: string, @Body() dto: UpdateFormFieldDto) {
    this.logger.log(`Updating form field: ${id}`);
    return this.documentTypesService.updateFormField(id, dto);
  }

  @Delete('fields/:id')
  @HttpCode(204)
  async deleteFormField(@Param('id') id: string) {
    this.logger.log(`Deleting form field: ${id}`);
    await this.documentTypesService.deleteFormField(id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEMPLATES
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':documentTypeId/templates')
  async getTemplates(
    @Param('documentTypeId') documentTypeId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.documentTypesService.getTemplatesByDocumentType(
      documentTypeId,
      includeInactive === 'true',
    );
  }

  @Get('templates/:id')
  async getTemplate(@Param('id') id: string) {
    return this.documentTypesService.getTemplateById(id);
  }

  @Post(':documentTypeId/templates')
  @HttpCode(201)
  async createTemplate(
    @Param('documentTypeId') documentTypeId: string,
    @Body() dto: Omit<CreateTemplateDto, 'documentTypeId'>,
  ) {
    this.logger.log(`Creating template for document type: ${documentTypeId}`);
    return this.documentTypesService.createTemplate({
      ...dto,
      documentTypeId,
    });
  }

  @Put('templates/:id')
  async updateTemplate(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    this.logger.log(`Updating template: ${id}`);
    return this.documentTypesService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  @HttpCode(204)
  async deleteTemplate(@Param('id') id: string) {
    this.logger.log(`Deleting template: ${id}`);
    await this.documentTypesService.deleteTemplate(id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEMPLATE PREVIEW
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('templates/:id/preview')
  async previewTemplate(
    @Param('id') id: string,
    @Body() sampleData: Record<string, any>,
    @Res() res: Response,
  ) {
    this.logger.log(`Generating preview for template: ${id}`);
    try {
      const pdfBuffer = await this.pdfService.generateFromDatabaseTemplate(id, sampleData || {});

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="preview-${id}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });

      res.send(pdfBuffer);
    } catch (error) {
      this.logger.error(`Preview generation failed: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // IMAGE TO TEMPLATE CONVERSION
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('convert-image-to-template')
  async convertImageToTemplate(@Body() body: { imageBase64: string }) {
    this.logger.log('Converting image to template...');

    if (!body.imageBase64) {
      return {
        success: false,
        error: 'No image provided',
      };
    }

    try {
      const result = await this.openAIService.convertImageToTemplate(body.imageBase64);
      return result;
    } catch (error) {
      this.logger.error(`Image conversion failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MIGRATION UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('migrate-cv-templates')
  async migrateCVTemplates() {
    this.logger.log('Starting CV templates migration...');

    try {
      // Find or create CV document type
      let cvDocType = await this.documentTypesService.getDocumentTypeBySlug('cv');

      if (!cvDocType) {
        this.logger.log('CV document type not found, creating...');
        cvDocType = await this.documentTypesService.createDocumentType({
          slug: 'cv',
          name: 'Resume / CV',
          nameFr: 'CV / Curriculum Vitae',
          description: 'Professional resume for job applications',
          icon: 'ri-file-text-line',
          defaultOutputFormat: 'pdf',
          pageSize: 'A4',
          orientation: 'portrait',
          welcomeMessage: "Great! Let's create your professional CV. I'll guide you through each section.",
          completionMessage: "Your CV is ready! Here's your professional document.",
        });
      }

      // Read templates from filesystem and insert to database
      const templatesPath = path.join(__dirname, '..', 'pdf', 'templates');
      const migratedTemplates: string[] = [];

      for (const [templateId, meta] of Object.entries(CV_TEMPLATES)) {
        try {
          // Check if template already exists
          const existing = await this.documentTypesService.getTemplatesByDocumentType(cvDocType.id, true);
          if (existing.some(t => t.slug === templateId)) {
            this.logger.log(`Template ${templateId} already exists, skipping...`);
            continue;
          }

          // Read template file
          const templatePath = path.join(templatesPath, meta.fileName);
          const templateHtml = await fs.readFile(templatePath, 'utf-8');

          // Create template in database
          await this.documentTypesService.createTemplate({
            documentTypeId: cvDocType.id,
            slug: templateId,
            name: meta.name,
            description: meta.description,
            category: meta.category,
            templateHtml: templateHtml,
            primaryColor: meta.colors.primary,
            secondaryColor: meta.colors.secondary,
            accentColor: meta.colors.accent,
            bestFor: meta.bestFor,
            features: meta.features,
            isDefault: templateId === 'modern',
          } as any);

          migratedTemplates.push(templateId);
          this.logger.log(`Migrated template: ${templateId}`);
        } catch (error) {
          this.logger.warn(`Failed to migrate template ${templateId}: ${error.message}`);
        }
      }

      return {
        success: true,
        message: `Migration complete`,
        migratedTemplates,
        cvDocTypeId: cvDocType.id,
      };
    } catch (error) {
      this.logger.error(`Migration failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
