import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CVData } from '../../common/interfaces/cv-data.interface';

@Injectable()
export class CanvaService {
  private readonly logger = new Logger(CanvaService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.baseUrl = this.configService.get<string>('CANVA_BASE_URL') || '';
    this.apiKey = this.configService.get<string>('CANVA_API_KEY') || '';
    this.apiSecret = this.configService.get<string>('CANVA_API_SECRET') || '';
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async createCVFromTemplate(
    cvData: CVData,
    templateId: string,
  ): Promise<{ designId: string; exportUrl?: string }> {
    try {
      // Note: Canva API integration depends on your specific Canva account setup
      // This is a simplified implementation showing the structure

      // Step 1: Create a design from template
      const createDesignUrl = `${this.baseUrl}/designs`;
      const designPayload = {
        design_type: 'CV',
        title: `CV - ${cvData.personalInfo?.firstName} ${cvData.personalInfo?.lastName}`,
        template_id: templateId,
      };

      const createResponse = await firstValueFrom(
        this.httpService.post(createDesignUrl, designPayload, {
          headers: this.getHeaders(),
        }),
      );

      const designId = createResponse.data.design.id;

      // Step 2: Populate the design with CV data
      await this.populateDesignWithData(designId, cvData);

      this.logger.log(`CV design created with ID: ${designId}`);

      return { designId };
    } catch (error) {
      this.logger.error(`Error creating CV from template: ${error.message}`);
      throw error;
    }
  }

  private async populateDesignWithData(
    designId: string,
    cvData: CVData,
  ): Promise<void> {
    try {
      // Canva autofill API to populate template fields
      const autofillUrl = `${this.baseUrl}/designs/${designId}/autofill`;

      const autofillData = this.mapCVDataToCanvaFormat(cvData);

      await firstValueFrom(
        this.httpService.post(autofillUrl, autofillData, {
          headers: this.getHeaders(),
        }),
      );

      this.logger.log(`Design ${designId} populated with CV data`);
    } catch (error) {
      this.logger.error(`Error populating design: ${error.message}`);
      throw error;
    }
  }

  private mapCVDataToCanvaFormat(cvData: CVData): any {
    // Map CV data structure to Canva's expected format
    // This depends on your specific template structure
    return {
      data: {
        // Personal Info
        full_name: `${cvData.personalInfo?.firstName || ''} ${cvData.personalInfo?.lastName || ''}`,
        email: cvData.personalInfo?.email || '',
        phone: cvData.personalInfo?.phone || '',
        location: `${cvData.personalInfo?.city || ''}, ${cvData.personalInfo?.country || ''}`,
        linkedin: cvData.personalInfo?.linkedIn || '',
        portfolio: cvData.personalInfo?.portfolio || '',
        summary: cvData.personalInfo?.summary || '',

        // Work Experience
        work_experiences: cvData.workExperiences.map((exp, idx) => ({
          [`job_title_${idx + 1}`]: exp.position,
          [`company_${idx + 1}`]: exp.companyName,
          [`work_duration_${idx + 1}`]: `${exp.startDate} - ${exp.endDate || 'Present'}`,
          [`work_description_${idx + 1}`]:
            exp.optimizedDescription || exp.description,
        })),

        // Education
        education: cvData.education.map((edu, idx) => ({
          [`degree_${idx + 1}`]: edu.degree,
          [`institution_${idx + 1}`]: edu.institution,
          [`education_duration_${idx + 1}`]: `${edu.startDate || ''} - ${edu.endDate || 'Present'}`,
          [`education_description_${idx + 1}`]: edu.description || '',
        })),

        // Skills
        skills: cvData.skills.map((skill) => skill.name).join(', '),

        // Languages
        languages: cvData.languages
          .map((lang) => `${lang.name} (${lang.proficiency})`)
          .join(', '),

        // Certifications
        certifications: cvData.certifications
          ?.map((cert) => `${cert.name} - ${cert.issuingOrganization || ''}`)
          .join('\n'),
      },
    };
  }

  async exportDesignToPDF(designId: string): Promise<string> {
    try {
      const exportUrl = `${this.baseUrl}/designs/${designId}/export`;

      const exportPayload = {
        format: 'pdf',
        quality: 'high',
        page_range: 'all',
      };

      const response = await firstValueFrom(
        this.httpService.post(exportUrl, exportPayload, {
          headers: this.getHeaders(),
        }),
      );

      // Poll for export completion
      const exportJob = response.data.job;
      const pdfUrl = await this.waitForExportCompletion(
        exportJob.id,
        designId,
      );

      this.logger.log(`Design ${designId} exported to PDF`);
      return pdfUrl;
    } catch (error) {
      this.logger.error(`Error exporting design to PDF: ${error.message}`);
      throw error;
    }
  }

  async exportDesignToDOCX(designId: string): Promise<string> {
    try {
      const exportUrl = `${this.baseUrl}/designs/${designId}/export`;

      const exportPayload = {
        format: 'docx',
      };

      const response = await firstValueFrom(
        this.httpService.post(exportUrl, exportPayload, {
          headers: this.getHeaders(),
        }),
      );

      const exportJob = response.data.job;
      const docxUrl = await this.waitForExportCompletion(
        exportJob.id,
        designId,
      );

      this.logger.log(`Design ${designId} exported to DOCX`);
      return docxUrl;
    } catch (error) {
      this.logger.error(`Error exporting design to DOCX: ${error.message}`);
      throw error;
    }
  }

  private async waitForExportCompletion(
    jobId: string,
    designId: string,
    maxAttempts: number = 30,
  ): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const statusUrl = `${this.baseUrl}/export-jobs/${jobId}`;
        const response = await firstValueFrom(
          this.httpService.get(statusUrl, { headers: this.getHeaders() }),
        );

        const job = response.data.job;

        if (job.status === 'success') {
          return job.url;
        } else if (job.status === 'failed') {
          throw new Error('Export job failed');
        }

        // Wait 2 seconds before next attempt
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        this.logger.error(`Error checking export status: ${error.message}`);
      }
    }

    throw new Error('Export job timed out');
  }

  async listAvailableTemplates(): Promise<
    Array<{ id: string; name: string; previewUrl: string; category: string }>
  > {
    try {
      // This would fetch templates from Canva or your database
      // For now, return mock templates
      return [
        {
          id: 'professional_001',
          name: 'Professional Classic',
          previewUrl: 'https://example.com/template1.jpg',
          category: 'professional',
        },
        {
          id: 'modern_001',
          name: 'Modern Minimalist',
          previewUrl: 'https://example.com/template2.jpg',
          category: 'modern',
        },
        {
          id: 'creative_001',
          name: 'Creative Bold',
          previewUrl: 'https://example.com/template3.jpg',
          category: 'creative',
        },
      ];
    } catch (error) {
      this.logger.error(`Error listing templates: ${error.message}`);
      return [];
    }
  }

  async duplicateDesign(designId: string): Promise<string> {
    try {
      const duplicateUrl = `${this.baseUrl}/designs/${designId}/duplicate`;

      const response = await firstValueFrom(
        this.httpService.post(duplicateUrl, {}, { headers: this.getHeaders() }),
      );

      return response.data.design.id;
    } catch (error) {
      this.logger.error(`Error duplicating design: ${error.message}`);
      throw error;
    }
  }
}
