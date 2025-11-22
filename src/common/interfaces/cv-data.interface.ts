export enum ConversationStep {
  GREETING = 'greeting',
  LANGUAGE_SELECTION = 'language_selection',
  PERSONAL_INFO = 'personal_info',
  WORK_EXPERIENCE = 'work_experience',
  EDUCATION = 'education',
  SKILLS = 'skills',
  LANGUAGES_KNOWN = 'languages_known',
  CERTIFICATIONS = 'certifications',
  PROFESSIONAL_SUMMARY = 'professional_summary',
  CV_PICTURE = 'cv_picture',
  TEMPLATE_SELECTION = 'template_selection',
  REVIEW = 'review',
  GENERATION = 'generation',
  COMPLETED = 'completed',
}

export enum SessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
  PAUSED = 'paused',
}

export interface PersonalInfo {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  linkedIn?: string;
  portfolio?: string;
  summary?: string;
}

export interface WorkExperience {
  id?: string;
  companyName: string;
  position: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description: string;
  optimizedDescription?: string;
}

export interface Education {
  id?: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  gpa?: string;
  description?: string;
}

export interface Skill {
  id?: string;
  name: string;
  category?: string;
  proficiency?: string;
}

export interface Certification {
  id?: string;
  name: string;
  issuingOrganization?: string;
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export interface Language {
  name: string;
  proficiency: string; // native, fluent, professional, intermediate, basic
}

export interface CVData {
  personalInfo?: PersonalInfo;
  professionalSummary?: string;
  cvPictureUrl?: string; // URL to stored CV picture
  cvPictureS3Key?: string; // S3 storage key for the CV picture
  workExperiences: WorkExperience[];
  education: Education[];
  skills: Skill[];
  languages: Language[];
  certifications: Certification[];
  selectedTemplate?: string;
  additionalSections?: Record<string, any>;
}

export interface ConversationSession {
  id: string;
  userId: string;
  status: SessionStatus;
  currentStep: ConversationStep;
  language: string;
  data: CVData;
  lastInteraction: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  preferredLanguage: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeneratedDocument {
  id: string;
  userId: string;
  sessionId: string;
  documentType: 'cv' | 'cover_letter';
  templateId?: string;
  fileUrl?: string;
  s3Key?: string;
  fileFormat: 'pdf' | 'docx';
  atsScore?: number;
  atsSuggestions?: any;
  status: 'generating' | 'completed' | 'failed';
  metadata?: Record<string, any>;
  createdAt: Date;
}
