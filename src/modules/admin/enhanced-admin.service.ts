import { Injectable, Logger } from '@nestjs/common';
import {
  EnhancedCVConfigDto,
  EnhancedFieldConfig,
  FieldCategory,
  FieldType,
  FieldObligation,
} from './dto/enhanced-cv-config.dto';

@Injectable()
export class EnhancedAdminService {
  private readonly logger = new Logger(EnhancedAdminService.name);
  private cvConfig: EnhancedCVConfigDto;

  constructor() {
    this.cvConfig = this.getDefaultConfig();
  }

  private getDefaultConfig(): EnhancedCVConfigDto {
    const categories: FieldCategory[] = [
      {
        categoryId: 'identity_contact',
        categoryName: 'A. Identité & Contact',
        description: 'Informations permettant de vous identifier et de vous joindre',
        defaultObligation: FieldObligation.OBLIGATOIRE,
        order: 1,
      },
      {
        categoryId: 'title_summary',
        categoryName: 'B. Titre & Accroche',
        description: 'Titre du poste recherché et résumé professionnel',
        defaultObligation: FieldObligation.FORTEMENT_RECOMMANDE,
        order: 2,
      },
      {
        categoryId: 'experience',
        categoryName: 'C. Expérience Professionnelle',
        description: 'Parcours professionnel et réalisations',
        defaultObligation: FieldObligation.OBLIGATOIRE,
        order: 3,
      },
      {
        categoryId: 'education',
        categoryName: 'D. Formation',
        description: 'Diplômes et formations académiques',
        defaultObligation: FieldObligation.OBLIGATOIRE,
        order: 4,
      },
      {
        categoryId: 'skills',
        categoryName: 'E. Compétences',
        description: 'Compétences techniques, comportementales et outils',
        defaultObligation: FieldObligation.FORTEMENT_RECOMMANDE,
        order: 5,
      },
      {
        categoryId: 'languages',
        categoryName: 'F. Langues',
        description: 'Langues parlées et niveau de maîtrise',
        defaultObligation: FieldObligation.FORTEMENT_RECOMMANDE,
        order: 6,
      },
      {
        categoryId: 'online_profiles',
        categoryName: 'G. Liens Professionnels',
        description: 'Profils LinkedIn, portfolio, GitHub, etc.',
        defaultObligation: FieldObligation.RECOMMANDE,
        order: 7,
      },
      {
        categoryId: 'projects',
        categoryName: 'H. Projets & Bénévolat',
        description: 'Projets personnels, scolaires et activités bénévoles',
        defaultObligation: FieldObligation.RECOMMANDE,
        order: 8,
      },
      {
        categoryId: 'optional_info',
        categoryName: 'I. Informations Optionnelles',
        description: 'Photo, permis, mobilité, centres d\'intérêt',
        defaultObligation: FieldObligation.OPTIONNEL,
        order: 9,
      },
      {
        categoryId: 'certifications',
        categoryName: 'J. Certifications',
        description: 'Certifications professionnelles et formations complémentaires',
        defaultObligation: FieldObligation.RECOMMANDE,
        order: 10,
      },
    ];

    const fields: EnhancedFieldConfig[] = [
      // A. IDENTITÉ & CONTACT
      {
        fieldName: 'last_name',
        label: 'Nom',
        description: 'Nom de famille',
        category: 'identity_contact',
        fieldType: FieldType.TEXT_SHORT,
        obligation: FieldObligation.OBLIGATOIRE,
        format: 'Lettres et tirets, majuscules recommandées',
        placeholder: 'DUPONT',
        showInForm: true,
        order: 1,
      },
      {
        fieldName: 'first_name',
        label: 'Prénom',
        description: 'Prénom',
        category: 'identity_contact',
        fieldType: FieldType.TEXT_SHORT,
        obligation: FieldObligation.OBLIGATOIRE,
        format: '1ère lettre en majuscule',
        placeholder: 'Marie',
        showInForm: true,
        order: 2,
      },
      {
        fieldName: 'phone',
        label: 'Numéro de téléphone',
        description: 'Téléphone de contact',
        category: 'identity_contact',
        fieldType: FieldType.PHONE,
        obligation: FieldObligation.OBLIGATOIRE,
        format: '+33 6 12 34 56 78 / +221 77 123 45 67',
        placeholder: '+33 6 12 34 56 78',
        showInForm: true,
        order: 3,
      },
      {
        fieldName: 'email',
        label: 'Adresse e-mail',
        description: 'E-mail professionnel',
        category: 'identity_contact',
        fieldType: FieldType.EMAIL,
        obligation: FieldObligation.OBLIGATOIRE,
        format: 'prenom.nom@domaine.com',
        placeholder: 'marie.dupont@email.com',
        showInForm: true,
        order: 4,
      },
      {
        fieldName: 'location',
        label: 'Ville + Pays',
        description: 'Lieu de résidence',
        category: 'identity_contact',
        fieldType: FieldType.TEXT_SHORT,
        obligation: FieldObligation.FORTEMENT_RECOMMANDE,
        format: 'Ville, Pays',
        placeholder: 'Paris, France',
        showInForm: true,
        order: 5,
      },

      // B. TITRE & ACCROCHE
      {
        fieldName: 'cv_title',
        label: 'Intitulé de poste recherché',
        description: 'Titre professionnel / métier visé',
        category: 'title_summary',
        fieldType: FieldType.TEXT_SHORT,
        obligation: FieldObligation.FORTEMENT_RECOMMANDE,
        format: 'Une ligne claire',
        placeholder: 'Développeur Full Stack JavaScript',
        showInForm: true,
        order: 1,
      },
      {
        fieldName: 'summary',
        label: 'Accroche professionnelle',
        description: 'Résumé de votre profil',
        category: 'title_summary',
        fieldType: FieldType.TEXT_MULTI,
        obligation: FieldObligation.RECOMMANDE,
        format: '3-4 lignes : années d\'expérience + secteur + atouts',
        placeholder: '5 ans d\'expérience en développement web...',
        showInForm: true,
        order: 2,
      },

      // C. EXPÉRIENCE PROFESSIONNELLE (Array)
      {
        fieldName: 'experience.job_title',
        label: 'Intitulé du poste',
        description: 'Titre du poste occupé',
        category: 'experience',
        fieldType: FieldType.TEXT_SHORT,
        obligation: FieldObligation.OBLIGATOIRE,
        isArray: true,
        placeholder: 'Chef de projet digital',
        showInForm: true,
        order: 1,
      },
      {
        fieldName: 'experience.company',
        label: 'Entreprise',
        description: 'Nom de l\'entreprise',
        category: 'experience',
        fieldType: FieldType.TEXT_SHORT,
        obligation: FieldObligation.OBLIGATOIRE,
        isArray: true,
        placeholder: 'Google France',
        showInForm: true,
        order: 2,
      },
      {
        fieldName: 'experience.location',
        label: 'Lieu',
        description: 'Ville + pays de l\'entreprise',
        category: 'experience',
        fieldType: FieldType.TEXT_SHORT,
        obligation: FieldObligation.RECOMMANDE,
        isArray: true,
        placeholder: 'Paris, France',
        showInForm: true,
        order: 3,
      },
      {
        fieldName: 'experience.start_date',
        label: 'Date de début',
        description: 'Début du poste',
        category: 'experience',
        fieldType: FieldType.DATE,
        obligation: FieldObligation.OBLIGATOIRE,
        isArray: true,
        format: 'MM/AAAA',
        showInForm: true,
        order: 4,
      },
      {
        fieldName: 'experience.end_date',
        label: 'Date de fin',
        description: 'Fin du poste (ou poste actuel)',
        category: 'experience',
        fieldType: FieldType.DATE,
        obligation: FieldObligation.RECOMMANDE,
        isArray: true,
        format: 'MM/AAAA ou "Présent"',
        showInForm: true,
        order: 5,
      },
      {
        fieldName: 'experience.is_current',
        label: 'Poste actuel',
        description: 'Cocher si toujours en poste',
        category: 'experience',
        fieldType: FieldType.BOOLEAN,
        obligation: FieldObligation.OPTIONNEL,
        isArray: true,
        showInForm: true,
        order: 6,
      },
      {
        fieldName: 'experience.description',
        label: 'Missions & réalisations',
        description: 'Description détaillée des missions',
        category: 'experience',
        fieldType: FieldType.TEXT_MULTI,
        obligation: FieldObligation.FORTEMENT_RECOMMANDE,
        isArray: true,
        format: '3-6 puces : verbe d\'action + résultat chiffré',
        placeholder: '• Développé une application qui...\n• Géré une équipe de...',
        showInForm: true,
        order: 7,
      },
      {
        fieldName: 'experience.skills_used',
        label: 'Compétences utilisées',
        description: 'Technologies et outils utilisés',
        category: 'experience',
        fieldType: FieldType.LIST_TAGS,
        obligation: FieldObligation.OPTIONNEL,
        isArray: true,
        placeholder: 'React, Node.js, MongoDB',
        showInForm: true,
        order: 8,
      },

      // D. FORMATION (Array)
      {
        fieldName: 'education.degree',
        label: 'Intitulé du diplôme',
        description: 'Nom du diplôme',
        category: 'education',
        fieldType: FieldType.TEXT_SHORT,
        obligation: FieldObligation.OBLIGATOIRE,
        isArray: true,
        placeholder: 'Master 2 Informatique',
        showInForm: true,
        order: 1,
      },
      {
        fieldName: 'education.field',
        label: 'Spécialité',
        description: 'Domaine d\'études',
        category: 'education',
        fieldType: FieldType.TEXT_SHORT,
        obligation: FieldObligation.RECOMMANDE,
        isArray: true,
        placeholder: 'Intelligence Artificielle',
        showInForm: true,
        order: 2,
      },
      {
        fieldName: 'education.institution',
        label: 'École / Université',
        description: 'Établissement d\'enseignement',
        category: 'education',
        fieldType: FieldType.TEXT_SHORT,
        obligation: FieldObligation.OBLIGATOIRE,
        isArray: true,
        placeholder: 'Université Paris-Saclay',
        showInForm: true,
        order: 3,
      },
      {
        fieldName: 'education.location',
        label: 'Lieu',
        description: 'Ville + pays',
        category: 'education',
        fieldType: FieldType.TEXT_SHORT,
        obligation: FieldObligation.RECOMMANDE,
        isArray: true,
        placeholder: 'Orsay, France',
        showInForm: true,
        order: 4,
      },
      {
        fieldName: 'education.start_date',
        label: 'Année de début',
        description: 'Début de la formation',
        category: 'education',
        fieldType: FieldType.DATE,
        obligation: FieldObligation.RECOMMANDE,
        isArray: true,
        format: 'AAAA',
        showInForm: true,
        order: 5,
      },
      {
        fieldName: 'education.end_date',
        label: 'Année d\'obtention',
        description: 'Année de diplôme',
        category: 'education',
        fieldType: FieldType.DATE,
        obligation: FieldObligation.OBLIGATOIRE,
        isArray: true,
        format: 'AAAA',
        showInForm: true,
        order: 6,
      },
      {
        fieldName: 'education.honours',
        label: 'Mention',
        description: 'Mention ou distinction',
        category: 'education',
        fieldType: FieldType.TEXT_SHORT,
        obligation: FieldObligation.OPTIONNEL,
        isArray: true,
        placeholder: 'Mention Très Bien',
        showInForm: true,
        order: 7,
      },

      // E. COMPÉTENCES
      {
        fieldName: 'skills.hard_skills',
        label: 'Compétences techniques',
        description: 'Compétences métier et techniques',
        category: 'skills',
        fieldType: FieldType.LIST_TAGS,
        obligation: FieldObligation.FORTEMENT_RECOMMANDE,
        isArray: true,
        placeholder: 'Python, Comptabilité, Gestion de projet Agile',
        showInForm: true,
        order: 1,
      },
      {
        fieldName: 'skills.soft_skills',
        label: 'Compétences comportementales',
        description: 'Soft skills',
        category: 'skills',
        fieldType: FieldType.LIST_TAGS,
        obligation: FieldObligation.RECOMMANDE,
        isArray: true,
        placeholder: 'Leadership, Esprit d\'analyse, Communication',
        showInForm: true,
        order: 2,
      },
      {
        fieldName: 'skills.tools',
        label: 'Outils & logiciels',
        description: 'Logiciels maîtrisés',
        category: 'skills',
        fieldType: FieldType.LIST_TAGS,
        obligation: FieldObligation.RECOMMANDE,
        isArray: true,
        placeholder: 'Excel avancé, Figma, Salesforce',
        showInForm: true,
        order: 3,
      },

      // F. LANGUES (Array)
      {
        fieldName: 'languages.name',
        label: 'Langue',
        description: 'Langue parlée',
        category: 'languages',
        fieldType: FieldType.SELECT,
        obligation: FieldObligation.FORTEMENT_RECOMMANDE,
        isArray: true,
        options: [
          { value: 'fr', label: 'Français' },
          { value: 'en', label: 'Anglais' },
          { value: 'es', label: 'Espagnol' },
          { value: 'wo', label: 'Wolof' },
          { value: 'ar', label: 'Arabe' },
          { value: 'de', label: 'Allemand' },
          { value: 'it', label: 'Italien' },
          { value: 'pt', label: 'Portugais' },
          { value: 'zh', label: 'Chinois' },
        ],
        showInForm: true,
        order: 1,
      },
      {
        fieldName: 'languages.level',
        label: 'Niveau',
        description: 'Niveau de maîtrise',
        category: 'languages',
        fieldType: FieldType.SELECT,
        obligation: FieldObligation.OBLIGATOIRE,
        isArray: true,
        options: [
          { value: 'A1', label: 'A1 - Débutant' },
          { value: 'A2', label: 'A2 - Élémentaire' },
          { value: 'B1', label: 'B1 - Intermédiaire' },
          { value: 'B2', label: 'B2 - Intermédiaire avancé' },
          { value: 'C1', label: 'C1 - Avancé' },
          { value: 'C2', label: 'C2 - Maîtrise' },
          { value: 'native', label: 'Langue maternelle' },
        ],
        showInForm: true,
        order: 2,
      },
      {
        fieldName: 'languages.certification',
        label: 'Certification',
        description: 'Test officiel (TOEIC, IELTS...)',
        category: 'languages',
        fieldType: FieldType.TEXT_SHORT,
        obligation: FieldObligation.OPTIONNEL,
        isArray: true,
        placeholder: 'TOEIC 950, IELTS 7.5',
        showInForm: true,
        order: 3,
      },

      // G. LIENS PROFESSIONNELS
      {
        fieldName: 'online_profiles.linkedin_url',
        label: 'LinkedIn',
        description: 'URL de votre profil LinkedIn',
        category: 'online_profiles',
        fieldType: FieldType.URL,
        obligation: FieldObligation.RECOMMANDE,
        placeholder: 'https://linkedin.com/in/votre-profil',
        showInForm: true,
        order: 1,
      },
      {
        fieldName: 'online_profiles.portfolio_url',
        label: 'Portfolio',
        description: 'Site web personnel',
        category: 'online_profiles',
        fieldType: FieldType.URL,
        obligation: FieldObligation.OPTIONNEL,
        placeholder: 'https://monportfolio.com',
        showInForm: true,
        order: 2,
      },
      {
        fieldName: 'online_profiles.github_url',
        label: 'GitHub',
        description: 'Profil GitHub',
        category: 'online_profiles',
        fieldType: FieldType.URL,
        obligation: FieldObligation.OPTIONNEL,
        placeholder: 'https://github.com/username',
        showInForm: true,
        order: 3,
      },
      {
        fieldName: 'online_profiles.dribbble_url',
        label: 'Dribbble',
        description: 'Profil Dribbble (designers)',
        category: 'online_profiles',
        fieldType: FieldType.URL,
        obligation: FieldObligation.OPTIONNEL,
        placeholder: 'https://dribbble.com/username',
        showInForm: true,
        order: 4,
      },

      // H. PROJETS & BÉNÉVOLAT (Arrays)
      {
        fieldName: 'projects.title',
        label: 'Titre du projet',
        description: 'Nom du projet',
        category: 'projects',
        fieldType: FieldType.TEXT_SHORT,
        obligation: FieldObligation.RECOMMANDE,
        isArray: true,
        placeholder: 'Application mobile de gestion',
        showInForm: true,
        order: 1,
      },
      {
        fieldName: 'projects.context',
        label: 'Contexte',
        description: 'Type de projet',
        category: 'projects',
        fieldType: FieldType.SELECT,
        obligation: FieldObligation.OPTIONNEL,
        isArray: true,
        options: [
          { value: 'academic', label: 'Scolaire' },
          { value: 'personal', label: 'Personnel' },
          { value: 'professional', label: 'Professionnel' },
        ],
        showInForm: true,
        order: 2,
      },
      {
        fieldName: 'projects.description',
        label: 'Description',
        description: 'Ce que vous avez réalisé',
        category: 'projects',
        fieldType: FieldType.TEXT_MULTI,
        obligation: FieldObligation.RECOMMANDE,
        isArray: true,
        showInForm: true,
        order: 3,
      },
      {
        fieldName: 'projects.skills_used',
        label: 'Compétences utilisées',
        description: 'Technologies employées',
        category: 'projects',
        fieldType: FieldType.LIST_TAGS,
        obligation: FieldObligation.OPTIONNEL,
        isArray: true,
        showInForm: true,
        order: 4,
      },

      // I. INFORMATIONS OPTIONNELLES
      {
        fieldName: 'photo',
        label: 'Photo',
        description: 'Photo professionnelle',
        category: 'optional_info',
        fieldType: FieldType.FILE,
        obligation: FieldObligation.OPTIONNEL,
        format: 'JPG ou PNG, fond neutre',
        showInForm: true,
        order: 1,
      },
      {
        fieldName: 'driving_license',
        label: 'Permis de conduire',
        description: 'Type de permis',
        category: 'optional_info',
        fieldType: FieldType.MULTI_SELECT,
        obligation: FieldObligation.OPTIONNEL,
        options: [
          { value: 'A', label: 'Permis A (moto)' },
          { value: 'B', label: 'Permis B (voiture)' },
          { value: 'C', label: 'Permis C (poids lourd)' },
          { value: 'D', label: 'Permis D (transport)' },
        ],
        showInForm: true,
        order: 2,
      },
      {
        fieldName: 'mobility',
        label: 'Mobilité géographique',
        description: 'Zones de mobilité',
        category: 'optional_info',
        fieldType: FieldType.MULTI_SELECT,
        obligation: FieldObligation.OPTIONNEL,
        options: [
          { value: 'local', label: 'Local' },
          { value: 'regional', label: 'Régional' },
          { value: 'national', label: 'National' },
          { value: 'international', label: 'International' },
        ],
        showInForm: true,
        order: 3,
      },
      {
        fieldName: 'interests',
        label: 'Centres d\'intérêt',
        description: 'Loisirs et engagements',
        category: 'optional_info',
        fieldType: FieldType.LIST_TAGS,
        obligation: FieldObligation.OPTIONNEL,
        placeholder: 'Football (niveau compétition), Bénévolat associatif',
        showInForm: true,
        order: 4,
      },
      {
        fieldName: 'birth_date',
        label: 'Date de naissance',
        description: 'Date de naissance (facultatif)',
        category: 'optional_info',
        fieldType: FieldType.DATE,
        obligation: FieldObligation.A_EVITER,
        format: 'JJ/MM/AAAA',
        showInForm: false,
        order: 5,
      },

      // J. CERTIFICATIONS (Array)
      {
        fieldName: 'certifications.title',
        label: 'Titre de la certification',
        description: 'Nom de la certification',
        category: 'certifications',
        fieldType: FieldType.TEXT_SHORT,
        obligation: FieldObligation.RECOMMANDE,
        isArray: true,
        placeholder: 'AWS Certified Solutions Architect',
        showInForm: true,
        order: 1,
      },
      {
        fieldName: 'certifications.issuer',
        label: 'Organisme',
        description: 'Organisme délivrant',
        category: 'certifications',
        fieldType: FieldType.TEXT_SHORT,
        obligation: FieldObligation.RECOMMANDE,
        isArray: true,
        placeholder: 'Amazon Web Services',
        showInForm: true,
        order: 2,
      },
      {
        fieldName: 'certifications.date',
        label: 'Date d\'obtention',
        description: 'Date de certification',
        category: 'certifications',
        fieldType: FieldType.DATE,
        obligation: FieldObligation.RECOMMANDE,
        isArray: true,
        format: 'MM/AAAA',
        showInForm: true,
        order: 3,
      },
      {
        fieldName: 'certifications.expiry_date',
        label: 'Date d\'expiration',
        description: 'Validité de la certification',
        category: 'certifications',
        fieldType: FieldType.DATE,
        obligation: FieldObligation.OPTIONNEL,
        isArray: true,
        format: 'MM/AAAA',
        showInForm: true,
        order: 4,
      },
    ];

    return {
      categories,
      fields,
      templates: [], // Will be populated from template registry
    };
  }

  getConfig(): EnhancedCVConfigDto {
    return this.cvConfig;
  }

  updateConfig(config: EnhancedCVConfigDto): EnhancedCVConfigDto {
    this.logger.log('Updating enhanced CV configuration');
    this.cvConfig = {
      ...config,
      updatedBy: config.updatedBy || 'admin',
    };
    return this.cvConfig;
  }

  getFieldsByCategory(categoryId: string): EnhancedFieldConfig[] {
    return this.cvConfig.fields
      .filter(field => field.category === categoryId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getMandatoryFields(): EnhancedFieldConfig[] {
    return this.cvConfig.fields.filter(
      field => field.obligation === FieldObligation.OBLIGATOIRE,
    );
  }

  getCategories(): FieldCategory[] {
    return this.cvConfig.categories.sort((a, b) => a.order - b.order);
  }

  addField(field: EnhancedFieldConfig): EnhancedCVConfigDto {
    this.cvConfig.fields.push(field);
    return this.cvConfig;
  }

  updateField(fieldName: string, updates: Partial<EnhancedFieldConfig>): EnhancedCVConfigDto {
    const index = this.cvConfig.fields.findIndex(f => f.fieldName === fieldName);
    if (index !== -1) {
      this.cvConfig.fields[index] = {
        ...this.cvConfig.fields[index],
        ...updates,
      };
    }
    return this.cvConfig;
  }

  deleteField(fieldName: string): EnhancedCVConfigDto {
    this.cvConfig.fields = this.cvConfig.fields.filter(
      f => f.fieldName !== fieldName,
    );
    return this.cvConfig;
  }

  resetToDefaults(): EnhancedCVConfigDto {
    this.logger.log('Resetting enhanced CV configuration to defaults');
    this.cvConfig = this.getDefaultConfig();
    return this.cvConfig;
  }
}
