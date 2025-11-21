-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    preferred_language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Session states for conversation flow
CREATE TYPE session_status AS ENUM ('active', 'completed', 'abandoned', 'paused');
CREATE TYPE conversation_step AS ENUM (
    'greeting',
    'language_selection',
    'personal_info',
    'work_experience',
    'education',
    'skills',
    'languages_known',
    'certifications',
    'template_selection',
    'review',
    'generation',
    'completed'
);

CREATE TABLE conversation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status session_status DEFAULT 'active',
    current_step conversation_step DEFAULT 'greeting',
    language VARCHAR(10) DEFAULT 'en',
    data JSONB DEFAULT '{}'::jsonb,
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Work Experience
CREATE TABLE work_experiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT false,
    description TEXT,
    optimized_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Education
CREATE TABLE education (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    institution VARCHAR(255) NOT NULL,
    degree VARCHAR(255) NOT NULL,
    field_of_study VARCHAR(255),
    location VARCHAR(255),
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT false,
    gpa VARCHAR(20),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Skills
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50), -- technical, soft, language, etc.
    proficiency VARCHAR(50), -- beginner, intermediate, advanced, expert
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Certifications
CREATE TABLE certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    issuing_organization VARCHAR(255),
    issue_date DATE,
    expiry_date DATE,
    credential_id VARCHAR(255),
    credential_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Generated CVs
CREATE TYPE document_type AS ENUM ('cv', 'cover_letter');
CREATE TYPE document_status AS ENUM ('generating', 'completed', 'failed');

CREATE TABLE generated_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    document_type document_type NOT NULL,
    template_id VARCHAR(100),
    file_url TEXT,
    s3_key VARCHAR(500),
    file_format VARCHAR(10), -- pdf, docx
    ats_score INTEGER,
    ats_suggestions JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    status document_status DEFAULT 'generating',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Message logs for debugging and analytics
CREATE TABLE message_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES conversation_sessions(id) ON DELETE SET NULL,
    direction VARCHAR(10), -- inbound, outbound
    message_type VARCHAR(50), -- text, image, document, template
    content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Canva templates catalog
CREATE TABLE cv_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    canva_design_id VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    preview_url TEXT,
    category VARCHAR(100), -- professional, creative, modern, traditional
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_sessions_user ON conversation_sessions(user_id);
CREATE INDEX idx_sessions_status ON conversation_sessions(status);
CREATE INDEX idx_work_exp_session ON work_experiences(session_id);
CREATE INDEX idx_education_session ON education(session_id);
CREATE INDEX idx_skills_session ON skills(session_id);
CREATE INDEX idx_documents_user ON generated_documents(user_id);
CREATE INDEX idx_documents_session ON generated_documents(session_id);
CREATE INDEX idx_message_logs_user ON message_logs(user_id);
CREATE INDEX idx_message_logs_created ON message_logs(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_sessions_updated_at BEFORE UPDATE ON conversation_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
