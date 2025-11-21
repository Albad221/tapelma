import { IsBoolean, IsArray, IsString, IsOptional } from 'class-validator';

export class CVFieldConfig {
  @IsString()
  fieldName: string;

  @IsBoolean()
  isMandatory: boolean;

  @IsBoolean()
  @IsOptional()
  shouldProposeContent?: boolean;

  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class TemplateConfig {
  @IsString()
  templateId: string;

  @IsString()
  templateName: string;

  @IsBoolean()
  isActive: boolean;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;
}

export class CVConfigDto {
  @IsArray()
  fields: CVFieldConfig[];

  @IsArray()
  templates: TemplateConfig[];

  @IsOptional()
  @IsString()
  updatedBy?: string;
}
