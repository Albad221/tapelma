-- ═══════════════════════════════════════════════════════════════════════════════
-- DYNAMIC DOCUMENT GENERATION SYSTEM
-- Allows admin to create any document type (CV, Business Card, Flyer, etc.)
-- with custom fields and templates - no code changes required
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- DOCUMENT TYPES
-- Defines what types of documents can be generated (CV, Business Card, Flyer, etc.)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS document_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'cv', 'business-card', 'flyer'
    name VARCHAR(100) NOT NULL, -- Display name: 'Resume/CV', 'Business Card'
    name_fr VARCHAR(100), -- French name
    name_es VARCHAR(100), -- Spanish name
    description TEXT,
    description_fr TEXT,
    icon VARCHAR(50), -- Icon identifier for UI
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    -- Conversation settings
    welcome_message TEXT, -- What bot says when user selects this type
    welcome_message_fr TEXT,
    completion_message TEXT, -- What bot says when document is ready
    completion_message_fr TEXT,
    -- Output settings
    default_output_format VARCHAR(20) DEFAULT 'pdf', -- pdf, png, jpg
    page_size VARCHAR(20) DEFAULT 'A4', -- A4, Letter, Custom
    page_width_mm INTEGER, -- For custom sizes (e.g., business card 85mm)
    page_height_mm INTEGER, -- For custom sizes (e.g., business card 55mm)
    orientation VARCHAR(20) DEFAULT 'portrait', -- portrait, landscape
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIELD GROUPS
-- Groups related fields together (e.g., "Personal Info", "Work Experience")
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS field_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type_id UUID NOT NULL REFERENCES document_types(id) ON DELETE CASCADE,
    slug VARCHAR(50) NOT NULL, -- e.g., 'personal_info', 'work_experience'
    name VARCHAR(100) NOT NULL, -- Display name: 'Personal Information'
    name_fr VARCHAR(100),
    description TEXT,
    description_fr TEXT,
    -- Conversation settings
    prompt_message TEXT, -- What bot asks for this group: "Tell me about your work experience"
    prompt_message_fr TEXT,
    -- Behavior settings
    is_repeatable BOOLEAN DEFAULT false, -- Can add multiple entries (e.g., work experiences)
    min_entries INTEGER DEFAULT 0, -- Minimum required entries for repeatable groups
    max_entries INTEGER DEFAULT 10, -- Maximum entries allowed
    is_mandatory BOOLEAN DEFAULT false,
    is_ai_enhanced BOOLEAN DEFAULT false, -- Should AI optimize/generate content for this group?
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(document_type_id, slug)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FORM FIELDS
-- Individual fields within a group (e.g., firstName, lastName, email)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_group_id UUID NOT NULL REFERENCES field_groups(id) ON DELETE CASCADE,
    slug VARCHAR(50) NOT NULL, -- e.g., 'first_name', 'email'
    name VARCHAR(100) NOT NULL, -- Display name: 'First Name'
    name_fr VARCHAR(100),
    placeholder TEXT, -- Placeholder/hint text
    placeholder_fr TEXT,
    -- Field type and validation
    field_type VARCHAR(30) NOT NULL DEFAULT 'text',
    -- Types: text, textarea, email, phone, url, date, select, multiselect, image, file
    validation_regex TEXT, -- Custom regex validation
    validation_message TEXT, -- Error message if validation fails
    min_length INTEGER,
    max_length INTEGER,
    -- Options for select/multiselect fields
    options JSONB, -- [{"value": "basic", "label": "Basic", "label_fr": "Basique"}]
    -- Behavior
    is_mandatory BOOLEAN DEFAULT false,
    is_ai_enhanced BOOLEAN DEFAULT false, -- Should AI optimize/generate content for this field?
    ai_prompt TEXT, -- Custom AI prompt for this field
    default_value TEXT,
    sort_order INTEGER DEFAULT 0,
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(field_group_id, slug)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- DOCUMENT TEMPLATES
-- Store template content directly in database (Handlebars HTML)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type_id UUID NOT NULL REFERENCES document_types(id) ON DELETE CASCADE,
    slug VARCHAR(50) NOT NULL, -- e.g., 'modern', 'classic'
    name VARCHAR(100) NOT NULL, -- Display name: 'Modern Professional'
    name_fr VARCHAR(100),
    description TEXT,
    description_fr TEXT,
    category VARCHAR(50), -- 'modern', 'traditional', 'creative', 'executive'
    -- Template content
    template_html TEXT NOT NULL, -- Handlebars template HTML
    template_css TEXT, -- Optional separate CSS
    -- Visual settings
    preview_image_url TEXT, -- URL to preview thumbnail
    primary_color VARCHAR(20) DEFAULT '#667eea',
    secondary_color VARCHAR(20) DEFAULT '#764ba2',
    accent_color VARCHAR(20) DEFAULT '#4299e1',
    -- Recommendations
    best_for TEXT[], -- ['IT', 'Engineering', 'Business']
    features TEXT[], -- ['Two-column layout', 'ATS-friendly']
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false, -- Default template for this document type
    sort_order INTEGER DEFAULT 0,
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    UNIQUE(document_type_id, slug)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- GENERATED DOCUMENTS (Updated to support any document type)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Note: The existing generated_documents table will be updated to add document_type_id

ALTER TABLE generated_documents
ADD COLUMN IF NOT EXISTS document_type_id UUID REFERENCES document_types(id);

ALTER TABLE generated_documents
ADD COLUMN IF NOT EXISTS template_id_new UUID REFERENCES document_templates(id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- CONVERSATION SESSIONS (Updated to support any document type)
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE conversation_sessions
ADD COLUMN IF NOT EXISTS document_type_id UUID REFERENCES document_types(id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES for performance
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_document_types_active ON document_types(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_field_groups_document ON field_groups(document_type_id);
CREATE INDEX IF NOT EXISTS idx_form_fields_group ON form_fields(field_group_id);
CREATE INDEX IF NOT EXISTS idx_templates_document ON document_templates(document_type_id);
CREATE INDEX IF NOT EXISTS idx_templates_active ON document_templates(is_active) WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DATA: Create CV document type with existing fields
-- ═══════════════════════════════════════════════════════════════════════════════

-- Insert CV document type
INSERT INTO document_types (slug, name, name_fr, description, description_fr, icon, is_active, sort_order,
    welcome_message, welcome_message_fr, completion_message, completion_message_fr,
    default_output_format, page_size, orientation)
VALUES (
    'cv',
    'Resume / CV',
    'CV / Curriculum Vitae',
    'Professional resume for job applications',
    'CV professionnel pour candidatures',
    'document-text',
    true,
    1,
    'Great! Let''s create your professional CV. I''ll guide you through each section.',
    'Parfait ! Créons votre CV professionnel. Je vais vous guider à travers chaque section.',
    'Your CV is ready! Here''s your professional document.',
    'Votre CV est prêt ! Voici votre document professionnel.',
    'pdf',
    'A4',
    'portrait'
) ON CONFLICT (slug) DO NOTHING;

-- Get CV document type ID for field groups
DO $$
DECLARE
    cv_type_id UUID;
    personal_group_id UUID;
    work_group_id UUID;
    edu_group_id UUID;
    skills_group_id UUID;
    langs_group_id UUID;
    certs_group_id UUID;
    summary_group_id UUID;
    picture_group_id UUID;
BEGIN
    SELECT id INTO cv_type_id FROM document_types WHERE slug = 'cv';

    IF cv_type_id IS NOT NULL THEN
        -- Personal Info Group
        INSERT INTO field_groups (document_type_id, slug, name, name_fr, prompt_message, prompt_message_fr,
            is_repeatable, is_mandatory, sort_order)
        VALUES (cv_type_id, 'personal_info', 'Personal Information', 'Informations Personnelles',
            'Let''s start with your basic information. Please provide your full name, email, phone number, and location.',
            'Commençons par vos informations de base. Veuillez fournir votre nom complet, email, téléphone et localisation.',
            false, true, 1)
        ON CONFLICT (document_type_id, slug) DO NOTHING
        RETURNING id INTO personal_group_id;

        IF personal_group_id IS NULL THEN
            SELECT id INTO personal_group_id FROM field_groups WHERE document_type_id = cv_type_id AND slug = 'personal_info';
        END IF;

        -- Personal Info Fields
        INSERT INTO form_fields (field_group_id, slug, name, name_fr, field_type, is_mandatory, sort_order)
        VALUES
            (personal_group_id, 'first_name', 'First Name', 'Prénom', 'text', true, 1),
            (personal_group_id, 'last_name', 'Last Name', 'Nom', 'text', true, 2),
            (personal_group_id, 'email', 'Email', 'Email', 'email', false, 3),
            (personal_group_id, 'phone', 'Phone', 'Téléphone', 'phone', false, 4),
            (personal_group_id, 'city', 'City', 'Ville', 'text', false, 5),
            (personal_group_id, 'country', 'Country', 'Pays', 'text', false, 6),
            (personal_group_id, 'linkedin', 'LinkedIn URL', 'URL LinkedIn', 'url', false, 7),
            (personal_group_id, 'portfolio', 'Portfolio/Website', 'Portfolio/Site Web', 'url', false, 8)
        ON CONFLICT (field_group_id, slug) DO NOTHING;

        -- Work Experience Group
        INSERT INTO field_groups (document_type_id, slug, name, name_fr, prompt_message, prompt_message_fr,
            is_repeatable, min_entries, max_entries, is_ai_enhanced, sort_order)
        VALUES (cv_type_id, 'work_experience', 'Work Experience', 'Expérience Professionnelle',
            'Tell me about your work experience. Include company name, position, dates, and describe your responsibilities.',
            'Parlez-moi de votre expérience professionnelle. Incluez le nom de l''entreprise, le poste, les dates et décrivez vos responsabilités.',
            true, 0, 10, true, 2)
        ON CONFLICT (document_type_id, slug) DO NOTHING
        RETURNING id INTO work_group_id;

        IF work_group_id IS NULL THEN
            SELECT id INTO work_group_id FROM field_groups WHERE document_type_id = cv_type_id AND slug = 'work_experience';
        END IF;

        INSERT INTO form_fields (field_group_id, slug, name, name_fr, field_type, is_mandatory, is_ai_enhanced, sort_order)
        VALUES
            (work_group_id, 'company_name', 'Company Name', 'Nom de l''entreprise', 'text', true, false, 1),
            (work_group_id, 'position', 'Position/Title', 'Poste/Titre', 'text', true, false, 2),
            (work_group_id, 'location', 'Location', 'Lieu', 'text', false, false, 3),
            (work_group_id, 'start_date', 'Start Date', 'Date de début', 'text', false, false, 4),
            (work_group_id, 'end_date', 'End Date', 'Date de fin', 'text', false, false, 5),
            (work_group_id, 'is_current', 'Currently Working Here', 'Poste actuel', 'boolean', false, false, 6),
            (work_group_id, 'description', 'Description', 'Description', 'textarea', false, true, 7)
        ON CONFLICT (field_group_id, slug) DO NOTHING;

        -- Education Group
        INSERT INTO field_groups (document_type_id, slug, name, name_fr, prompt_message, prompt_message_fr,
            is_repeatable, min_entries, max_entries, sort_order)
        VALUES (cv_type_id, 'education', 'Education', 'Formation',
            'What about your education? Share your degrees, institutions, and graduation dates.',
            'Et votre formation ? Partagez vos diplômes, établissements et dates de graduation.',
            true, 0, 5, false, 3)
        ON CONFLICT (document_type_id, slug) DO NOTHING
        RETURNING id INTO edu_group_id;

        IF edu_group_id IS NULL THEN
            SELECT id INTO edu_group_id FROM field_groups WHERE document_type_id = cv_type_id AND slug = 'education';
        END IF;

        INSERT INTO form_fields (field_group_id, slug, name, name_fr, field_type, is_mandatory, sort_order)
        VALUES
            (edu_group_id, 'institution', 'Institution', 'Établissement', 'text', true, 1),
            (edu_group_id, 'degree', 'Degree', 'Diplôme', 'text', true, 2),
            (edu_group_id, 'field_of_study', 'Field of Study', 'Domaine d''études', 'text', false, 3),
            (edu_group_id, 'start_date', 'Start Date', 'Date de début', 'text', false, 4),
            (edu_group_id, 'end_date', 'End Date', 'Date de fin', 'text', false, 5),
            (edu_group_id, 'gpa', 'GPA/Grade', 'Moyenne/Note', 'text', false, 6)
        ON CONFLICT (field_group_id, slug) DO NOTHING;

        -- Skills Group
        INSERT INTO field_groups (document_type_id, slug, name, name_fr, prompt_message, prompt_message_fr,
            is_repeatable, is_ai_enhanced, sort_order)
        VALUES (cv_type_id, 'skills', 'Skills', 'Compétences',
            'What skills do you have? List your technical and soft skills.',
            'Quelles compétences avez-vous ? Listez vos compétences techniques et personnelles.',
            true, true, 4)
        ON CONFLICT (document_type_id, slug) DO NOTHING
        RETURNING id INTO skills_group_id;

        IF skills_group_id IS NULL THEN
            SELECT id INTO skills_group_id FROM field_groups WHERE document_type_id = cv_type_id AND slug = 'skills';
        END IF;

        INSERT INTO form_fields (field_group_id, slug, name, name_fr, field_type, sort_order)
        VALUES
            (skills_group_id, 'name', 'Skill Name', 'Nom de la compétence', 'text', 1),
            (skills_group_id, 'category', 'Category', 'Catégorie', 'text', 2),
            (skills_group_id, 'proficiency', 'Proficiency Level', 'Niveau', 'select', 3)
        ON CONFLICT (field_group_id, slug) DO NOTHING;

        -- Languages Group
        INSERT INTO field_groups (document_type_id, slug, name, name_fr, prompt_message, prompt_message_fr,
            is_repeatable, sort_order)
        VALUES (cv_type_id, 'languages', 'Languages', 'Langues',
            'What languages do you speak? Include proficiency levels.',
            'Quelles langues parlez-vous ? Incluez votre niveau de maîtrise.',
            true, 5)
        ON CONFLICT (document_type_id, slug) DO NOTHING
        RETURNING id INTO langs_group_id;

        IF langs_group_id IS NULL THEN
            SELECT id INTO langs_group_id FROM field_groups WHERE document_type_id = cv_type_id AND slug = 'languages';
        END IF;

        INSERT INTO form_fields (field_group_id, slug, name, name_fr, field_type, sort_order, options)
        VALUES
            (langs_group_id, 'name', 'Language', 'Langue', 'text', 1, NULL),
            (langs_group_id, 'proficiency', 'Proficiency', 'Niveau', 'select', 2,
                '[{"value": "native", "label": "Native", "label_fr": "Langue maternelle"},
                  {"value": "fluent", "label": "Fluent", "label_fr": "Courant"},
                  {"value": "professional", "label": "Professional", "label_fr": "Professionnel"},
                  {"value": "intermediate", "label": "Intermediate", "label_fr": "Intermédiaire"},
                  {"value": "basic", "label": "Basic", "label_fr": "Basique"}]'::jsonb)
        ON CONFLICT (field_group_id, slug) DO NOTHING;

        -- Certifications Group
        INSERT INTO field_groups (document_type_id, slug, name, name_fr, prompt_message, prompt_message_fr,
            is_repeatable, sort_order)
        VALUES (cv_type_id, 'certifications', 'Certifications', 'Certifications',
            'Do you have any certifications? Share the name, issuing organization, and dates.',
            'Avez-vous des certifications ? Partagez le nom, l''organisme et les dates.',
            true, 6)
        ON CONFLICT (document_type_id, slug) DO NOTHING
        RETURNING id INTO certs_group_id;

        IF certs_group_id IS NULL THEN
            SELECT id INTO certs_group_id FROM field_groups WHERE document_type_id = cv_type_id AND slug = 'certifications';
        END IF;

        INSERT INTO form_fields (field_group_id, slug, name, name_fr, field_type, sort_order)
        VALUES
            (certs_group_id, 'name', 'Certification Name', 'Nom de la certification', 'text', 1),
            (certs_group_id, 'issuing_organization', 'Issuing Organization', 'Organisme', 'text', 2),
            (certs_group_id, 'issue_date', 'Issue Date', 'Date d''obtention', 'text', 3),
            (certs_group_id, 'expiry_date', 'Expiry Date', 'Date d''expiration', 'text', 4),
            (certs_group_id, 'credential_url', 'Credential URL', 'URL du certificat', 'url', 5)
        ON CONFLICT (field_group_id, slug) DO NOTHING;

        -- Professional Summary Group
        INSERT INTO field_groups (document_type_id, slug, name, name_fr, prompt_message, prompt_message_fr,
            is_repeatable, is_ai_enhanced, sort_order)
        VALUES (cv_type_id, 'professional_summary', 'Professional Summary', 'Résumé Professionnel',
            'Would you like me to generate a professional summary based on your experience?',
            'Voulez-vous que je génère un résumé professionnel basé sur votre expérience ?',
            false, true, 7)
        ON CONFLICT (document_type_id, slug) DO NOTHING
        RETURNING id INTO summary_group_id;

        IF summary_group_id IS NULL THEN
            SELECT id INTO summary_group_id FROM field_groups WHERE document_type_id = cv_type_id AND slug = 'professional_summary';
        END IF;

        INSERT INTO form_fields (field_group_id, slug, name, name_fr, field_type, is_ai_enhanced, sort_order)
        VALUES
            (summary_group_id, 'summary', 'Summary', 'Résumé', 'textarea', true, 1)
        ON CONFLICT (field_group_id, slug) DO NOTHING;

        -- CV Picture Group
        INSERT INTO field_groups (document_type_id, slug, name, name_fr, prompt_message, prompt_message_fr,
            is_repeatable, sort_order)
        VALUES (cv_type_id, 'cv_picture', 'Profile Picture', 'Photo de Profil',
            'Would you like to add a professional photo to your CV? Send an image if yes, or say "skip" to continue.',
            'Voulez-vous ajouter une photo professionnelle à votre CV ? Envoyez une image si oui, ou dites "passer" pour continuer.',
            false, 8)
        ON CONFLICT (document_type_id, slug) DO NOTHING
        RETURNING id INTO picture_group_id;

        IF picture_group_id IS NULL THEN
            SELECT id INTO picture_group_id FROM field_groups WHERE document_type_id = cv_type_id AND slug = 'cv_picture';
        END IF;

        INSERT INTO form_fields (field_group_id, slug, name, name_fr, field_type, sort_order)
        VALUES
            (picture_group_id, 'image_url', 'Picture URL', 'URL de la photo', 'image', 1)
        ON CONFLICT (field_group_id, slug) DO NOTHING;

    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ENABLE RLS
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- Public read access for active document types
CREATE POLICY "Public can view active document types" ON document_types
    FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view field groups" ON field_groups
    FOR SELECT USING (true);

CREATE POLICY "Public can view form fields" ON form_fields
    FOR SELECT USING (true);

CREATE POLICY "Public can view active templates" ON document_templates
    FOR SELECT USING (is_active = true);

-- Service role has full access
CREATE POLICY "Service role has full access to document_types" ON document_types
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to field_groups" ON field_groups
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to form_fields" ON form_fields
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to document_templates" ON document_templates
    FOR ALL USING (true) WITH CHECK (true);
