import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CVData } from '../../common/interfaces/cv-data.interface';
import {
  getTemplateById,
  getAllTemplates,
  recommendTemplates,
  TemplateMetadata
} from './templates/template-registry';

@Injectable()
export class PDFService {
  private readonly logger = new Logger(PDFService.name);
  private readonly templatesPath = path.join(__dirname, 'templates');

  constructor() {
    // Register Handlebars helpers
    Handlebars.registerHelper('substring', (str: string, start: number, end: number) => {
      if (!str) return '';
      return str.substring(start, end).toUpperCase();
    });
  }

  async generateCVPDF(
    cvData: CVData,
    templateName: string = 'modern',
  ): Promise<Buffer> {
    try {
      this.logger.log(`Generating PDF with template: ${templateName}`);

      // Load the appropriate template
      const templatePath = path.join(
        this.templatesPath,
        `${templateName}.hbs`,
      );
      const templateContent = await fs.readFile(templatePath, 'utf-8');

      // Compile template with Handlebars
      const template = Handlebars.compile(templateContent);

      // Prepare data for template
      const templateData = this.prepareTemplateData(cvData);

      // Generate HTML
      const html = template(templateData);

      // Generate PDF using Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm',
        },
      });

      await browser.close();

      this.logger.log('PDF generated successfully');
      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error(`Error generating PDF: ${error.message}`);
      throw error;
    }
  }

  private prepareTemplateData(cvData: CVData): any {
    return {
      personalInfo: {
        fullName: `${cvData.personalInfo?.firstName || ''} ${cvData.personalInfo?.lastName || ''}`.trim(),
        firstName: cvData.personalInfo?.firstName || '',
        lastName: cvData.personalInfo?.lastName || '',
        email: cvData.personalInfo?.email || '',
        phone: cvData.personalInfo?.phone || '',
        location: [cvData.personalInfo?.city, cvData.personalInfo?.country]
          .filter(Boolean)
          .join(', '),
        linkedIn: cvData.personalInfo?.linkedIn || '',
        portfolio: cvData.personalInfo?.portfolio || '',
        summary: cvData.personalInfo?.summary || '',
        cvPicture: cvData.cvPictureUrl || '', // CV picture URL
      },
      professionalSummary: cvData.professionalSummary || '',
      cvPictureUrl: cvData.cvPictureUrl || '',
      workExperiences: (cvData.workExperiences || []).map((exp) => ({
        ...exp,
        description:
          exp.optimizedDescription || exp.description || '',
        duration: `${exp.startDate} - ${exp.isCurrent ? 'Present' : exp.endDate || ''}`,
      })),
      education: (cvData.education || []).map((edu) => ({
        ...edu,
        duration: `${edu.startDate || ''} - ${edu.isCurrent ? 'Present' : edu.endDate || ''}`,
        degreeField: [edu.degree, edu.fieldOfStudy]
          .filter(Boolean)
          .join(' in '),
      })),
      skills: cvData.skills || [],
      languages: cvData.languages || [],
      certifications: (cvData.certifications || []).map((cert) => ({
        ...cert,
        duration: cert.issueDate
          ? `${cert.issueDate}${cert.expiryDate ? ' - ' + cert.expiryDate : ''}`
          : '',
      })),
      hasCVPicture: !!cvData.cvPictureUrl,
      hasProfessionalSummary: !!cvData.professionalSummary,
      hasWorkExperience: cvData.workExperiences && cvData.workExperiences.length > 0,
      hasEducation: cvData.education && cvData.education.length > 0,
      hasSkills: cvData.skills && cvData.skills.length > 0,
      hasLanguages: cvData.languages && cvData.languages.length > 0,
      hasCertifications: cvData.certifications && cvData.certifications.length > 0,
    };
  }

  // Get all available templates with metadata
  getAvailableTemplates(): TemplateMetadata[] {
    return getAllTemplates();
  }

  // Get template by ID
  getTemplateMetadata(templateId: string): TemplateMetadata | undefined {
    return getTemplateById(templateId);
  }

  // Get recommended templates based on profession
  getRecommendedTemplates(profession?: string): TemplateMetadata[] {
    return recommendTemplates(profession);
  }

  // Generate preview PDF with sample data
  async generatePreviewPDF(templateId: string): Promise<Buffer> {
    const sampleData: CVData = {
      personalInfo: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1 (555) 123-4567',
        city: 'San Francisco',
        country: 'USA',
        linkedIn: 'linkedin.com/in/johndoe',
        portfolio: 'johndoe.com',
        summary: 'Experienced professional with 8+ years in software development and team leadership. Passionate about building scalable solutions and mentoring junior developers. Strong track record of delivering high-impact projects on time and within budget.',
      },
      workExperiences: [
        {
          companyName: 'Tech Innovations Inc.',
          position: 'Senior Software Engineer',
          startDate: 'Jan 2020',
          endDate: 'Present',
          isCurrent: true,
          location: 'San Francisco, CA',
          description: '- Led development of microservices architecture serving 2M+ users\n- Mentored team of 5 junior developers, improving code quality by 40%\n- Implemented CI/CD pipeline reducing deployment time by 60%\n- Collaborated with product team to deliver 15+ major features',
        },
        {
          companyName: 'Digital Solutions LLC',
          position: 'Software Engineer',
          startDate: 'Jun 2017',
          endDate: 'Dec 2019',
          isCurrent: false,
          location: 'New York, NY',
          description: '- Developed RESTful APIs using Node.js and Express\n- Built responsive web applications with React and TypeScript\n- Optimized database queries improving performance by 50%\n- Participated in agile development and code reviews',
        },
        {
          companyName: 'StartupXYZ',
          position: 'Junior Developer',
          startDate: 'Aug 2015',
          endDate: 'May 2017',
          isCurrent: false,
          location: 'Austin, TX',
          description: '- Contributed to full-stack development of e-commerce platform\n- Implemented new features based on customer feedback\n- Fixed bugs and improved application stability\n- Worked closely with designers to implement UI/UX improvements',
        },
      ],
      education: [
        {
          institution: 'University of California, Berkeley',
          degree: 'Bachelor of Science',
          fieldOfStudy: 'Computer Science',
          startDate: '2011',
          endDate: '2015',
          isCurrent: false,
          gpa: '3.8',
          description: 'Dean\'s List, Computer Science Club President',
        },
      ],
      skills: [
        { name: 'JavaScript/TypeScript' },
        { name: 'React & Node.js' },
        { name: 'Python & Django' },
        { name: 'SQL & NoSQL Databases' },
        { name: 'AWS & Docker' },
        { name: 'Git & CI/CD' },
        { name: 'Agile/Scrum' },
        { name: 'REST APIs' },
        { name: 'Microservices' },
        { name: 'Team Leadership' },
      ],
      languages: [
        { name: 'English', proficiency: 'Native' },
        { name: 'Spanish', proficiency: 'Professional Working' },
        { name: 'French', proficiency: 'Basic' },
      ],
      certifications: [
        {
          name: 'AWS Certified Solutions Architect',
          issuingOrganization: 'Amazon Web Services',
          issueDate: 'Mar 2022',
          expiryDate: 'Mar 2025',
        },
        {
          name: 'Professional Scrum Master (PSM I)',
          issuingOrganization: 'Scrum.org',
          issueDate: 'Jan 2021',
        },
      ],
    };

    return this.generateCVPDF(sampleData, templateId);
  }
}
