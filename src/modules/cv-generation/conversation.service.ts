import { Injectable, Logger } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { OpenAIService } from '../openai/openai.service';
import { GeminiService } from '../gemini/gemini.service';
import { PDFService } from '../pdf/pdf.service';
import { StorageService } from '../storage/storage.service';
import { AdminService } from '../admin/admin.service';
import {
  ConversationStep,
  SessionStatus,
  ConversationSession,
  WorkExperience,
  Education,
  Skill,
} from '../../common/interfaces/cv-data.interface';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    private userService: UserService,
    private whatsappService: WhatsAppService,
    private openaiService: OpenAIService,
    private geminiService: GeminiService,
    private pdfService: PDFService,
    private storageService: StorageService,
    private adminService: AdminService,
  ) {}

  async handleUserMessage(phoneNumber: string, message: string): Promise<void> {
    try {
      // Find or create user
      const user = await this.userService.findOrCreateUser(phoneNumber);

      // Log incoming message
      await this.userService.logMessage({
        userId: user.id,
        direction: 'inbound',
        messageType: 'text',
        content: message,
      });

      // Get or create active session
      let session = await this.userService.getActiveSession(user.id);
      if (!session) {
        session = await this.userService.createSession(
          user.id,
          user.preferredLanguage,
        );
      }

      // CRITICAL FIX: Handle "Non/No/Skip" responses at specific steps BEFORE calling OpenAI
      // This ensures step progression happens deterministically, not relying on AI interpretation
      const skipHandled = await this.handleSkipResponse(phoneNumber, session, message);
      if (skipHandled) {
        return; // Skip response was handled, no need to call OpenAI
      }

      // ═══════════════════════════════════════════════════════════════════════
      // HARD GATE: personalInfo MUST be complete before ANY other step
      // This is a NON-NEGOTIABLE requirement - OpenAI cannot skip this
      // ═══════════════════════════════════════════════════════════════════════
      const hasRequiredPersonalInfo =
        session.data?.personalInfo?.firstName &&
        session.data?.personalInfo?.email;

      if (!hasRequiredPersonalInfo && session.currentStep !== ConversationStep.GREETING && session.currentStep !== ConversationStep.LANGUAGE_SELECTION) {
        // Force step back to personal_info if we don't have required data
        this.logger.warn(`🚨 HARD GATE: Missing personal info (name+email). Forcing step to personal_info.`);
        this.logger.log(`Current step was: ${session.currentStep}, data: ${JSON.stringify(session.data?.personalInfo || {})}`);

        // Update session to personal_info step
        await this.userService.updateSession(session.id, {
          currentStep: ConversationStep.PERSONAL_INFO,
        });
        session.currentStep = ConversationStep.PERSONAL_INFO;
      }

      // Get conversation history from message logs
      const conversationHistory = await this.getConversationHistory(user.id);
      this.logger.log(`📜 CONVERSATION HISTORY (${conversationHistory.length} messages): ${JSON.stringify(conversationHistory.slice(-5), null, 2)}`); // Last 5 messages

      // Use AI to handle the conversation intelligently
      this.logger.log(`🤖 Calling OpenAI with step: ${session.currentStep}, language: ${session.language}`);
      const aiResponse = await this.openaiService.handleConversation(
        message,
        conversationHistory,
        session.data,
        session.currentStep,
        session.language,
      );

      // Merge extracted data into session
      if (aiResponse.extractedData && Object.keys(aiResponse.extractedData).length > 0) {
        this.logger.log(`📥 BEFORE MERGE - Existing data: ${JSON.stringify(session.data, null, 2)}`);
        this.logger.log(`📦 EXTRACTED DATA: ${JSON.stringify(aiResponse.extractedData, null, 2)}`);

        // Special logging for template selection
        if (aiResponse.extractedData.selectedTemplate) {
          this.logger.log(`🎨 AI EXTRACTED TEMPLATE: "${aiResponse.extractedData.selectedTemplate}"`);
        }

        session.data = this.mergeData(session.data, aiResponse.extractedData);
        this.logger.log(`📤 AFTER MERGE - Updated data: ${JSON.stringify(session.data, null, 2)}`);

        // Verify template was saved
        if (session.data.selectedTemplate) {
          this.logger.log(`✅ CONFIRMED - Template saved in session: "${session.data.selectedTemplate}"`);
        }
      }

      // Update session with new step and data
      // Convert OpenAI's uppercase response to the enum value
      let nextStep = this.normalizeConversationStep(aiResponse.nextStep);

      // CRITICAL SAFEGUARD: Never advance past personal_info without email
      // This prevents OpenAI from incorrectly advancing the step
      if (session.currentStep === ConversationStep.PERSONAL_INFO &&
          nextStep !== ConversationStep.PERSONAL_INFO &&
          !session.data?.personalInfo?.email) {
        this.logger.warn(`⚠️ BLOCKED: Attempted to advance from personal_info without email. Keeping at personal_info.`);
        nextStep = ConversationStep.PERSONAL_INFO;
      }

      // AUTO-ADVANCE SAFEGUARD: If we have name+email at personal_info, always advance
      // This prevents OpenAI from getting stuck and re-asking for already-collected data
      if (session.currentStep === ConversationStep.PERSONAL_INFO &&
          nextStep === ConversationStep.PERSONAL_INFO &&
          session.data?.personalInfo?.firstName &&
          session.data?.personalInfo?.email) {
        this.logger.log(`✅ AUTO-ADVANCE: Have name+email at personal_info, advancing to work_experience`);
        nextStep = ConversationStep.WORK_EXPERIENCE;
      }

      // AUTO-ADVANCE SAFEGUARD: If we have professionalSummary and user said "oui/yes" at PROFESSIONAL_SUMMARY step
      // Ensure we advance to CV_PICTURE - OpenAI sometimes doesn't return the correct nextStep
      const lowerMsg = message?.toLowerCase().trim() || '';
      const isConfirmation = ['oui', 'yes', 'ok', 'parfait', 'génial', 'super', 'd\'accord', 'daccord', 'c\'est bon', 'cest bon'].some(c => lowerMsg.includes(c));
      if (session.currentStep === ConversationStep.PROFESSIONAL_SUMMARY &&
          session.data?.professionalSummary &&
          isConfirmation) {
        this.logger.log(`✅ AUTO-ADVANCE: User confirmed professional summary with "${message}", advancing to cv_picture`);
        nextStep = ConversationStep.CV_PICTURE;
      }

      // Also: If OpenAI says we're at cv_picture but returns a different nextStep, override
      // This handles cases where response mentions photo but nextStep is wrong
      if (session.currentStep === ConversationStep.PROFESSIONAL_SUMMARY &&
          aiResponse.response &&
          (aiResponse.response.toLowerCase().includes('photo') ||
           aiResponse.response.toLowerCase().includes('picture') ||
           aiResponse.response.toLowerCase().includes('image'))) {
        this.logger.log(`✅ AUTO-ADVANCE: Response mentions photo, ensuring nextStep is cv_picture`);
        nextStep = ConversationStep.CV_PICTURE;
      }

      // ═══════════════════════════════════════════════════════════════════════
      // FINAL SAFEGUARD: OpenAI cannot skip to any step beyond personal_info
      // without name+email being present. This is an absolute hard block.
      // ═══════════════════════════════════════════════════════════════════════
      const stepsRequiringPersonalInfo = [
        ConversationStep.WORK_EXPERIENCE,
        ConversationStep.EDUCATION,
        ConversationStep.SKILLS,
        ConversationStep.LANGUAGES_KNOWN,
        ConversationStep.PROFESSIONAL_SUMMARY,
        ConversationStep.CV_PICTURE,
        ConversationStep.TEMPLATE_SELECTION,
        ConversationStep.GENERATION,
      ];

      const hasPersonalInfoNow = session.data?.personalInfo?.firstName && session.data?.personalInfo?.email;

      if (stepsRequiringPersonalInfo.includes(nextStep) && !hasPersonalInfoNow) {
        this.logger.warn(`🚫 FINAL BLOCK: OpenAI tried to skip to ${nextStep} without personal info. Forcing personal_info.`);
        nextStep = ConversationStep.PERSONAL_INFO;
      }

      await this.userService.updateSession(session.id, {
        currentStep: nextStep,
        data: session.data,
      });

      // Send AI response to user
      await this.whatsappService.sendTextMessage(phoneNumber, aiResponse.response);

      // Log outbound message
      await this.userService.logMessage({
        userId: user.id,
        direction: 'outbound',
        messageType: 'text',
        content: aiResponse.response,
      });

      // If conversation is complete, trigger CV generation
      if (!aiResponse.shouldContinue) {
        this.logger.log('CV generation requested');
        await this.handleCVGeneration(phoneNumber, session);
      }
    } catch (error) {
      this.logger.error(`Error handling user message: ${error.message}`);
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        'Sorry, something went wrong. Please try again or type "restart" to begin a new session.',
      );
    }
  }

  private mergeData(existing: any, newData: any): any {
    // Helper to check if two work experiences are duplicates
    const isDuplicateWorkExp = (exp1: any, exp2: any) => {
      return exp1.companyName === exp2.companyName &&
             exp1.position === exp2.position;
    };

    // Helper to check if two education entries are duplicates
    // Uses case-insensitive and trimmed comparison, also checks fieldOfStudy
    const isDuplicateEducation = (edu1: any, edu2: any) => {
      const normalize = (str: string) => (str || '').toLowerCase().trim();
      const inst1 = normalize(edu1.institution);
      const inst2 = normalize(edu2.institution);
      const deg1 = normalize(edu1.degree);
      const deg2 = normalize(edu2.degree);
      const field1 = normalize(edu1.fieldOfStudy);
      const field2 = normalize(edu2.fieldOfStudy);

      // Same institution + same degree = duplicate
      // OR same institution + same field of study = duplicate
      // OR same degree + same field of study = duplicate (handles cases where institution varies)
      const sameInstitution = inst1 === inst2 && inst1 !== '';
      const sameDegree = deg1 === deg2 && deg1 !== '';
      const sameField = field1 === field2 && field1 !== '';

      return (sameInstitution && sameDegree) ||
             (sameInstitution && sameField) ||
             (sameDegree && sameField);
    };

    // Helper to check if skill already exists
    const isDuplicateSkill = (skills: any[], newSkill: string) => {
      return skills.some(s => s.name === newSkill);
    };

    // Helper to check if language already exists
    const isDuplicateLanguage = (languages: any[], newLang: string) => {
      return languages.some(l => l.name === newLang);
    };

    // Helper to normalize work experience data
    const normalizeWorkExperience = (data: any) => {
      if (!data) return null;
      return {
        companyName: data.company || data.companyName || '',
        position: data.jobTitle || data.position || '',
        startDate: data.period?.split('-')[0]?.trim() || data.startDate || '',
        endDate: data.period?.split('-')[1]?.trim() || data.endDate || '',
        isCurrent: false,
        location: data.location || '',
        description: data.description || '',
      };
    };

    // Helper to normalize education data
    const normalizeEducation = (data: any) => {
      if (!data) return null;
      return {
        institution: data.institution || '',
        degree: data.degree || '',
        fieldOfStudy: data.fieldOfStudy || data.field || '',
        startDate: data.period?.split('-')[0]?.trim() || data.startDate || '',
        endDate: data.period?.split('-')[1]?.trim() || data.endDate || '',
        isCurrent: false,
        gpa: data.gpa || '',
        location: data.location || '',
      };
    };

    // Handle work experiences with deduplication
    let workExperiences = existing.workExperiences || [];

    // Handle singular workExperience (could be object or array)
    if (newData.workExperience) {
      if (Array.isArray(newData.workExperience)) {
        // workExperience came as an array (OpenAI inconsistency)
        const normalized = newData.workExperience.map(normalizeWorkExperience).filter(Boolean);
        normalized.forEach(newExp => {
          if (!workExperiences.some(exp => isDuplicateWorkExp(exp, newExp))) {
            workExperiences.push(newExp);
          }
        });
      } else {
        // workExperience came as a single object
        const normalized = normalizeWorkExperience(newData.workExperience);
        if (normalized && !workExperiences.some(exp => isDuplicateWorkExp(exp, normalized))) {
          workExperiences = [...workExperiences, normalized];
        } else if (normalized) {
          // Update existing entry instead of adding duplicate
          workExperiences = workExperiences.map(exp =>
            isDuplicateWorkExp(exp, normalized) ? { ...exp, ...normalized } : exp
          );
        }
      }
    }

    // Handle plural workExperiences
    if (newData.workExperiences && Array.isArray(newData.workExperiences)) {
      const normalized = newData.workExperiences.map(normalizeWorkExperience).filter(Boolean);
      normalized.forEach(newExp => {
        if (!workExperiences.some(exp => isDuplicateWorkExp(exp, newExp))) {
          workExperiences.push(newExp);
        }
      });
    }

    // Handle education with deduplication
    let education = existing.education || [];
    if (newData.education && !Array.isArray(newData.education)) {
      const normalized = normalizeEducation(newData.education);
      if (normalized && !education.some(edu => isDuplicateEducation(edu, normalized))) {
        education = [...education, normalized];
      } else if (normalized) {
        // Update existing entry
        education = education.map(edu =>
          isDuplicateEducation(edu, normalized) ? { ...edu, ...normalized } : edu
        );
      }
    } else if (newData.education && Array.isArray(newData.education)) {
      const normalized = newData.education.map(normalizeEducation).filter(Boolean);
      normalized.forEach(newEdu => {
        if (!education.some(edu => isDuplicateEducation(edu, newEdu))) {
          education.push(newEdu);
        }
      });
    }

    // Handle skills with deduplication
    let skills = existing.skills || [];
    if (newData.skills && Array.isArray(newData.skills)) {
      newData.skills.forEach(skill => {
        const skillName = typeof skill === 'string' ? skill : skill.name;
        if (!isDuplicateSkill(skills, skillName)) {
          skills.push(typeof skill === 'string' ? { name: skill, category: 'general' } : skill);
        }
      });
    }

    // Handle languages with deduplication
    let languages = existing.languages || [];
    const newLanguages = newData.languagesKnown || newData.languages;
    if (newLanguages && Array.isArray(newLanguages)) {
      newLanguages.forEach(lang => {
        const langName = typeof lang === 'string' ? lang : lang.name;
        if (!isDuplicateLanguage(languages, langName)) {
          languages.push(typeof lang === 'string' ? { name: lang, proficiency: 'professional' } : lang);
        }
      });
    }

    return {
      ...existing,
      personalInfo: { ...existing.personalInfo, ...newData.personalInfo },
      professionalSummary: newData.professionalSummary || existing.professionalSummary,
      workExperiences,
      education,
      skills,
      languages,
      certifications: (newData.certifications && Array.isArray(newData.certifications))
        ? [...(existing.certifications || []), ...newData.certifications]
        : existing.certifications || [],
      selectedTemplate: newData.selectedTemplate || existing.selectedTemplate,
      additionalSections: {
        ...(existing.additionalSections || {}),
      },
    };
  }

  private async getConversationHistory(userId: string): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    const messages = await this.userService.getRecentMessages(userId, 50);
    return messages.map(msg => ({
      role: msg.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
      content: msg.content,
    }));
  }

  /**
   * CRITICAL FIX: Handle "Non/No/Skip" responses at specific steps deterministically
   * This prevents the AI from getting confused by conversation history and ensures
   * proper step progression when user wants to skip a non-mandatory section.
   *
   * @returns true if the response was handled (skip detected), false otherwise
   */
  private async handleSkipResponse(
    phoneNumber: string,
    session: ConversationSession,
    message: string,
  ): Promise<boolean> {
    const lowerMessage = message.toLowerCase().trim();

    // NEVER intercept at personal_info step - it's always mandatory and needs full AI handling
    // This prevents "pas de mail" from being treated as a skip when user is providing info
    if (session.currentStep === ConversationStep.PERSONAL_INFO) {
      return false; // Let OpenAI handle personal info - it will insist on email
    }

    // Check if this is a PURE skip/no response (not mixed with other content)
    // Only trigger on short, clear skip messages to avoid false positives
    const pureSkipPatterns = [
      'non', 'no', 'skip', 'passer', 'aucun', 'aucune',
      'none', 'nope', 'rien', 'pas pour moi', 'je passe'
    ];

    // For longer messages with "pas de" or similar, only trigger if the message is primarily a skip
    const isShortMessage = lowerMessage.length < 30;
    const isPureSkip = pureSkipPatterns.some(skip => lowerMessage === skip);
    const containsSkipPhrase = ['pas de', 'je n\'ai pas', 'i don\'t have', 'i dont have'].some(skip => lowerMessage.includes(skip));

    // Only treat as skip if: pure skip word OR (short message with skip phrase)
    const isSkipResponse = isPureSkip || (isShortMessage && containsSkipPhrase);

    if (!isSkipResponse) {
      return false; // Not a skip response, let OpenAI handle it
    }

    // Get mandatory fields from admin config
    const mandatoryFields = this.adminService.getMandatoryFields();

    // Define step progression and check if current step is mandatory
    const stepProgression: Record<string, { nextStep: ConversationStep; fieldName: string; skipMessage: { fr: string; en: string } }> = {
      [ConversationStep.WORK_EXPERIENCE]: {
        nextStep: ConversationStep.EDUCATION,
        fieldName: 'workExperience',
        skipMessage: {
          fr: "D'accord, passons à votre formation. Pouvez-vous me parler de vos études ? (établissement, diplôme, dates)",
          en: "Okay, let's move to your education. Can you tell me about your studies? (institution, degree, dates)"
        }
      },
      [ConversationStep.EDUCATION]: {
        nextStep: ConversationStep.SKILLS,
        fieldName: 'education',
        skipMessage: {
          fr: "D'accord, passons aux compétences. Quelles sont vos principales compétences professionnelles ?",
          en: "Okay, let's move to skills. What are your main professional skills?"
        }
      },
      [ConversationStep.SKILLS]: {
        nextStep: ConversationStep.LANGUAGES_KNOWN,
        fieldName: 'skills',
        skipMessage: {
          fr: "D'accord, passons aux langues. Quelles langues parlez-vous et à quel niveau ?",
          en: "Okay, let's move to languages. What languages do you speak and at what level?"
        }
      },
      [ConversationStep.LANGUAGES_KNOWN]: {
        nextStep: ConversationStep.PROFESSIONAL_SUMMARY,
        fieldName: 'languages',
        skipMessage: {
          fr: "D'accord, je vais maintenant générer un résumé professionnel basé sur vos informations...",
          en: "Okay, I'll now generate a professional summary based on your information..."
        }
      },
      [ConversationStep.PROFESSIONAL_SUMMARY]: {
        nextStep: ConversationStep.CV_PICTURE,
        fieldName: 'professionalSummary',
        skipMessage: {
          fr: "D'accord, pas de résumé. Souhaitez-vous ajouter une photo à votre CV ? Envoyez-moi une photo ou dites 'non'.",
          en: "Okay, no summary. Would you like to add a photo to your CV? Send me a photo or say 'no'."
        }
      },
      [ConversationStep.CV_PICTURE]: {
        nextStep: ConversationStep.TEMPLATE_SELECTION,
        fieldName: 'cvPicture',
        skipMessage: {
          fr: "D'accord, pas de photo. Choisissez maintenant votre modèle de CV parmi les options suivantes:",
          en: "Okay, no photo. Now choose your CV template from the following options:"
        }
      },
    };

    const currentStepConfig = stepProgression[session.currentStep];

    // If current step is not in our progression map, let OpenAI handle it
    if (!currentStepConfig) {
      return false;
    }

    // Check if this field is mandatory
    const isMandatory = mandatoryFields.includes(currentStepConfig.fieldName);

    if (isMandatory) {
      // Field is mandatory - send insistence message and DON'T progress
      const insistMessages: Record<string, { fr: string; en: string }> = {
        workExperience: {
          fr: "Une expérience professionnelle est OBLIGATOIRE pour votre CV. Même un stage, projet personnel ou bénévolat compte. Qu'avez-vous fait professionnellement ?",
          en: "Work experience is REQUIRED for your CV. Even an internship, personal project or volunteer work counts. What have you done professionally?"
        },
        education: {
          fr: "Votre formation est OBLIGATOIRE. Quel est votre dernier diplôme ou niveau d'études ?",
          en: "Your education is REQUIRED. What is your latest degree or education level?"
        },
        skills: {
          fr: "Au moins une compétence est OBLIGATOIRE. Que savez-vous faire ? (ex: communication, Excel, gestion...)",
          en: "At least one skill is REQUIRED. What can you do? (e.g., communication, Excel, management...)"
        },
        languages: {
          fr: "Au moins une langue est OBLIGATOIRE. Quelle(s) langue(s) parlez-vous ?",
          en: "At least one language is REQUIRED. What language(s) do you speak?"
        },
      };

      const insistMessage = insistMessages[currentStepConfig.fieldName];
      if (insistMessage) {
        const response = session.language === 'fr' ? insistMessage.fr : insistMessage.en;
        await this.whatsappService.sendTextMessage(phoneNumber, response);

        // Log the message
        const user = await this.userService.findOrCreateUser(phoneNumber);
        await this.userService.logMessage({
          userId: user.id,
          direction: 'outbound',
          messageType: 'text',
          content: response,
        });

        this.logger.log(`⚠️ MANDATORY FIELD - Insisted on ${currentStepConfig.fieldName}, staying at step ${session.currentStep}`);
        return true; // Handled, don't call OpenAI
      }
      return false; // Let OpenAI handle if no insist message defined
    }

    // Field is NOT mandatory - progress to next step
    this.logger.log(`✅ SKIP DETECTED at ${session.currentStep} - Progressing to ${currentStepConfig.nextStep}`);

    // Update session to next step
    await this.userService.updateSession(session.id, {
      currentStep: currentStepConfig.nextStep,
    });

    // Send appropriate message
    const skipMessage = session.language === 'fr'
      ? currentStepConfig.skipMessage.fr
      : currentStepConfig.skipMessage.en;

    await this.whatsappService.sendTextMessage(phoneNumber, skipMessage);

    // Log the message
    const user = await this.userService.findOrCreateUser(phoneNumber);
    await this.userService.logMessage({
      userId: user.id,
      direction: 'outbound',
      messageType: 'text',
      content: skipMessage,
    });

    // Special handling: if we just moved to template_selection, show template options
    if (currentStepConfig.nextStep === ConversationStep.TEMPLATE_SELECTION) {
      await this.proceedToTemplateSelection(phoneNumber, session);
    }

    return true; // Handled, don't call OpenAI
  }

  private async handleCVGeneration(
    phoneNumber: string,
    session: ConversationSession,
  ): Promise<void> {
    try {
      this.logger.log(`Starting CV generation for session: ${session.id}`);

      // Validate mandatory fields before generation
      const cvData = session.data;
      const mandatoryFields = this.adminService.getMandatoryFields();
      const missingFields: string[] = [];

      for (const fieldName of mandatoryFields) {
        switch (fieldName) {
          case 'personalInfo':
            if (!cvData.personalInfo || !cvData.personalInfo.firstName || !cvData.personalInfo.email) {
              missingFields.push('Personal Information');
            }
            break;
          case 'workExperience':
            if (!cvData.workExperiences || cvData.workExperiences.length === 0) {
              missingFields.push('Work Experience');
            }
            break;
          case 'education':
            if (!cvData.education || cvData.education.length === 0) {
              missingFields.push('Education');
            }
            break;
          case 'skills':
            if (!cvData.skills || cvData.skills.length === 0) {
              missingFields.push('Skills');
            }
            break;
          case 'languages':
            if (!cvData.languages || cvData.languages.length === 0) {
              missingFields.push('Languages');
            }
            break;
          case 'certifications':
            if (!cvData.certifications || cvData.certifications.length === 0) {
              missingFields.push('Certifications');
            }
            break;
        }
      }

      if (missingFields.length > 0) {
        const errorMessage = session.language === 'fr'
          ? `❌ Veuillez remplir les champs obligatoires manquants: ${missingFields.join(', ')}`
          : session.language === 'es'
          ? `❌ Por favor complete los campos obligatorios faltantes: ${missingFields.join(', ')}`
          : `❌ Please fill in the missing mandatory fields: ${missingFields.join(', ')}`;

        await this.whatsappService.sendTextMessage(phoneNumber, errorMessage);
        this.logger.warn(`CV generation blocked - missing mandatory fields: ${missingFields.join(', ')}`);
        return;
      }

      // Send initial message
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        session.language === 'fr'
          ? '🎨 Génération de votre CV en cours... Veuillez patienter.'
          : session.language === 'es'
          ? '🎨 Generando tu CV... Por favor espera.'
          : '🎨 Generating your CV... Please wait.',
      );
      const user = await this.userService.findOrCreateUser(phoneNumber);

      // Create a record in generated_documents table with 'generating' status
      const documentId = await this.userService.saveGeneratedDocument({
        userId: user.id,
        sessionId: session.id,
        documentType: 'cv',
        templateId: cvData.selectedTemplate || 'modern',
        fileFormat: 'pdf',
        status: 'generating',
      });

      this.logger.log(`Document record created: ${documentId}`);

      // Use professional summary from conversation if available, otherwise generate it
      let professionalSummary = cvData.professionalSummary;
      if (!professionalSummary) {
        this.logger.log('No professional summary in CV data, generating one with OpenAI');
        professionalSummary = await this.openaiService.generateProfessionalSummary(
          cvData,
          session.language,
        );
      } else {
        this.logger.log(`Using professional summary from conversation: ${professionalSummary}`);
      }

      // IMPORTANT: Add the professional summary back to cvData so it's included in the PDF
      cvData.professionalSummary = professionalSummary;
      this.logger.log(`Professional summary set in cvData: ${professionalSummary?.substring(0, 100)}...`);

      // Optimize work experience descriptions if any exist
      if (cvData.workExperiences && cvData.workExperiences.length > 0) {
        for (const workExp of cvData.workExperiences) {
          if (workExp.description) {
            workExp.optimizedDescription = await this.openaiService.optimizeWorkExperience(
              workExp,
              session.language,
            );
          }
        }
      }

      // Map natural language template preferences to actual template IDs
      this.logger.log(`📋 RAW CV DATA selectedTemplate: ${JSON.stringify(cvData.selectedTemplate)}`);
      this.logger.log(`📋 FULL CV DATA: ${JSON.stringify(cvData, null, 2)}`);

      const selectedTemplate = cvData.selectedTemplate?.toLowerCase() || 'modern';
      let templateName = 'modern'; // default

      // Map user's natural language preference to template ID
      if (selectedTemplate.includes('classic') || selectedTemplate.includes('traditionnel')) {
        templateName = 'classic';
      } else if (selectedTemplate.includes('modern') || selectedTemplate.includes('moderne')) {
        templateName = 'modern';
      } else if (selectedTemplate.includes('creative') || selectedTemplate.includes('créatif') || selectedTemplate.includes('bold')) {
        templateName = 'creative';
      } else if (selectedTemplate.includes('functional') || selectedTemplate.includes('skill')) {
        templateName = 'functional';
      } else if (selectedTemplate.includes('executive') || selectedTemplate.includes('élite')) {
        templateName = 'executive';
      } else if (selectedTemplate.includes('minimalist') || selectedTemplate.includes('minimaliste') || selectedTemplate.includes('clean')) {
        templateName = 'minimalist';
      } else if (selectedTemplate.includes('corporate') || selectedTemplate.includes('blue')) {
        templateName = 'corporate-blue';
      } else if (selectedTemplate.includes('academic')) {
        templateName = 'academic-minimal';
      } else if (selectedTemplate.includes('professional')) {
        templateName = 'professional-modern';
      } else if (selectedTemplate.includes('vibrant')) {
        templateName = 'vibrant-professional';
      }

      this.logger.log(`🎨 User selected: "${selectedTemplate}", using template: ${templateName}`);

      // Step 1: Generate PDF using Puppeteer + HTML templates
      this.logger.log(`Generating PDF with template: ${templateName}`);
      const pdfBuffer = await this.pdfService.generateCVPDF(cvData, templateName);

      // Step 2: Upload PDF to Supabase Storage
      this.logger.log(`Uploading PDF to Supabase Storage`);
      const fileName = `cv-${user.firstName || 'user'}-${user.lastName || ''}-${Date.now()}.pdf`;
      const { key, url: s3Url } = await this.storageService.uploadFile(
        pdfBuffer,
        fileName,
        'application/pdf',
        'cvs',
      );

      this.logger.log(`CV generated successfully. File key: ${key}`);

      // Update the document record with completed status and file info

      // Update session status to completed
      await this.userService.updateSession(session.id, {
        status: SessionStatus.COMPLETED,
        currentStep: ConversationStep.COMPLETED,
      });

      // Send the PDF directly to WhatsApp
      const pdfFilename = `CV-${user.firstName || 'Professional'}-${user.lastName || ''}.pdf`.replace(/\s+/g, '-');
      this.logger.log(`Sending PDF directly to WhatsApp: ${pdfFilename} (${pdfBuffer.length} bytes)`);

      const pdfSent = await this.whatsappService.sendDocumentBuffer(
        phoneNumber,
        pdfBuffer,
        pdfFilename,
      );

      if (pdfSent) {
        this.logger.log('PDF sent successfully via WhatsApp');
      } else {
        this.logger.warn('Failed to send PDF via WhatsApp, user will need to use download link');
      }

      // Send success message with download link as backup
      const successMessage =
        session.language === 'fr'
          ? `✅ Votre CV a été généré avec succès!\n\n📄 Titre: CV Professionnel\n🎨 Modèle: ${cvData.selectedTemplate || 'moderne'}\n\n${pdfSent ? '📎 Le PDF a été envoyé ci-dessus.\n\n' : ''}📥 Lien de téléchargement: ${s3Url}\n\nMerci d'avoir utilisé notre générateur de CV! Si vous souhaitez créer un nouveau CV, envoyez simplement "restart".`
          : session.language === 'es'
          ? `✅ ¡Tu CV se ha generado exitosamente!\n\n📄 Título: CV Profesional\n🎨 Plantilla: ${cvData.selectedTemplate || 'moderno'}\n\n${pdfSent ? '📎 El PDF se envió arriba.\n\n' : ''}📥 Enlace de descarga: ${s3Url}\n\nGracias por usar nuestro generador de CV! Si deseas crear un nuevo CV, simplemente envía "restart".`
          : `✅ Your CV has been generated successfully!\n\n📄 Title: Professional CV\n🎨 Template: ${cvData.selectedTemplate || 'modern'}\n\n${pdfSent ? '📎 The PDF was sent above.\n\n' : ''}📥 Download link: ${s3Url}\n\nThank you for using our CV generator! If you want to create a new CV, simply send "restart".`;

      await this.whatsappService.sendTextMessage(phoneNumber, successMessage);

      this.logger.log(`CV generation completed for session: ${session.id}`);
    } catch (error) {
      this.logger.error(`Error generating CV: ${error.message}`);

      const errorMessage =
        session.language === 'fr'
          ? '❌ Désolé, une erreur s\'est produite lors de la génération de votre CV. Veuillez réessayer ou contacter le support.'
          : session.language === 'es'
          ? '❌ Lo siento, ocurrió un error al generar tu CV. Por favor intenta nuevamente o contacta al soporte.'
          : '❌ Sorry, an error occurred while generating your CV. Please try again or contact support.';

      await this.whatsappService.sendTextMessage(phoneNumber, errorMessage);
    }
  }

  private async processConversationStep(
    phoneNumber: string,
    session: ConversationSession,
    message: string,
  ): Promise<void> {
    switch (session.currentStep) {
      case ConversationStep.GREETING:
        await this.handleGreeting(phoneNumber, session, message);
        break;

      case ConversationStep.LANGUAGE_SELECTION:
        await this.handleLanguageSelection(phoneNumber, session, message);
        break;

      case ConversationStep.PERSONAL_INFO:
        await this.handlePersonalInfo(phoneNumber, session, message);
        break;

      case ConversationStep.WORK_EXPERIENCE:
        await this.handleWorkExperience(phoneNumber, session, message);
        break;

      case ConversationStep.EDUCATION:
        await this.handleEducation(phoneNumber, session, message);
        break;

      case ConversationStep.SKILLS:
        await this.handleSkills(phoneNumber, session, message);
        break;

      case ConversationStep.LANGUAGES_KNOWN:
        await this.handleLanguages(phoneNumber, session, message);
        break;

      case ConversationStep.CERTIFICATIONS:
        await this.handleCertifications(phoneNumber, session, message);
        break;

      case ConversationStep.TEMPLATE_SELECTION:
        await this.handleTemplateSelection(phoneNumber, session, message);
        break;

      case ConversationStep.REVIEW:
        await this.handleReview(phoneNumber, session, message);
        break;

      default:
        await this.whatsappService.sendTextMessage(
          phoneNumber,
          'I am not sure what to do next. Type "help" for assistance or "restart" to begin again.',
        );
    }
  }

  private async handleGreeting(
    phoneNumber: string,
    session: ConversationSession,
    message: string,
  ): Promise<void> {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes('start') ||
      lowerMessage.includes('begin') ||
      lowerMessage.includes('hello') ||
      lowerMessage.includes('hi')
    ) {
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        `Welcome to the CV Generator! 👋\n\nI'll help you create a professional CV in minutes.\n\nLet's start by choosing your preferred language.`,
      );

      await this.whatsappService.sendInteractiveButtons(
        phoneNumber,
        'Please select your preferred language:',
        [
          { id: 'lang_en', text: 'English' },
          { id: 'lang_fr', text: 'Français' },
          { id: 'lang_es', text: 'Español' },
        ],
        'Language Selection',
      );

      await this.userService.updateSession(session.id, {
        currentStep: ConversationStep.LANGUAGE_SELECTION,
      });
    } else {
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        `Hi! Type "start" to create your professional CV.`,
      );
    }
  }

  private async handleLanguageSelection(
    phoneNumber: string,
    session: ConversationSession,
    message: string,
  ): Promise<void> {
    let selectedLanguage = 'en';
    const lowerMessage = message.toLowerCase();

    if (message.includes('lang_fr') || lowerMessage.includes('french') || lowerMessage.includes('français') || lowerMessage.includes('francais') || lowerMessage === '2') {
      selectedLanguage = 'fr';
    } else if (message.includes('lang_es') || lowerMessage.includes('spanish') || lowerMessage.includes('español') || lowerMessage.includes('espanol') || lowerMessage === '3') {
      selectedLanguage = 'es';
    } else if (message.includes('lang_en') || lowerMessage.includes('english') || lowerMessage === '1') {
      selectedLanguage = 'en';
    }

    // Update session language
    session.language = selectedLanguage;
    await this.userService.updateSession(session.id, {
      currentStep: ConversationStep.PERSONAL_INFO,
    });

    const messages = {
      en: `Great! Let's start with your personal information.\n\nPlease provide:\n- Full Name\n- Email\n- Phone Number\n- City and Country\n\nYou can send it all in one message or separately.`,
      fr: `Parfait! Commençons par vos informations personnelles.\n\nVeuillez fournir:\n- Nom complet\n- Email\n- Numéro de téléphone\n- Ville et pays\n\nVous pouvez tout envoyer en un seul message ou séparément.`,
      es: `¡Genial! Comencemos con tu información personal.\n\nPor favor proporciona:\n- Nombre completo\n- Correo electrónico\n- Número de teléfono\n- Ciudad y país\n\nPuedes enviarlo todo en un mensaje o por separado.`,
    };

    await this.whatsappService.sendTextMessage(
      phoneNumber,
      messages[selectedLanguage] || messages.en,
    );
  }

  private async handlePersonalInfo(
    phoneNumber: string,
    session: ConversationSession,
    message: string,
  ): Promise<void> {
    try {
      // Extract structured information using OpenAI
      const personalInfo = await this.openaiService.extractStructuredInfo(
        message,
        'personal_info',
      );

      // Update session data
      session.data.personalInfo = {
        ...session.data.personalInfo,
        ...personalInfo,
      };

      await this.userService.updateSession(session.id, {
        data: session.data,
      });

      // Check if we have minimum required info
      if (personalInfo.firstName && personalInfo.email) {
        // We have complete basic info, move to work experience
        await this.userService.updateSession(session.id, {
          currentStep: ConversationStep.WORK_EXPERIENCE,
          data: session.data,
        });

        const messages = {
          en: `Perfect! Now let's add your work experience.\n\nFor each position, please provide:\n- Company name\n- Job title\n- Start date and end date (or "current")\n- Brief description of your responsibilities\n\nSend "done" when you've added all your work experiences.`,
          fr: `Parfait! Maintenant, ajoutons votre expérience professionnelle.\n\nPour chaque poste, veuillez fournir:\n- Nom de l'entreprise\n- Titre du poste\n- Date de début et de fin (ou "actuel")\n- Brève description de vos responsabilités\n\nEnvoyez "terminé" lorsque vous avez ajouté toutes vos expériences.`,
          es: `¡Perfecto! Ahora agreguemos tu experiencia laboral.\n\nPara cada puesto, proporciona:\n- Nombre de la empresa\n- Título del puesto\n- Fecha de inicio y fin (o "actual")\n- Breve descripción de tus responsabilidades\n\nEnvía "listo" cuando hayas agregado todas tus experiencias.`,
        };

        await this.whatsappService.sendTextMessage(
          phoneNumber,
          messages[session.language] || messages.en,
        );
      } else if (personalInfo.firstName) {
        // We have name but missing email - ask for it
        const messages = {
          en: `Great! I got your name: ${personalInfo.firstName} ${personalInfo.lastName || ''}.\n\nNow, please provide your email address.`,
          fr: `Super! J'ai bien noté votre nom: ${personalInfo.firstName} ${personalInfo.lastName || ''}.\n\nMaintenant, veuillez fournir votre adresse email.`,
          es: `¡Genial! Tengo tu nombre: ${personalInfo.firstName} ${personalInfo.lastName || ''}.\n\nAhora, por favor proporciona tu dirección de correo electrónico.`,
        };
        await this.whatsappService.sendTextMessage(
          phoneNumber,
          messages[session.language] || messages.en,
        );
      } else {
        // Missing name - ask for basic info
        const messages = {
          en: 'Please provide at least your name to continue.',
          fr: 'Veuillez fournir au moins votre nom pour continuer.',
          es: 'Por favor proporciona al menos tu nombre para continuar.',
        };
        await this.whatsappService.sendTextMessage(
          phoneNumber,
          messages[session.language] || messages.en,
        );
      }
    } catch (error) {
      this.logger.error(`Error handling personal info: ${error.message}`);
      const messages = {
        en: 'Could you please provide your information again? Make sure to include your name and email.',
        fr: 'Pourriez-vous fournir vos informations à nouveau ? Assurez-vous d\'inclure votre nom et votre email.',
        es: '¿Podría proporcionar su información nuevamente? Asegúrese de incluir su nombre y correo electrónico.',
      };
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        messages[session.language] || messages.en,
      );
    }
  }

  private async handleWorkExperience(
    phoneNumber: string,
    session: ConversationSession,
    message: string,
  ): Promise<void> {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage === 'done' ||
      lowerMessage === 'terminé' ||
      lowerMessage === 'listo' ||
      lowerMessage === 'next'
    ) {
      // Move to education
      await this.userService.updateSession(session.id, {
        currentStep: ConversationStep.EDUCATION,
      });

      const messages = {
        en: `Great! Now let's add your education.\n\nFor each degree/certification, provide:\n- Institution name\n- Degree/Certification\n- Field of study\n- Graduation year (or "current")\n\nSend "done" when finished, or "skip" if you want to skip this section.`,
        fr: `Super! Maintenant, ajoutons votre formation.\n\nPour chaque diplôme/certification, fournissez:\n- Nom de l'établissement\n- Diplôme/Certification\n- Domaine d'études\n- Année d'obtention (ou "actuel")\n\nEnvoyez "terminé" ou "passer" pour sauter cette section.`,
        es: `¡Genial! Ahora agreguemos tu educación.\n\nPara cada título/certificación, proporciona:\n- Nombre de la institución\n- Título/Certificación\n- Campo de estudio\n- Año de graduación (o "actual")\n\nEnvía "listo" o "omitir" para saltar esta sección.`,
      };

      await this.whatsappService.sendTextMessage(
        phoneNumber,
        messages[session.language] || messages.en,
      );
      return;
    }

    try {
      // Extract work experience using OpenAI
      const workExpData = await this.openaiService.extractStructuredInfo(
        message,
        'work_experience',
      );

      if (workExpData.companyName && workExpData.position) {
        const workExp: WorkExperience = {
          companyName: workExpData.companyName,
          position: workExpData.position,
          location: workExpData.location,
          startDate: workExpData.startDate,
          endDate: workExpData.endDate,
          isCurrent: workExpData.isCurrent || false,
          description: workExpData.description || '',
        };

        // Optimize description using OpenAI
        if (workExp.description) {
          workExp.optimizedDescription =
            await this.openaiService.optimizeWorkExperience(
              workExp,
              session.language,
            );
        }

        // Add to session data
        if (!session.data.workExperiences) {
          session.data.workExperiences = [];
        }
        session.data.workExperiences.push(workExp);

        // Save to database
        await this.userService.saveWorkExperience(session.id, workExp);
        await this.userService.updateSession(session.id, {
          data: session.data,
        });

        await this.whatsappService.sendTextMessage(
          phoneNumber,
          `✅ Work experience added!\n\nAdd another position or send "done" to continue.`,
        );
      } else {
        await this.whatsappService.sendTextMessage(
          phoneNumber,
          'Please provide at least the company name and your job title.',
        );
      }
    } catch (error) {
      this.logger.error(`Error handling work experience: ${error.message}`);
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        'Could you please provide the work experience details again?',
      );
    }
  }

  private async handleEducation(
    phoneNumber: string,
    session: ConversationSession,
    message: string,
  ): Promise<void> {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage === 'done' ||
      lowerMessage === 'terminé' ||
      lowerMessage === 'listo' ||
      lowerMessage === 'skip' ||
      lowerMessage === 'passer' ||
      lowerMessage === 'omitir'
    ) {
      await this.userService.updateSession(session.id, {
        currentStep: ConversationStep.SKILLS,
      });

      const messages = {
        en: `Excellent! Now let's add your skills.\n\nList your key skills separated by commas.\nFor example: "JavaScript, Python, Project Management, Communication"\n\nYou can also categorize them if you like.`,
        fr: `Excellent! Maintenant, ajoutons vos compétences.\n\nListez vos compétences clés séparées par des virgules.\nPar exemple: "JavaScript, Python, Gestion de projet, Communication"`,
        es: `¡Excelente! Ahora agreguemos tus habilidades.\n\nEnumera tus habilidades clave separadas por comas.\nPor ejemplo: "JavaScript, Python, Gestión de proyectos, Comunicación"`,
      };

      await this.whatsappService.sendTextMessage(
        phoneNumber,
        messages[session.language] || messages.en,
      );
      return;
    }

    try {
      const educationData = await this.openaiService.extractStructuredInfo(
        message,
        'education',
      );

      if (educationData.institution && educationData.degree) {
        const education: Education = {
          institution: educationData.institution,
          degree: educationData.degree,
          fieldOfStudy: educationData.fieldOfStudy,
          location: educationData.location,
          startDate: educationData.startDate,
          endDate: educationData.endDate,
          isCurrent: educationData.isCurrent || false,
          gpa: educationData.gpa,
        };

        if (!session.data.education) {
          session.data.education = [];
        }
        session.data.education.push(education);

        await this.userService.saveEducation(session.id, education);
        await this.userService.updateSession(session.id, {
          data: session.data,
        });

        await this.whatsappService.sendTextMessage(
          phoneNumber,
          `✅ Education added!\n\nAdd another or send "done" to continue.`,
        );
      } else {
        await this.whatsappService.sendTextMessage(
          phoneNumber,
          'Please provide at least the institution name and degree.',
        );
      }
    } catch (error) {
      this.logger.error(`Error handling education: ${error.message}`);
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        'Could you please provide the education details again?',
      );
    }
  }

  private async handleSkills(
    phoneNumber: string,
    session: ConversationSession,
    message: string,
  ): Promise<void> {
    try {
      // Extract skills from message
      const skillsData = await this.openaiService.extractStructuredInfo(
        message,
        'skills',
      );

      let skills: Skill[] = [];

      if (Array.isArray(skillsData.skills)) {
        skills = skillsData.skills.map((skill: any) => ({
          name: typeof skill === 'string' ? skill : skill.name,
          category: skill.category || 'general',
          proficiency: skill.proficiency,
        }));
      } else if (typeof message === 'string') {
        // Parse comma-separated skills
        const skillNames = message.split(',').map((s) => s.trim());
        skills = skillNames.map((name) => ({
          name,
          category: 'general',
        }));
      }

      if (skills.length > 0) {
        session.data.skills = skills;

        await this.userService.saveSkills(session.id, skills);
        await this.userService.updateSession(session.id, {
          currentStep: ConversationStep.LANGUAGES_KNOWN,
          data: session.data,
        });

        const messages = {
          en: `Perfect! ${skills.length} skills added.\n\nNow, what languages do you speak?\nProvide language and proficiency level.\nExample: "English (Native), French (Professional), Spanish (Basic)"\n\nOr send "skip" to continue.`,
          fr: `Parfait! ${skills.length} compétences ajoutées.\n\nMaintenant, quelles langues parlez-vous?\nIndiquez la langue et le niveau.\nExemple: "Français (Natif), Anglais (Professionnel), Espagnol (Base)"\n\nOu envoyez "passer".`,
          es: `¡Perfecto! ${skills.length} habilidades agregadas.\n\n¿Qué idiomas hablas?\nProporciona idioma y nivel de competencia.\nEjemplo: "Español (Nativo), Inglés (Profesional), Francés (Básico)"\n\nO envía "omitir".`,
        };

        await this.whatsappService.sendTextMessage(
          phoneNumber,
          messages[session.language] || messages.en,
        );
      } else {
        await this.whatsappService.sendTextMessage(
          phoneNumber,
          'Please list your skills separated by commas.',
        );
      }
    } catch (error) {
      this.logger.error(`Error handling skills: ${error.message}`);
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        'Could you please list your skills again?',
      );
    }
  }

  private async handleLanguages(
    phoneNumber: string,
    session: ConversationSession,
    message: string,
  ): Promise<void> {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage === 'skip' ||
      lowerMessage === 'passer' ||
      lowerMessage === 'omitir'
    ) {
      await this.proceedToTemplateSelection(phoneNumber, session);
      return;
    }

    try {
      // Parse languages
      const languagesData = await this.openaiService.extractStructuredInfo(
        message,
        'languages',
      );

      if (languagesData.languages && Array.isArray(languagesData.languages)) {
        session.data.languages = languagesData.languages;
      } else {
        // Simple parsing
        session.data.languages = [
          { name: message, proficiency: 'professional' },
        ];
      }

      await this.userService.updateSession(session.id, {
        data: session.data,
      });

      await this.proceedToTemplateSelection(phoneNumber, session);
    } catch (error) {
      this.logger.error(`Error handling languages: ${error.message}`);
      await this.proceedToTemplateSelection(phoneNumber, session);
    }
  }

  private async handleCertifications(
    phoneNumber: string,
    session: ConversationSession,
    message: string,
  ): Promise<void> {
    // Similar implementation to other handlers
    await this.proceedToTemplateSelection(phoneNumber, session);
  }

  private async proceedToTemplateSelection(
    phoneNumber: string,
    session: ConversationSession,
  ): Promise<void> {
    await this.userService.updateSession(session.id, {
      currentStep: ConversationStep.TEMPLATE_SELECTION,
    });

    const messages = {
      en: `Great! All information collected.\n\n📋 Now choose a CV template:`,
      fr: `Super! Toutes les informations collectées.\n\n📋 Choisissez maintenant un modèle de CV:`,
      es: `¡Genial! Toda la información recopilada.\n\n📋 Ahora elige una plantilla de CV:`,
    };

    await this.whatsappService.sendTextMessage(
      phoneNumber,
      messages[session.language] || messages.en,
    );

    // Get all available templates from PDFService
    const templates = this.pdfService.getAvailableTemplates();

    // Group templates by category for better organization
    const categories = {
      modern: templates.filter(t => t.category === 'modern'),
      traditional: templates.filter(t => t.category === 'traditional'),
      creative: templates.filter(t => t.category === 'creative'),
      functional: templates.filter(t => t.category === 'functional'),
      executive: templates.filter(t => t.category === 'executive'),
    };

    // Send template options by category
    const categoryMessages = {
      en: {
        modern: '🎨 *Modern Templates*\n',
        traditional: '📰 *Traditional Templates*\n',
        creative: '✨ *Creative Templates*\n',
        functional: '📊 *Functional Templates*\n',
        executive: '👔 *Executive Templates*\n',
      },
      fr: {
        modern: '🎨 *Modèles Modernes*\n',
        traditional: '📰 *Modèles Traditionnels*\n',
        creative: '✨ *Modèles Créatifs*\n',
        functional: '📊 *Modèles Fonctionnels*\n',
        executive: '👔 *Modèles Exécutifs*\n',
      },
      es: {
        modern: '🎨 *Plantillas Modernas*\n',
        traditional: '📰 *Plantillas Tradicionales*\n',
        creative: '✨ *Plantillas Creativas*\n',
        functional: '📊 *Plantillas Funcionales*\n',
        executive: '👔 *Plantillas Ejecutivas*\n',
      },
    };

    const lang = session.language || 'en';
    let templateMessage = '';

    // Build template list message
    Object.entries(categories).forEach(([category, templates]) => {
      if (templates.length > 0) {
        templateMessage += categoryMessages[lang][category];
        templates.forEach((template, idx) => {
          templateMessage += `\n${template.id}) *${template.name}*\n   ${template.description}\n   ✓ ${template.features.join(', ')}`;
          if (idx < templates.length - 1) templateMessage += '\n';
        });
        templateMessage += '\n\n';
      }
    });

    // Send preview gallery link
    const previewMessages = {
      en: `${templateMessage}📸 View all template previews: http://localhost:3000/templates.html\n\n💡 Reply with the template ID (e.g., "modern", "vibrant-professional", "classic")`,
      fr: `${templateMessage}📸 Voir tous les aperçus: http://localhost:3000/templates.html\n\n💡 Répondez avec l'ID du modèle (ex: "modern", "vibrant-professional", "classic")`,
      es: `${templateMessage}📸 Ver todas las vistas previas: http://localhost:3000/templates.html\n\n💡 Responde con el ID de la plantilla (ej: "modern", "vibrant-professional", "classic")`,
    };

    await this.whatsappService.sendTextMessage(
      phoneNumber,
      previewMessages[lang] || previewMessages.en,
    );
  }

  private async handleTemplateSelection(
    phoneNumber: string,
    session: ConversationSession,
    message: string,
  ): Promise<void> {
    // Get all available templates
    const templates = this.pdfService.getAvailableTemplates();

    // Clean up the message to extract template ID
    const templateInput = message.toLowerCase().trim();

    // Try to find matching template
    let selectedTemplate = templates.find(t =>
      t.id === templateInput ||
      t.name.toLowerCase().includes(templateInput) ||
      templateInput.includes(t.id)
    );

    // If no match, default to modern
    if (!selectedTemplate) {
      selectedTemplate = templates.find(t => t.id === 'modern') || templates[0];

      const errorMessages = {
        en: `Template "${message}" not found. Using "Modern Professional" template instead.`,
        fr: `Modèle "${message}" non trouvé. Utilisation du modèle "Modern Professional" à la place.`,
        es: `Plantilla "${message}" no encontrada. Usando la plantilla "Modern Professional" en su lugar.`,
      };

      await this.whatsappService.sendTextMessage(
        phoneNumber,
        errorMessages[session.language] || errorMessages.en,
      );
    }

    // Save selected template to session data
    session.data.selectedTemplate = selectedTemplate.id;

    await this.userService.updateSession(session.id, {
      currentStep: ConversationStep.GENERATION,
      data: session.data,
    });

    const confirmMessages = {
      en: `✅ Template selected: *${selectedTemplate.name}*\n\n🎨 Generating your professional CV...\n\nThis will take a moment. ⏳`,
      fr: `✅ Modèle sélectionné: *${selectedTemplate.name}*\n\n🎨 Génération de votre CV professionnel...\n\nCela prendra un moment. ⏳`,
      es: `✅ Plantilla seleccionada: *${selectedTemplate.name}*\n\n🎨 Generando tu CV profesional...\n\nEsto tomará un momento. ⏳`,
    };

    await this.whatsappService.sendTextMessage(
      phoneNumber,
      confirmMessages[session.language] || confirmMessages.en,
    );

    // Trigger CV generation (will be handled by CV generation service)
    // For now, just update status
    await this.userService.updateSession(session.id, {
      status: SessionStatus.COMPLETED,
    });
  }

  private async handleReview(
    phoneNumber: string,
    session: ConversationSession,
    message: string,
  ): Promise<void> {
    // Implementation for review step
  }

  private async getUserBySessionId(sessionId: string): Promise<any> {
    // Helper method to get user info from session
    const { data, error } = await (
      this.userService as any
    ).supabase
      .from('conversation_sessions')
      .select('user_id, users(*)')
      .eq('id', sessionId)
      .single();

    return data?.users || { phoneNumber: '' };
  }

  /**
   * Normalize OpenAI's conversation step response to match database enum values.
   * OpenAI returns uppercase enum keys (e.g., "LANGUAGE_SELECTION")
   * but database expects lowercase values (e.g., "language_selection")
   */
  private normalizeConversationStep(step: string): ConversationStep {
    // Handle undefined or null step
    if (!step) {
      this.logger.warn('Received undefined/null conversation step, defaulting to GREETING');
      return ConversationStep.GREETING;
    }

    // Create mapping from uppercase to enum values
    const stepMapping: Record<string, ConversationStep> = {
      'GREETING': ConversationStep.GREETING,
      'LANGUAGE_SELECTION': ConversationStep.LANGUAGE_SELECTION,
      'PERSONAL_INFO': ConversationStep.PERSONAL_INFO,
      'WORK_EXPERIENCE': ConversationStep.WORK_EXPERIENCE,
      'EDUCATION': ConversationStep.EDUCATION,
      'SKILLS': ConversationStep.SKILLS,
      'LANGUAGES_KNOWN': ConversationStep.LANGUAGES_KNOWN,
      'CERTIFICATIONS': ConversationStep.CERTIFICATIONS,
      'PROFESSIONAL_SUMMARY': ConversationStep.PROFESSIONAL_SUMMARY,
      'CV_PICTURE': ConversationStep.CV_PICTURE,
      'TEMPLATE_SELECTION': ConversationStep.TEMPLATE_SELECTION,
      'REVIEW': ConversationStep.REVIEW,
      'GENERATION': ConversationStep.GENERATION,
      'COMPLETED': ConversationStep.COMPLETED,
    };

    // Return mapped value or try to use as-is if it's already lowercase
    return stepMapping[step] || (step.toLowerCase() as ConversationStep);
  }

  /**
   * Handle image messages (for profile picture upload)
   */
  async handleImageMessage(
    phoneNumber: string,
    mediaId: string,
    mediaUrl?: string,
  ): Promise<void> {
    try {
      this.logger.log(`Processing image from ${phoneNumber}, mediaId: ${mediaId}`);

      const user = await this.userService.findOrCreateUser(phoneNumber);
      const session = await this.userService.getActiveSession(user.id);

      if (!session) {
        await this.whatsappService.sendTextMessage(
          phoneNumber,
          "Désolé, je n'ai pas trouvé de session active. Envoyez 'bonjour' pour recommencer.",
        );
        return;
      }

      // Debug: Log current step info
      this.logger.log(`📸 IMAGE RECEIVED - Current step: "${session.currentStep}" (expected: "${ConversationStep.CV_PICTURE}")`);
      this.logger.log(`📸 Step comparison: currentStep="${session.currentStep}" === CV_PICTURE="${ConversationStep.CV_PICTURE}" ? ${session.currentStep === ConversationStep.CV_PICTURE}`);

      // EXPANDED ACCEPTABLE STEPS:
      // Accept images during multiple steps to handle edge cases where:
      // - Step wasn't updated yet after user confirmed summary
      // - User sent photo before OpenAI response was processed
      // - Flow variations where photo is sent earlier/later
      const acceptableSteps = [
        ConversationStep.CV_PICTURE,           // Primary expected step
        ConversationStep.PROFESSIONAL_SUMMARY, // Just before cv_picture
        ConversationStep.LANGUAGES_KNOWN,      // If professional_summary was skipped
        ConversationStep.TEMPLATE_SELECTION,   // If they send photo late, still accept
      ];
      const isAcceptableStep = acceptableSteps.includes(session.currentStep as ConversationStep);

      // SAFETY NET: If we have a professional summary (meaning we passed that step),
      // ALWAYS accept photos regardless of what step we think we're at
      const hasProfessionalSummary = !!session.data?.professionalSummary;
      const forceAcceptPhoto = hasProfessionalSummary && !session.data?.cvPictureUrl;

      if (!isAcceptableStep && !forceAcceptPhoto) {
        this.logger.warn(`📸 REJECTED - Step "${session.currentStep}" not in acceptable steps: ${acceptableSteps.join(', ')}, hasSummary=${hasProfessionalSummary}`);
        await this.whatsappService.sendTextMessage(
          phoneNumber,
          session.language === 'fr'
            ? "Je n'attends pas de photo pour le moment. Continuons avec les informations textuelles."
            : "I'm not expecting a photo right now. Let's continue with text information.",
        );
        return;
      }

      if (forceAcceptPhoto && !isAcceptableStep) {
        this.logger.log(`📸 FORCE ACCEPT - Has professional summary, no CV picture yet. Overriding step check.`);
      }

      this.logger.log(`📸 ACCEPTED - Processing image at step "${session.currentStep}"`);

      // Download the image
      this.logger.log('Downloading image from WhatsApp...');
      const imageBuffer = await this.whatsappService.downloadImage(mediaId, mediaUrl);

      // Convert buffer to base64 for OpenAI Vision API
      const base64Image = imageBuffer.toString('base64');
      const dataUrl = `data:image/jpeg;base64,${base64Image}`;

      // Analyze the image with OpenAI Vision (determines if photo is suitable for CV)
      this.logger.log('Analyzing image with OpenAI Vision...');
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        session.language === 'fr'
          ? '📸 Analyse de votre photo en cours...'
          : '📸 Analyzing your photo...',
      );

      const analysis = await this.openaiService.analyzeCVPicture(dataUrl, session.language);

      if (analysis.isSuitable) {
        // Image is suitable - upload to storage
        this.logger.log('Image is suitable for CV, uploading to storage...');

        const fileName = `cv-picture-${user.id}-${Date.now()}.jpg`;
        const { key, url } = await this.storageService.uploadFile(
          imageBuffer,
          fileName,
          'image/jpeg',
          'cv-pictures',
        );

        // Update session with CV picture
        session.data.cvPictureUrl = url;
        session.data.cvPictureS3Key = key;
        await this.userService.updateSession(session.id, {
          data: session.data,
          currentStep: ConversationStep.TEMPLATE_SELECTION,
        });

        await this.whatsappService.sendTextMessage(
          phoneNumber,
          session.language === 'fr'
            ? `✅ Parfait ! Votre photo a été ajoutée à votre CV.\n\n${analysis.reason}\n\nPassons maintenant au choix du modèle de CV.`
            : `✅ Perfect! Your photo has been added to your CV.\n\n${analysis.reason}\n\nNow let's choose your CV template.`,
        );

        // Move to template selection and show templates directly
        session.currentStep = ConversationStep.TEMPLATE_SELECTION;
        await this.userService.updateSession(session.id, {
          currentStep: ConversationStep.TEMPLATE_SELECTION,
        });

        // Show template options directly without going through OpenAI again
        await this.proceedToTemplateSelection(phoneNumber, session);
      } else {
        // Image is not suitable - automatically generate a professional one with Gemini
        this.logger.log('Image is not suitable for CV, generating professional one with Gemini...');

        let feedbackMessage = session.language === 'fr'
          ? `❌ Cette photo n'est pas idéale pour un CV professionnel.\n\n**Raison:** ${analysis.reason}\n\n🎨 Génération automatique d'une photo professionnelle en cours...`
          : `❌ This photo is not ideal for a professional CV.\n\n**Reason:** ${analysis.reason}\n\n🎨 Automatically generating a professional photo...`;

        await this.whatsappService.sendTextMessage(phoneNumber, feedbackMessage);

        try {
          // Build a description based on user's profession/role from CV data
          const jobTitle = session.data.workExperiences?.[0]?.position || session.data.professionalSummary || 'professional';
          const description = `working as ${jobTitle}`;

          // Generate professional CV picture with Gemini
          const generatedImageBase64 = await this.geminiService.generateProfessionalCVPicture(
            description,
            session.language,
            base64Image,  // Pass the original image for editing
          );

          // Convert base64 to buffer
          const generatedImageBuffer = Buffer.from(generatedImageBase64, 'base64');

          // Upload generated image to storage
          const fileName = `cv-picture-generated-${user.id}-${Date.now()}.jpg`;
          const { key, url } = await this.storageService.uploadFile(
            generatedImageBuffer,
            fileName,
            'image/jpeg',
            'cv-pictures',
          );

          // Update session with generated CV picture
          session.data.cvPictureUrl = url;
          session.data.cvPictureS3Key = key;
          await this.userService.updateSession(session.id, {
            data: session.data,
            currentStep: ConversationStep.TEMPLATE_SELECTION,
          });

          await this.whatsappService.sendTextMessage(
            phoneNumber,
            session.language === 'fr'
              ? `✅ Parfait ! J'ai généré une photo professionnelle pour votre CV.\n\nPassons maintenant au choix du modèle de CV.`
              : `✅ Perfect! I've generated a professional photo for your CV.\n\nNow let's choose your CV template.`,
          );

          // Move to template selection and show templates directly
          session.currentStep = ConversationStep.TEMPLATE_SELECTION;
          await this.userService.updateSession(session.id, {
            currentStep: ConversationStep.TEMPLATE_SELECTION,
          });

          // Show template options directly without going through OpenAI again
          await this.proceedToTemplateSelection(phoneNumber, session);

        } catch (generationError) {
          this.logger.error(`Failed to generate professional image: ${generationError.message}`);

          // Fallback: continue without picture
          await this.whatsappService.sendTextMessage(
            phoneNumber,
            session.language === 'fr'
              ? `Désolé, je n'ai pas pu générer une photo professionnelle. Nous allons continuer sans photo.\n\nPassons maintenant au choix du modèle de CV.`
              : `Sorry, I couldn't generate a professional photo. We'll continue without a photo.\n\nNow let's choose your CV template.`,
          );

          // Move to template selection without CV picture
          session.currentStep = ConversationStep.TEMPLATE_SELECTION;
          await this.userService.updateSession(session.id, {
            currentStep: ConversationStep.TEMPLATE_SELECTION,
          });

          // Show template options directly without going through OpenAI again
          await this.proceedToTemplateSelection(phoneNumber, session);
        }
      }
    } catch (error) {
      this.logger.error(`Error processing image: ${error.message}`);
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        'Sorry, an error occurred while processing your image. Please try again.',
      );
    }
  }
}
