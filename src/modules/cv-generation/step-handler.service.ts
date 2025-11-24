import { Injectable, Logger } from '@nestjs/common';
import { AdminService } from '../admin/admin.service';
import {
  ConversationStep,
  CVData,
} from '../../common/interfaces/cv-data.interface';

/**
 * StepHandlerService - Deterministic conversation flow controller
 *
 * This service controls the CV generation flow based on admin configuration.
 * It determines:
 * - What data is required at each step
 * - When to advance to the next step
 * - When to trigger content proposals
 * - Whether a field can be skipped
 */
@Injectable()
export class StepHandlerService {
  private readonly logger = new Logger(StepHandlerService.name);

  // Maps conversation steps to field names in admin config
  private readonly stepToFieldMap: Record<string, string> = {
    [ConversationStep.PERSONAL_INFO]: 'personalInfo',
    [ConversationStep.WORK_EXPERIENCE]: 'workExperience',
    [ConversationStep.EDUCATION]: 'education',
    [ConversationStep.SKILLS]: 'skills',
    [ConversationStep.LANGUAGES_KNOWN]: 'languages',
    [ConversationStep.PROFESSIONAL_SUMMARY]: 'professionalSummary',
    [ConversationStep.CERTIFICATIONS]: 'certifications',
  };

  // Ordered list of CV collection steps
  private readonly stepOrder: ConversationStep[] = [
    ConversationStep.GREETING,
    ConversationStep.LANGUAGE_SELECTION,
    ConversationStep.PERSONAL_INFO,
    ConversationStep.WORK_EXPERIENCE,
    ConversationStep.EDUCATION,
    ConversationStep.SKILLS,
    ConversationStep.LANGUAGES_KNOWN,
    ConversationStep.PROFESSIONAL_SUMMARY,
    ConversationStep.CV_PICTURE,
    ConversationStep.TEMPLATE_SELECTION,
    ConversationStep.REVIEW,
    ConversationStep.GENERATION,
    ConversationStep.COMPLETED,
  ];

  constructor(private adminService: AdminService) {}

  /**
   * Check if a step is mandatory based on admin config
   */
  isStepMandatory(step: ConversationStep): boolean {
    const fieldName = this.stepToFieldMap[step];
    if (!fieldName) {
      // Steps not mapped to fields (greeting, language_selection, cv_picture, template_selection) have special handling
      // greeting and language_selection are always mandatory
      // cv_picture and template_selection are optional
      if (step === ConversationStep.GREETING || step === ConversationStep.LANGUAGE_SELECTION) {
        return true;
      }
      return false;
    }
    return this.adminService.isFieldMandatory(fieldName);
  }

  /**
   * Check if a step should propose content based on admin config
   */
  shouldProposeContent(step: ConversationStep): boolean {
    const fieldName = this.stepToFieldMap[step];
    if (!fieldName) return false;
    return this.adminService.shouldProposeContent(fieldName);
  }

  /**
   * Check if user can skip the current step
   */
  canSkipStep(step: ConversationStep): boolean {
    return !this.isStepMandatory(step);
  }

  /**
   * Check if user's message indicates they want to skip
   */
  isSkipMessage(message: string): boolean {
    const lowerMsg = message.toLowerCase().trim();

    // Exact matches or word boundaries for short words like "non", "no"
    const exactSkipPatterns = ['non', 'no', 'none', 'rien', 'nothing'];
    for (const pattern of exactSkipPatterns) {
      // Check if it's the entire message or surrounded by word boundaries
      const regex = new RegExp(`(^|\\s|[.,!?])${pattern}($|\\s|[.,!?])`, 'i');
      if (regex.test(lowerMsg)) {
        return true;
      }
    }

    // Phrase patterns that indicate skip intent
    const phraseSkipPatterns = [
      'skip', 'passer', 'aucun', 'aucune', 'pas de ',
      'je n\'ai pas', 'je nai pas', 'j\'ai pas', 'jai pas',
      'pas d\'', 'pas encore', 'not yet', 'later', 'plus tard',
      'je passe', 'on passe', 'sauter', 'ignorer'
    ];
    return phraseSkipPatterns.some(pattern => lowerMsg.includes(pattern));
  }

  /**
   * Check if user's message indicates confirmation
   */
  isConfirmationMessage(message: string): boolean {
    const confirmPatterns = [
      'oui', 'yes', 'ok', 'okay', 'd\'accord', 'daccord', 'parfait',
      'super', 'génial', 'genial', 'c\'est bon', 'cest bon', 'correct',
      'exactement', 'bien', 'merci', 'thanks', 'valider', 'confirme'
    ];
    const lowerMsg = message.toLowerCase().trim();
    return confirmPatterns.some(pattern => lowerMsg.includes(pattern));
  }

  /**
   * Get the next step in the flow
   */
  getNextStep(currentStep: ConversationStep): ConversationStep {
    const currentIndex = this.stepOrder.indexOf(currentStep);
    if (currentIndex === -1 || currentIndex >= this.stepOrder.length - 1) {
      return ConversationStep.COMPLETED;
    }
    return this.stepOrder[currentIndex + 1];
  }

  /**
   * Check if step requirements are met to advance
   */
  areStepRequirementsMet(step: ConversationStep, data: CVData): { met: boolean; missing: string[] } {
    const missing: string[] = [];

    switch (step) {
      case ConversationStep.PERSONAL_INFO:
        // Mandatory: firstName, email, phone
        if (!data.personalInfo?.firstName) missing.push('name');
        if (!data.personalInfo?.email) missing.push('email');
        if (!data.personalInfo?.phone) missing.push('phone');
        break;

      case ConversationStep.WORK_EXPERIENCE:
        // If mandatory and no experiences, still need data
        if (this.isStepMandatory(step) && (!data.workExperiences || data.workExperiences.length === 0)) {
          missing.push('work_experience');
        }
        break;

      case ConversationStep.EDUCATION:
        if (this.isStepMandatory(step) && (!data.education || data.education.length === 0)) {
          missing.push('education');
        }
        break;

      case ConversationStep.SKILLS:
        if (this.isStepMandatory(step) && (!data.skills || data.skills.length === 0)) {
          missing.push('skills');
        }
        break;

      case ConversationStep.LANGUAGES_KNOWN:
        if (this.isStepMandatory(step) && (!data.languages || data.languages.length === 0)) {
          missing.push('languages');
        }
        break;

      case ConversationStep.PROFESSIONAL_SUMMARY:
        if (this.isStepMandatory(step) && !data.professionalSummary) {
          missing.push('professional_summary');
        }
        break;

      case ConversationStep.TEMPLATE_SELECTION:
        if (!data.selectedTemplate) {
          missing.push('template');
        }
        break;

      default:
        // Other steps have no data requirements
        break;
    }

    return { met: missing.length === 0, missing };
  }

  /**
   * Determine what action to take based on current state
   */
  determineAction(
    currentStep: ConversationStep,
    message: string,
    data: CVData,
  ): {
    action: 'ask' | 'advance' | 'skip' | 'propose' | 'confirm_proposal' | 'reject_proposal' | 'complete';
    nextStep: ConversationStep;
    reason: string;
  } {
    const isSkip = this.isSkipMessage(message);
    const isConfirm = this.isConfirmationMessage(message);
    const requirements = this.areStepRequirementsMet(currentStep, data);
    const canSkip = this.canSkipStep(currentStep);
    const shouldPropose = this.shouldProposeContent(currentStep);

    this.logger.log(`📊 Step Analysis: step=${currentStep}, isSkip=${isSkip}, isConfirm=${isConfirm}, reqMet=${requirements.met}, canSkip=${canSkip}, shouldPropose=${shouldPropose}`);

    // Handle GREETING and LANGUAGE_SELECTION - always advance after any response
    if (currentStep === ConversationStep.GREETING) {
      return {
        action: 'advance',
        nextStep: ConversationStep.LANGUAGE_SELECTION,
        reason: 'Greeting received, moving to language selection',
      };
    }

    if (currentStep === ConversationStep.LANGUAGE_SELECTION) {
      return {
        action: 'advance',
        nextStep: ConversationStep.PERSONAL_INFO,
        reason: 'Language selected, moving to personal info',
      };
    }

    // Handle skip requests
    if (isSkip) {
      if (canSkip) {
        return {
          action: 'skip',
          nextStep: this.getNextStep(currentStep),
          reason: `User wants to skip ${currentStep}, and it's optional`,
        };
      } else {
        return {
          action: 'ask',
          nextStep: currentStep,
          reason: `User wants to skip ${currentStep}, but it's MANDATORY`,
        };
      }
    }

    // Handle confirmation at steps with proposals
    if (isConfirm && shouldPropose) {
      // Check if we have proposed content that user is confirming
      if (currentStep === ConversationStep.PROFESSIONAL_SUMMARY && data.professionalSummary) {
        return {
          action: 'confirm_proposal',
          nextStep: ConversationStep.CV_PICTURE,
          reason: 'User confirmed professional summary proposal',
        };
      }
      if (currentStep === ConversationStep.SKILLS && data.skills && data.skills.length > 0) {
        return {
          action: 'confirm_proposal',
          nextStep: this.getNextStep(currentStep),
          reason: 'User confirmed skills proposal',
        };
      }
      if (currentStep === ConversationStep.WORK_EXPERIENCE && data.workExperiences && data.workExperiences.length > 0) {
        // Check if last work experience has optimized description
        const lastExp = data.workExperiences[data.workExperiences.length - 1];
        if (lastExp?.optimizedDescription) {
          return {
            action: 'confirm_proposal',
            nextStep: currentStep, // Stay to ask if more experiences
            reason: 'User confirmed optimized work description',
          };
        }
      }
    }

    // Handle confirmation at LANGUAGES_KNOWN - advance to professional summary
    if (isConfirm && currentStep === ConversationStep.LANGUAGES_KNOWN) {
      if (data.languages && data.languages.length > 0) {
        return {
          action: 'advance',
          nextStep: ConversationStep.PROFESSIONAL_SUMMARY,
          reason: 'User confirmed languages, advancing to professional summary',
        };
      }
    }

    // Handle CV_PICTURE step
    if (currentStep === ConversationStep.CV_PICTURE) {
      if (isConfirm && data.cvPictureUrl) {
        return {
          action: 'advance',
          nextStep: ConversationStep.TEMPLATE_SELECTION,
          reason: 'User confirmed CV picture',
        };
      }
      if (isSkip || (isConfirm && !data.cvPictureUrl)) {
        return {
          action: 'skip',
          nextStep: ConversationStep.TEMPLATE_SELECTION,
          reason: 'User skipping CV picture',
        };
      }
    }

    // Handle TEMPLATE_SELECTION - check if template selected
    if (currentStep === ConversationStep.TEMPLATE_SELECTION) {
      if (data.selectedTemplate) {
        return {
          action: 'complete',
          nextStep: ConversationStep.GENERATION,
          reason: 'Template selected, ready to generate CV',
        };
      }
    }

    // Check if requirements are met to advance
    if (requirements.met) {
      // If step has proposals and we haven't proposed yet, propose first
      if (shouldPropose) {
        return {
          action: 'propose',
          nextStep: currentStep,
          reason: `Requirements met for ${currentStep}, should propose content`,
        };
      }

      // If confirmation received, advance
      if (isConfirm) {
        return {
          action: 'advance',
          nextStep: this.getNextStep(currentStep),
          reason: `User confirmed ${currentStep}, advancing`,
        };
      }
    }

    // Default: stay at current step and ask for more info
    return {
      action: 'ask',
      nextStep: currentStep,
      reason: `Still collecting data for ${currentStep}. Missing: ${requirements.missing.join(', ') || 'none'}`,
    };
  }

  /**
   * Get step-specific instructions for OpenAI
   */
  getStepInstructions(step: ConversationStep, data: CVData, language: string): string {
    const isMandatory = this.isStepMandatory(step);
    const shouldPropose = this.shouldProposeContent(step);
    const mandatoryLabel = language === 'fr' ? 'OBLIGATOIRE' : 'REQUIRED';
    const optionalLabel = language === 'fr' ? 'OPTIONNEL (peut être ignoré)' : 'OPTIONAL (can be skipped)';

    switch (step) {
      case ConversationStep.GREETING:
        return language === 'fr'
          ? 'Salue l\'utilisateur et demande dans quelle langue il souhaite continuer (Français, English, Español).'
          : 'Greet the user and ask which language they prefer (French, English, Spanish).';

      case ConversationStep.LANGUAGE_SELECTION:
        return language === 'fr'
          ? 'L\'utilisateur a choisi une langue. Confirme et explique que tu vas l\'aider à créer son CV.'
          : 'User has chosen a language. Confirm and explain you will help create their CV.';

      case ConversationStep.PERSONAL_INFO:
        const missingFields: string[] = [];
        if (!data.personalInfo?.firstName) missingFields.push(language === 'fr' ? 'nom complet' : 'full name');
        if (!data.personalInfo?.email) missingFields.push('email');
        if (!data.personalInfo?.phone) missingFields.push(language === 'fr' ? 'téléphone' : 'phone');

        if (missingFields.length > 0) {
          return language === 'fr'
            ? `[${mandatoryLabel}] Demande les informations manquantes: ${missingFields.join(', ')}. Ces champs sont OBLIGATOIRES.`
            : `[${mandatoryLabel}] Ask for missing information: ${missingFields.join(', ')}. These fields are REQUIRED.`;
        }
        return language === 'fr'
          ? 'Toutes les informations personnelles sont collectées. Demande confirmation avant de passer à l\'expérience professionnelle.'
          : 'All personal info collected. Ask for confirmation before moving to work experience.';

      case ConversationStep.WORK_EXPERIENCE:
        const expLabel = isMandatory ? mandatoryLabel : optionalLabel;
        if (shouldPropose) {
          return language === 'fr'
            ? `[${expLabel}] Collecte l'expérience professionnelle. PROPOSE d'optimiser la description après que l'utilisateur l'ait fournie. Si l'utilisateur dit "non/skip", ${isMandatory ? 'insiste car c\'est OBLIGATOIRE' : 'passe à l\'éducation'}.`
            : `[${expLabel}] Collect work experience. PROPOSE to optimize the description after user provides it. If user says "no/skip", ${isMandatory ? 'insist as it\'s REQUIRED' : 'move to education'}.`;
        }
        return language === 'fr'
          ? `[${expLabel}] Collecte l'expérience professionnelle. ${isMandatory ? 'C\'est OBLIGATOIRE.' : 'L\'utilisateur peut passer avec "non".'}`
          : `[${expLabel}] Collect work experience. ${isMandatory ? 'This is REQUIRED.' : 'User can skip with "no".'}`;

      case ConversationStep.EDUCATION:
        const eduLabel = isMandatory ? mandatoryLabel : optionalLabel;
        return language === 'fr'
          ? `[${eduLabel}] Collecte la formation académique. ${isMandatory ? 'C\'est OBLIGATOIRE.' : 'L\'utilisateur peut passer avec "non".'}`
          : `[${eduLabel}] Collect education. ${isMandatory ? 'This is REQUIRED.' : 'User can skip with "no".'}`;

      case ConversationStep.SKILLS:
        const skillLabel = isMandatory ? mandatoryLabel : optionalLabel;
        if (shouldPropose) {
          return language === 'fr'
            ? `[${skillLabel}] PROPOSE des compétences basées sur l'expérience de l'utilisateur, puis demande confirmation ou modifications.`
            : `[${skillLabel}] PROPOSE skills based on user's experience, then ask for confirmation or modifications.`;
        }
        return language === 'fr'
          ? `[${skillLabel}] Demande les compétences techniques et soft skills.`
          : `[${skillLabel}] Ask for technical and soft skills.`;

      case ConversationStep.LANGUAGES_KNOWN:
        const langLabel = isMandatory ? mandatoryLabel : optionalLabel;
        return language === 'fr'
          ? `[${langLabel}] Demande les langues parlées et le niveau (natif, courant, intermédiaire, débutant).`
          : `[${langLabel}] Ask for languages spoken and level (native, fluent, intermediate, beginner).`;

      case ConversationStep.PROFESSIONAL_SUMMARY:
        const summaryLabel = isMandatory ? mandatoryLabel : optionalLabel;
        if (shouldPropose) {
          if (data.professionalSummary) {
            return language === 'fr'
              ? `Un résumé a déjà été généré. Montre-le à l'utilisateur et demande s'il veut l'utiliser ou le modifier.`
              : `A summary has been generated. Show it to the user and ask if they want to use or modify it.`;
          }
          return language === 'fr'
            ? `[${summaryLabel}] GÉNÈRE un résumé professionnel basé sur les données collectées (2-3 phrases). Montre-le et demande confirmation.`
            : `[${summaryLabel}] GENERATE a professional summary based on collected data (2-3 sentences). Show it and ask for confirmation.`;
        }
        return language === 'fr'
          ? `[${summaryLabel}] Demande un résumé professionnel ou propose d'en écrire un.`
          : `[${summaryLabel}] Ask for a professional summary or offer to write one.`;

      case ConversationStep.CV_PICTURE:
        return language === 'fr'
          ? '[OPTIONNEL] Demande si l\'utilisateur veut ajouter une photo professionnelle à son CV. Il peut dire "non" pour passer.'
          : '[OPTIONAL] Ask if user wants to add a professional photo to their CV. They can say "no" to skip.';

      case ConversationStep.TEMPLATE_SELECTION:
        const templates = this.adminService.getActiveTemplates();
        const templateList = templates.map(t => `${t.templateId}: ${t.templateName}`).join(', ');
        return language === 'fr'
          ? `Présente les templates disponibles: ${templateList}. Demande à l'utilisateur de choisir.`
          : `Present available templates: ${templateList}. Ask user to choose one.`;

      default:
        return '';
    }
  }

  /**
   * Get step index for comparison
   */
  getStepIndex(step: ConversationStep): number {
    return this.stepOrder.indexOf(step);
  }

  /**
   * Check if stepA is before stepB in the flow
   */
  isStepBefore(stepA: ConversationStep, stepB: ConversationStep): boolean {
    return this.getStepIndex(stepA) < this.getStepIndex(stepB);
  }
}
