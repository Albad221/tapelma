// ═══════════════════════════════════════════════════════════════════════════════
// DYNAMIC DOCUMENT TYPE INTERFACES
// These interfaces define the structure for any document type (CV, Business Card, etc.)
// ═══════════════════════════════════════════════════════════════════════════════

export interface DocumentType {
  id: string;
  slug: string;
  name: string;
  nameFr?: string;
  nameEs?: string;
  description?: string;
  descriptionFr?: string;
  icon?: string;
  isActive: boolean;
  sortOrder: number;
  // Conversation settings
  welcomeMessage?: string;
  welcomeMessageFr?: string;
  completionMessage?: string;
  completionMessageFr?: string;
  // Output settings
  defaultOutputFormat: 'pdf' | 'png' | 'jpg';
  pageSize: 'A4' | 'Letter' | 'Custom';
  pageWidthMm?: number;
  pageHeightMm?: number;
  orientation: 'portrait' | 'landscape';
  // Relations
  fieldGroups?: FieldGroup[];
  templates?: DocumentTemplate[];
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface FieldGroup {
  id: string;
  documentTypeId: string;
  slug: string;
  name: string;
  nameFr?: string;
  description?: string;
  descriptionFr?: string;
  // Conversation settings
  promptMessage?: string;
  promptMessageFr?: string;
  // Behavior settings
  isRepeatable: boolean;
  minEntries: number;
  maxEntries: number;
  isMandatory: boolean;
  isAiEnhanced: boolean;
  sortOrder: number;
  // Relations
  fields?: FormField[];
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export type FieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'url'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'image'
  | 'file'
  | 'boolean'
  | 'number';

export interface FieldOption {
  value: string;
  label: string;
  labelFr?: string;
}

export interface FormField {
  id: string;
  fieldGroupId: string;
  slug: string;
  name: string;
  nameFr?: string;
  placeholder?: string;
  placeholderFr?: string;
  // Type and validation
  fieldType: FieldType;
  validationRegex?: string;
  validationMessage?: string;
  minLength?: number;
  maxLength?: number;
  // Options for select/multiselect
  options?: FieldOption[];
  // Behavior
  isMandatory: boolean;
  isAiEnhanced: boolean;
  aiPrompt?: string;
  defaultValue?: string;
  sortOrder: number;
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentTemplate {
  id: string;
  documentTypeId: string;
  slug: string;
  name: string;
  nameFr?: string;
  description?: string;
  descriptionFr?: string;
  category?: string;
  // Template content
  templateHtml: string;
  templateCss?: string;
  // Visual settings
  previewImageUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  // Recommendations
  bestFor?: string[];
  features?: string[];
  // Status
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DTOs for API operations
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateDocumentTypeDto {
  slug: string;
  name: string;
  nameFr?: string;
  nameEs?: string;
  description?: string;
  descriptionFr?: string;
  icon?: string;
  welcomeMessage?: string;
  welcomeMessageFr?: string;
  completionMessage?: string;
  completionMessageFr?: string;
  defaultOutputFormat?: 'pdf' | 'png' | 'jpg';
  pageSize?: 'A4' | 'Letter' | 'Custom';
  pageWidthMm?: number;
  pageHeightMm?: number;
  orientation?: 'portrait' | 'landscape';
}

export interface UpdateDocumentTypeDto extends Partial<CreateDocumentTypeDto> {
  isActive?: boolean;
  sortOrder?: number;
}

export interface CreateFieldGroupDto {
  documentTypeId: string;
  slug: string;
  name: string;
  nameFr?: string;
  description?: string;
  descriptionFr?: string;
  promptMessage?: string;
  promptMessageFr?: string;
  isRepeatable?: boolean;
  minEntries?: number;
  maxEntries?: number;
  isMandatory?: boolean;
  isAiEnhanced?: boolean;
  sortOrder?: number;
}

export interface UpdateFieldGroupDto extends Partial<Omit<CreateFieldGroupDto, 'documentTypeId'>> {}

export interface CreateFormFieldDto {
  fieldGroupId: string;
  slug: string;
  name: string;
  nameFr?: string;
  placeholder?: string;
  placeholderFr?: string;
  fieldType: FieldType;
  validationRegex?: string;
  validationMessage?: string;
  minLength?: number;
  maxLength?: number;
  options?: FieldOption[];
  isMandatory?: boolean;
  isAiEnhanced?: boolean;
  aiPrompt?: string;
  defaultValue?: string;
  sortOrder?: number;
}

export interface UpdateFormFieldDto extends Partial<Omit<CreateFormFieldDto, 'fieldGroupId'>> {}

export interface CreateTemplateDto {
  documentTypeId: string;
  slug: string;
  name: string;
  nameFr?: string;
  description?: string;
  descriptionFr?: string;
  category?: string;
  templateHtml: string;
  templateCss?: string;
  previewImageUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  bestFor?: string[];
  features?: string[];
  isDefault?: boolean;
  sortOrder?: number;
}

export interface UpdateTemplateDto extends Partial<Omit<CreateTemplateDto, 'documentTypeId'>> {
  isActive?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Dynamic Document Data - stores user input for any document type
// ═══════════════════════════════════════════════════════════════════════════════

export interface DynamicDocumentData {
  documentTypeId: string;
  documentTypeSlug: string;
  // Key is field_group_slug, value is either a single object or array (for repeatable groups)
  groups: Record<string, FieldGroupData | FieldGroupData[]>;
  selectedTemplateId?: string;
}

export interface FieldGroupData {
  // Key is field_slug, value is the field value
  [fieldSlug: string]: any;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Utility types for mapping between DB and TypeScript
// ═══════════════════════════════════════════════════════════════════════════════

export interface DocumentTypeWithRelations extends DocumentType {
  fieldGroups: (FieldGroup & { fields: FormField[] })[];
  templates: DocumentTemplate[];
}
