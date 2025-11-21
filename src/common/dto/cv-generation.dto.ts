import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEmail,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PersonalInfoDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  linkedIn?: string;

  @IsString()
  @IsOptional()
  portfolio?: string;

  @IsString()
  @IsOptional()
  summary?: string;
}

export class WorkExperienceDto {
  @IsString()
  companyName: string;

  @IsString()
  position: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  startDate: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsBoolean()
  isCurrent: boolean;

  @IsString()
  description: string;
}

export class EducationDto {
  @IsString()
  institution: string;

  @IsString()
  degree: string;

  @IsString()
  @IsOptional()
  fieldOfStudy?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsBoolean()
  isCurrent: boolean;

  @IsString()
  @IsOptional()
  gpa?: string;
}

export class SkillDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  proficiency?: string;
}

export class CertificationDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  issuingOrganization?: string;

  @IsString()
  @IsOptional()
  issueDate?: string;

  @IsString()
  @IsOptional()
  expiryDate?: string;

  @IsString()
  @IsOptional()
  credentialId?: string;

  @IsString()
  @IsOptional()
  credentialUrl?: string;
}

export class LanguageDto {
  @IsString()
  name: string;

  @IsString()
  proficiency: string;
}

export class GenerateCVDto {
  @ValidateNested()
  @Type(() => PersonalInfoDto)
  personalInfo: PersonalInfoDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkExperienceDto)
  workExperiences: WorkExperienceDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education: EducationDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillDto)
  skills: SkillDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguageDto)
  languages: LanguageDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificationDto)
  @IsOptional()
  certifications?: CertificationDto[];

  @IsString()
  templateId: string;

  @IsString()
  @IsOptional()
  targetLanguage?: string;
}
