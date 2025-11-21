import { IsBoolean, IsArray, IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';

export enum FieldType {
  TEXT_SHORT = 'text_short',
  TEXT_MULTI = 'text_multi',
  EMAIL = 'email',
  PHONE = 'phone',
  DATE = 'date',
  URL = 'url',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  LIST_TAGS = 'list_tags',
  BOOLEAN = 'boolean',
  NUMBER = 'number',
  FILE = 'file',
}

export enum FieldObligation {
  OBLIGATOIRE = 'obligatoire',           // Required
  FORTEMENT_RECOMMANDE = 'fortement_recommande', // Highly recommended
  RECOMMANDE = 'recommande',             // Recommended
  OPTIONNEL = 'optionnel',               // Optional
  A_EVITER = 'a_eviter',                 // To avoid
}

export class FieldOption {
  @IsString()
  value: string;

  @IsString()
  label: string;
}

export class EnhancedFieldConfig {
  @IsString()
  fieldName: string; // Technical name (e.g., "last_name", "phone")

  @IsString()
  label: string; // Display label (e.g., "Nom", "Téléphone")

  @IsString()
  @IsOptional()
  description?: string; // Field description/help text

  @IsString()
  category: string; // Category (e.g., "identity_contact", "experience", "education")

  @IsEnum(FieldType)
  fieldType: FieldType;

  @IsEnum(FieldObligation)
  obligation: FieldObligation;

  @IsString()
  @IsOptional()
  format?: string; // Format hint (e.g., "+33 6 12 34 56 78")

  @IsBoolean()
  @IsOptional()
  isArray?: boolean; // Is this field an array (for experience[], education[], etc.)

  @IsArray()
  @IsOptional()
  options?: FieldOption[]; // For select/multi-select fields

  @IsString()
  @IsOptional()
  validation?: string; // Validation regex or rule

  @IsString()
  @IsOptional()
  placeholder?: string;

  @IsBoolean()
  @IsOptional()
  showInForm?: boolean; // Should this field appear in the form?

  @IsNumber()
  @IsOptional()
  order?: number; // Display order within category
}

export class FieldCategory {
  @IsString()
  categoryId: string;

  @IsString()
  categoryName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(FieldObligation)
  defaultObligation: FieldObligation;

  @IsNumber()
  order: number; // Display order
}

export class EnhancedCVConfigDto {
  @IsArray()
  categories: FieldCategory[];

  @IsArray()
  fields: EnhancedFieldConfig[];

  @IsArray()
  @IsOptional()
  templates?: any[]; // Keep existing template config

  @IsOptional()
  @IsString()
  updatedBy?: string;
}
