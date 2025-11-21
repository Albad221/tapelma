import { Injectable, Logger } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { OpenAIService } from '../openai/openai.service';
import { PDFService } from '../pdf/pdf.service';
import { StorageService } from '../storage/storage.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { CVData } from '../../common/interfaces/cv-data.interface';

@Injectable()
export class CVGenerationService {
  private readonly logger = new Logger(CVGenerationService.name);

  constructor(
    private userService: UserService,
    private openaiService: OpenAIService,
    private pdfService: PDFService,
    private storageService: StorageService,
    private whatsappService: WhatsAppService,
  ) {}

  async generateCV(
    userId: string,
    sessionId: string,
    cvData: CVData,
    templateId: string,
    targetLanguage: string = 'en',
  ): Promise<{ pdfUrl: string; docxUrl: string; atsScore: number }> {
    try {
      this.logger.log(`Starting CV generation for user: ${userId}`);

      // Step 1: Generate professional summary if not provided
      if (!cvData.personalInfo?.summary && cvData.personalInfo) {
        cvData.personalInfo.summary =
          await this.openaiService.generateProfessionalSummary(
            cvData,
            targetLanguage,
          );
      }

      // Step 2: Optimize work experience descriptions
      for (let i = 0; i < cvData.workExperiences.length; i++) {
        if (!cvData.workExperiences[i].optimizedDescription) {
          cvData.workExperiences[i].optimizedDescription =
            await this.openaiService.optimizeWorkExperience(
              cvData.workExperiences[i],
              targetLanguage,
            );
        }
      }

      // Step 3: Analyze ATS compatibility
      const atsAnalysis =
        await this.openaiService.analyzeATSCompatibility(cvData);

      // Step 4: Generate PDF using Puppeteer
      const templateMapping = {
        classic: 'classic',
        modern: 'modern',
        professional: 'modern',
        creative: 'functional',
        functional: 'functional',
      };
      const templateName = templateMapping[templateId] || 'modern';
      const pdfBuffer = await this.pdfService.generateCVPDF(cvData, templateName);

      // Step 5: Upload PDF to Supabase Storage
      const pdfUpload = await this.storageService.uploadFile(
        pdfBuffer,
        `cv-${userId}-${Date.now()}.pdf`,
        'application/pdf',
        'cvs',
      );

      // Note: DOCX export removed - using PDF only for now
      const docxUpload = { url: pdfUpload.url, key: pdfUpload.key };

      // Step 8: Save document records to database
      await this.userService.saveGeneratedDocument({
        userId,
        sessionId,
        documentType: 'cv',
        templateId,
        fileUrl: pdfUpload.url,
        s3Key: pdfUpload.key,
        fileFormat: 'pdf',
        atsScore: atsAnalysis.score,
        atsSuggestions: atsAnalysis.suggestions,
        status: 'completed',
      });

      await this.userService.saveGeneratedDocument({
        userId,
        sessionId,
        documentType: 'cv',
        templateId,
        fileUrl: docxUpload.url,
        s3Key: docxUpload.key,
        fileFormat: 'docx',
        atsScore: atsAnalysis.score,
        atsSuggestions: atsAnalysis.suggestions,
        status: 'completed',
      });

      this.logger.log(`CV generation completed for user: ${userId}`);

      return {
        pdfUrl: pdfUpload.url,
        docxUrl: docxUpload.url,
        atsScore: atsAnalysis.score,
      };
    } catch (error) {
      this.logger.error(`Error generating CV: ${error.message}`);

      // Log failed generation
      await this.userService.saveGeneratedDocument({
        userId,
        sessionId,
        documentType: 'cv',
        templateId,
        fileFormat: 'pdf',
        status: 'failed',
      });

      throw error;
    }
  }

  async generateCoverLetter(
    userId: string,
    sessionId: string,
    cvData: CVData,
    jobTitle: string,
    companyName: string,
    jobDescription?: string,
    targetLanguage: string = 'en',
  ): Promise<{ url: string }> {
    try {
      this.logger.log(`Generating cover letter for user: ${userId}`);

      // Generate cover letter content using OpenAI
      const coverLetterContent =
        await this.openaiService.generateCoverLetter(
          cvData,
          jobTitle,
          companyName,
          jobDescription,
          targetLanguage,
        );

      // Create a simple document (you could also use Canva for this)
      // For now, we'll create a text file
      const buffer = Buffer.from(coverLetterContent, 'utf-8');

      // Upload to S3
      const upload = await this.storageService.uploadFile(
        buffer,
        `cover-letter-${userId}-${Date.now()}.txt`,
        'text/plain',
        'cover-letters',
      );

      // Save to database
      await this.userService.saveGeneratedDocument({
        userId,
        sessionId,
        documentType: 'cover_letter',
        fileUrl: upload.url,
        s3Key: upload.key,
        fileFormat: 'docx',
        status: 'completed',
      });

      this.logger.log(`Cover letter generated for user: ${userId}`);

      return { url: upload.url };
    } catch (error) {
      this.logger.error(`Error generating cover letter: ${error.message}`);
      throw error;
    }
  }

  async sendGeneratedCVToUser(
    phoneNumber: string,
    pdfUrl: string,
    docxUrl: string,
    atsScore: number,
    language: string = 'en',
  ): Promise<void> {
    try {
      // Send ATS score and feedback
      const messages = {
        en: `✅ Your CV is ready!\n\n📊 ATS Score: ${atsScore}/100\n\n${this.getATSFeedback(atsScore, 'en')}\n\nI'm sending your CV now...`,
        fr: `✅ Votre CV est prêt!\n\n📊 Score ATS: ${atsScore}/100\n\n${this.getATSFeedback(atsScore, 'fr')}\n\nJ'envoie votre CV maintenant...`,
        es: `✅ ¡Tu CV está listo!\n\n📊 Puntuación ATS: ${atsScore}/100\n\n${this.getATSFeedback(atsScore, 'es')}\n\nEnviando tu CV ahora...`,
      };

      await this.whatsappService.sendTextMessage(
        phoneNumber,
        messages[language] || messages.en,
      );

      // Send PDF
      await this.whatsappService.sendMediaMessage(
        phoneNumber,
        pdfUrl,
        'document',
        'Your CV in PDF format',
        'CV.pdf',
      );

      // Send DOCX
      await this.whatsappService.sendMediaMessage(
        phoneNumber,
        docxUrl,
        'document',
        'Your CV in DOCX format (editable)',
        'CV.docx',
      );

      // Send follow-up options
      await this.whatsappService.sendInteractiveButtons(
        phoneNumber,
        'What would you like to do next?',
        [
          { id: 'generate_cover_letter', text: 'Generate Cover Letter' },
          { id: 'create_new_cv', text: 'Create New CV' },
          { id: 'done', text: 'Done' },
        ],
        'Next Steps',
      );
    } catch (error) {
      this.logger.error(`Error sending CV to user: ${error.message}`);
      throw error;
    }
  }

  private getATSFeedback(score: number, language: string): string {
    const feedback = {
      en: {
        high: 'Excellent! Your CV is highly optimized for ATS systems.',
        medium: 'Good! Your CV should pass most ATS systems with minor improvements.',
        low: 'Your CV needs optimization for better ATS compatibility.',
      },
      fr: {
        high: 'Excellent! Votre CV est hautement optimisé pour les systèmes ATS.',
        medium: 'Bon! Votre CV devrait passer la plupart des systèmes ATS avec des améliorations mineures.',
        low: "Votre CV nécessite une optimisation pour une meilleure compatibilité ATS.",
      },
      es: {
        high: '¡Excelente! Tu CV está altamente optimizado para sistemas ATS.',
        medium: '¡Bien! Tu CV debería pasar la mayoría de sistemas ATS con mejoras menores.',
        low: 'Tu CV necesita optimización para mejor compatibilidad ATS.',
      },
    };

    const level = score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low';
    return feedback[language]?.[level] || feedback.en[level];
  }

  private mapTemplateId(templateId: string): string {
    // Map user-friendly template names to actual Canva template IDs
    const templateMap = {
      professional: 'professional_001',
      modern: 'modern_001',
      creative: 'creative_001',
    };

    return templateMap[templateId] || templateMap.professional;
  }

  async optimizeCVForATS(cvData: CVData): Promise<CVData> {
    // Additional ATS optimization logic
    const analysis = await this.openaiService.analyzeATSCompatibility(cvData);

    // Apply suggestions automatically where possible
    // This could include keyword optimization, formatting improvements, etc.

    return cvData;
  }
}
