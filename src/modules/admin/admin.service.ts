import { Injectable, Logger } from '@nestjs/common';
import { CVConfigDto, CVFieldConfig, TemplateConfig } from './dto/cv-config.dto';
import { getAllTemplates } from '../pdf/templates/template-registry';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private cvConfig: CVConfigDto;

  constructor() {
    // Initialize with default configuration
    this.cvConfig = this.getDefaultConfig();
  }

  private getDefaultConfig(): CVConfigDto {
    // Get all available templates from template registry
    const allTemplates = getAllTemplates();

    return {
      fields: [
        {
          fieldName: 'personalInfo',
          isMandatory: true,
          shouldProposeContent: false,
          label: 'Personal Information',
          description: 'Name, email, phone, location',
        },
        {
          fieldName: 'workExperience',
          isMandatory: false,
          shouldProposeContent: true, // Bot proposes to optimize job descriptions
          label: 'Work Experience',
          description: 'Professional work history',
        },
        {
          fieldName: 'education',
          isMandatory: false,
          shouldProposeContent: false,
          label: 'Education',
          description: 'Academic background and degrees',
        },
        {
          fieldName: 'skills',
          isMandatory: false,
          shouldProposeContent: true, // Bot can propose skills based on job
          label: 'Skills',
          description: 'Technical and soft skills',
        },
        {
          fieldName: 'languages',
          isMandatory: false,
          shouldProposeContent: false,
          label: 'Languages',
          description: 'Languages known',
        },
        {
          fieldName: 'professionalSummary',
          isMandatory: false,
          shouldProposeContent: true, // Bot generates and proposes summary
          label: 'Professional Summary',
          description: 'Brief professional profile summary',
        },
        {
          fieldName: 'certifications',
          isMandatory: false,
          shouldProposeContent: false,
          label: 'Certifications',
          description: 'Professional certifications',
        },
      ],
      templates: allTemplates.map(template => ({
        templateId: template.id,
        templateName: template.name,
        isActive: true,
        description: template.description,
        category: template.category,
      })),
    };
  }

  getConfig(): CVConfigDto {
    return this.cvConfig;
  }

  updateConfig(config: CVConfigDto): CVConfigDto {
    this.logger.log('Updating CV configuration');
    this.cvConfig = {
      ...config,
      updatedBy: config.updatedBy || 'admin',
    };
    return this.cvConfig;
  }

  getMandatoryFields(): string[] {
    return this.cvConfig.fields
      .filter(field => field.isMandatory)
      .map(field => field.fieldName);
  }

  getActiveTemplates(): TemplateConfig[] {
    return this.cvConfig.templates.filter(template => template.isActive);
  }

  isFieldMandatory(fieldName: string): boolean {
    const field = this.cvConfig.fields.find(f => f.fieldName === fieldName);
    return field ? field.isMandatory : false;
  }

  shouldProposeContent(fieldName: string): boolean {
    const field = this.cvConfig.fields.find(f => f.fieldName === fieldName);
    return field ? !!field.shouldProposeContent : false;
  }

  getFieldsWithContentProposal(): string[] {
    return this.cvConfig.fields
      .filter(field => field.shouldProposeContent)
      .map(field => field.fieldName);
  }

  resetToDefaults(): CVConfigDto {
    this.logger.log('Resetting CV configuration to defaults');
    this.cvConfig = this.getDefaultConfig();
    return this.cvConfig;
  }
}
