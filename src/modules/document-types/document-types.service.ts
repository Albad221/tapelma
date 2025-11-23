import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  DocumentType,
  FieldGroup,
  FormField,
  DocumentTemplate,
  DocumentTypeWithRelations,
  CreateDocumentTypeDto,
  UpdateDocumentTypeDto,
  CreateFieldGroupDto,
  UpdateFieldGroupDto,
  CreateFormFieldDto,
  UpdateFormFieldDto,
  CreateTemplateDto,
  UpdateTemplateDto,
} from './interfaces/document-type.interface';

@Injectable()
export class DocumentTypesService {
  private readonly logger = new Logger(DocumentTypesService.name);
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_KEY || '',
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCUMENT TYPES CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  async getAllDocumentTypes(includeInactive = false): Promise<DocumentType[]> {
    let query = this.supabase
      .from('document_types')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Error fetching document types: ${error.message}`);
      throw error;
    }

    return (data || []).map(this.mapDocumentType);
  }

  async getDocumentTypeById(id: string): Promise<DocumentType | null> {
    const { data, error } = await this.supabase
      .from('document_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data ? this.mapDocumentType(data) : null;
  }

  async getDocumentTypeBySlug(slug: string): Promise<DocumentType | null> {
    const { data, error } = await this.supabase
      .from('document_types')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data ? this.mapDocumentType(data) : null;
  }

  async getDocumentTypeWithRelations(slugOrId: string): Promise<DocumentTypeWithRelations | null> {
    // Try by slug first, then by ID
    let query = this.supabase
      .from('document_types')
      .select(`
        *,
        field_groups (
          *,
          form_fields (*)
        ),
        document_templates (*)
      `)
      .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
      .single();

    const { data, error } = await query;

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    if (!data) return null;

    return {
      ...this.mapDocumentType(data),
      fieldGroups: (data.field_groups || [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((fg: any) => ({
          ...this.mapFieldGroup(fg),
          fields: (fg.form_fields || [])
            .sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map(this.mapFormField),
        })),
      templates: (data.document_templates || [])
        .filter((t: any) => t.is_active)
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map(this.mapTemplate),
    };
  }

  async createDocumentType(dto: CreateDocumentTypeDto): Promise<DocumentType> {
    const { data, error } = await this.supabase
      .from('document_types')
      .insert({
        slug: dto.slug,
        name: dto.name,
        name_fr: dto.nameFr,
        name_es: dto.nameEs,
        description: dto.description,
        description_fr: dto.descriptionFr,
        icon: dto.icon,
        welcome_message: dto.welcomeMessage,
        welcome_message_fr: dto.welcomeMessageFr,
        completion_message: dto.completionMessage,
        completion_message_fr: dto.completionMessageFr,
        default_output_format: dto.defaultOutputFormat || 'pdf',
        page_size: dto.pageSize || 'A4',
        page_width_mm: dto.pageWidthMm,
        page_height_mm: dto.pageHeightMm,
        orientation: dto.orientation || 'portrait',
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapDocumentType(data);
  }

  async updateDocumentType(id: string, dto: UpdateDocumentTypeDto): Promise<DocumentType> {
    const updateData: any = {};
    if (dto.slug !== undefined) updateData.slug = dto.slug;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.nameFr !== undefined) updateData.name_fr = dto.nameFr;
    if (dto.nameEs !== undefined) updateData.name_es = dto.nameEs;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.descriptionFr !== undefined) updateData.description_fr = dto.descriptionFr;
    if (dto.icon !== undefined) updateData.icon = dto.icon;
    if (dto.welcomeMessage !== undefined) updateData.welcome_message = dto.welcomeMessage;
    if (dto.welcomeMessageFr !== undefined) updateData.welcome_message_fr = dto.welcomeMessageFr;
    if (dto.completionMessage !== undefined) updateData.completion_message = dto.completionMessage;
    if (dto.completionMessageFr !== undefined) updateData.completion_message_fr = dto.completionMessageFr;
    if (dto.defaultOutputFormat !== undefined) updateData.default_output_format = dto.defaultOutputFormat;
    if (dto.pageSize !== undefined) updateData.page_size = dto.pageSize;
    if (dto.pageWidthMm !== undefined) updateData.page_width_mm = dto.pageWidthMm;
    if (dto.pageHeightMm !== undefined) updateData.page_height_mm = dto.pageHeightMm;
    if (dto.orientation !== undefined) updateData.orientation = dto.orientation;
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;
    if (dto.sortOrder !== undefined) updateData.sort_order = dto.sortOrder;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('document_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapDocumentType(data);
  }

  async deleteDocumentType(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('document_types')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIELD GROUPS CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  async getFieldGroupsByDocumentType(documentTypeId: string): Promise<FieldGroup[]> {
    const { data, error } = await this.supabase
      .from('field_groups')
      .select('*')
      .eq('document_type_id', documentTypeId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return (data || []).map(this.mapFieldGroup);
  }

  async createFieldGroup(dto: CreateFieldGroupDto): Promise<FieldGroup> {
    const { data, error } = await this.supabase
      .from('field_groups')
      .insert({
        document_type_id: dto.documentTypeId,
        slug: dto.slug,
        name: dto.name,
        name_fr: dto.nameFr,
        description: dto.description,
        description_fr: dto.descriptionFr,
        prompt_message: dto.promptMessage,
        prompt_message_fr: dto.promptMessageFr,
        is_repeatable: dto.isRepeatable ?? false,
        min_entries: dto.minEntries ?? 0,
        max_entries: dto.maxEntries ?? 10,
        is_mandatory: dto.isMandatory ?? false,
        is_ai_enhanced: dto.isAiEnhanced ?? false,
        sort_order: dto.sortOrder ?? 0,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapFieldGroup(data);
  }

  async updateFieldGroup(id: string, dto: UpdateFieldGroupDto): Promise<FieldGroup> {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (dto.slug !== undefined) updateData.slug = dto.slug;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.nameFr !== undefined) updateData.name_fr = dto.nameFr;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.descriptionFr !== undefined) updateData.description_fr = dto.descriptionFr;
    if (dto.promptMessage !== undefined) updateData.prompt_message = dto.promptMessage;
    if (dto.promptMessageFr !== undefined) updateData.prompt_message_fr = dto.promptMessageFr;
    if (dto.isRepeatable !== undefined) updateData.is_repeatable = dto.isRepeatable;
    if (dto.minEntries !== undefined) updateData.min_entries = dto.minEntries;
    if (dto.maxEntries !== undefined) updateData.max_entries = dto.maxEntries;
    if (dto.isMandatory !== undefined) updateData.is_mandatory = dto.isMandatory;
    if (dto.isAiEnhanced !== undefined) updateData.is_ai_enhanced = dto.isAiEnhanced;
    if (dto.sortOrder !== undefined) updateData.sort_order = dto.sortOrder;

    const { data, error } = await this.supabase
      .from('field_groups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapFieldGroup(data);
  }

  async deleteFieldGroup(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('field_groups')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FORM FIELDS CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  async getFieldsByGroup(fieldGroupId: string): Promise<FormField[]> {
    const { data, error } = await this.supabase
      .from('form_fields')
      .select('*')
      .eq('field_group_id', fieldGroupId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return (data || []).map(this.mapFormField);
  }

  async createFormField(dto: CreateFormFieldDto): Promise<FormField> {
    const { data, error } = await this.supabase
      .from('form_fields')
      .insert({
        field_group_id: dto.fieldGroupId,
        slug: dto.slug,
        name: dto.name,
        name_fr: dto.nameFr,
        placeholder: dto.placeholder,
        placeholder_fr: dto.placeholderFr,
        field_type: dto.fieldType,
        validation_regex: dto.validationRegex,
        validation_message: dto.validationMessage,
        min_length: dto.minLength,
        max_length: dto.maxLength,
        options: dto.options,
        is_mandatory: dto.isMandatory ?? false,
        is_ai_enhanced: dto.isAiEnhanced ?? false,
        ai_prompt: dto.aiPrompt,
        default_value: dto.defaultValue,
        sort_order: dto.sortOrder ?? 0,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapFormField(data);
  }

  async updateFormField(id: string, dto: UpdateFormFieldDto): Promise<FormField> {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (dto.slug !== undefined) updateData.slug = dto.slug;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.nameFr !== undefined) updateData.name_fr = dto.nameFr;
    if (dto.placeholder !== undefined) updateData.placeholder = dto.placeholder;
    if (dto.placeholderFr !== undefined) updateData.placeholder_fr = dto.placeholderFr;
    if (dto.fieldType !== undefined) updateData.field_type = dto.fieldType;
    if (dto.validationRegex !== undefined) updateData.validation_regex = dto.validationRegex;
    if (dto.validationMessage !== undefined) updateData.validation_message = dto.validationMessage;
    if (dto.minLength !== undefined) updateData.min_length = dto.minLength;
    if (dto.maxLength !== undefined) updateData.max_length = dto.maxLength;
    if (dto.options !== undefined) updateData.options = dto.options;
    if (dto.isMandatory !== undefined) updateData.is_mandatory = dto.isMandatory;
    if (dto.isAiEnhanced !== undefined) updateData.is_ai_enhanced = dto.isAiEnhanced;
    if (dto.aiPrompt !== undefined) updateData.ai_prompt = dto.aiPrompt;
    if (dto.defaultValue !== undefined) updateData.default_value = dto.defaultValue;
    if (dto.sortOrder !== undefined) updateData.sort_order = dto.sortOrder;

    const { data, error } = await this.supabase
      .from('form_fields')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapFormField(data);
  }

  async deleteFormField(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('form_fields')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEMPLATES CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  async getTemplatesByDocumentType(documentTypeId: string, includeInactive = false): Promise<DocumentTemplate[]> {
    let query = this.supabase
      .from('document_templates')
      .select('*')
      .eq('document_type_id', documentTypeId)
      .order('sort_order', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(this.mapTemplate);
  }

  async getTemplateById(id: string): Promise<DocumentTemplate | null> {
    const { data, error } = await this.supabase
      .from('document_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data ? this.mapTemplate(data) : null;
  }

  async createTemplate(dto: CreateTemplateDto): Promise<DocumentTemplate> {
    const { data, error } = await this.supabase
      .from('document_templates')
      .insert({
        document_type_id: dto.documentTypeId,
        slug: dto.slug,
        name: dto.name,
        name_fr: dto.nameFr,
        description: dto.description,
        description_fr: dto.descriptionFr,
        category: dto.category,
        template_html: dto.templateHtml,
        template_css: dto.templateCss,
        preview_image_url: dto.previewImageUrl,
        primary_color: dto.primaryColor || '#667eea',
        secondary_color: dto.secondaryColor || '#764ba2',
        accent_color: dto.accentColor || '#4299e1',
        best_for: dto.bestFor,
        features: dto.features,
        is_default: dto.isDefault ?? false,
        sort_order: dto.sortOrder ?? 0,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapTemplate(data);
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto): Promise<DocumentTemplate> {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (dto.slug !== undefined) updateData.slug = dto.slug;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.nameFr !== undefined) updateData.name_fr = dto.nameFr;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.descriptionFr !== undefined) updateData.description_fr = dto.descriptionFr;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.templateHtml !== undefined) updateData.template_html = dto.templateHtml;
    if (dto.templateCss !== undefined) updateData.template_css = dto.templateCss;
    if (dto.previewImageUrl !== undefined) updateData.preview_image_url = dto.previewImageUrl;
    if (dto.primaryColor !== undefined) updateData.primary_color = dto.primaryColor;
    if (dto.secondaryColor !== undefined) updateData.secondary_color = dto.secondaryColor;
    if (dto.accentColor !== undefined) updateData.accent_color = dto.accentColor;
    if (dto.bestFor !== undefined) updateData.best_for = dto.bestFor;
    if (dto.features !== undefined) updateData.features = dto.features;
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;
    if (dto.isDefault !== undefined) updateData.is_default = dto.isDefault;
    if (dto.sortOrder !== undefined) updateData.sort_order = dto.sortOrder;

    const { data, error } = await this.supabase
      .from('document_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapTemplate(data);
  }

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('document_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAPPERS - Convert DB snake_case to TypeScript camelCase
  // ═══════════════════════════════════════════════════════════════════════════

  private mapDocumentType(data: any): DocumentType {
    return {
      id: data.id,
      slug: data.slug,
      name: data.name,
      nameFr: data.name_fr,
      nameEs: data.name_es,
      description: data.description,
      descriptionFr: data.description_fr,
      icon: data.icon,
      isActive: data.is_active,
      sortOrder: data.sort_order,
      welcomeMessage: data.welcome_message,
      welcomeMessageFr: data.welcome_message_fr,
      completionMessage: data.completion_message,
      completionMessageFr: data.completion_message_fr,
      defaultOutputFormat: data.default_output_format,
      pageSize: data.page_size,
      pageWidthMm: data.page_width_mm,
      pageHeightMm: data.page_height_mm,
      orientation: data.orientation,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      createdBy: data.created_by,
    };
  }

  private mapFieldGroup(data: any): FieldGroup {
    return {
      id: data.id,
      documentTypeId: data.document_type_id,
      slug: data.slug,
      name: data.name,
      nameFr: data.name_fr,
      description: data.description,
      descriptionFr: data.description_fr,
      promptMessage: data.prompt_message,
      promptMessageFr: data.prompt_message_fr,
      isRepeatable: data.is_repeatable,
      minEntries: data.min_entries,
      maxEntries: data.max_entries,
      isMandatory: data.is_mandatory,
      isAiEnhanced: data.is_ai_enhanced,
      sortOrder: data.sort_order,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapFormField(data: any): FormField {
    return {
      id: data.id,
      fieldGroupId: data.field_group_id,
      slug: data.slug,
      name: data.name,
      nameFr: data.name_fr,
      placeholder: data.placeholder,
      placeholderFr: data.placeholder_fr,
      fieldType: data.field_type,
      validationRegex: data.validation_regex,
      validationMessage: data.validation_message,
      minLength: data.min_length,
      maxLength: data.max_length,
      options: data.options,
      isMandatory: data.is_mandatory,
      isAiEnhanced: data.is_ai_enhanced,
      aiPrompt: data.ai_prompt,
      defaultValue: data.default_value,
      sortOrder: data.sort_order,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapTemplate(data: any): DocumentTemplate {
    return {
      id: data.id,
      documentTypeId: data.document_type_id,
      slug: data.slug,
      name: data.name,
      nameFr: data.name_fr,
      description: data.description,
      descriptionFr: data.description_fr,
      category: data.category,
      templateHtml: data.template_html,
      templateCss: data.template_css,
      previewImageUrl: data.preview_image_url,
      primaryColor: data.primary_color,
      secondaryColor: data.secondary_color,
      accentColor: data.accent_color,
      bestFor: data.best_for,
      features: data.features,
      isActive: data.is_active,
      isDefault: data.is_default,
      sortOrder: data.sort_order,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      createdBy: data.created_by,
    };
  }
}
