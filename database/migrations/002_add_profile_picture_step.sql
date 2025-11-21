-- Add cv_picture to the conversation_step enum
-- This migration adds the new 'cv_picture' step between 'professional_summary' and 'template_selection'

-- Step 1: Remove the default temporarily
ALTER TABLE conversation_sessions
    ALTER COLUMN current_step DROP DEFAULT;

-- Step 2: Create a new enum with all values including cv_picture
CREATE TYPE conversation_step_new AS ENUM (
    'greeting',
    'language_selection',
    'personal_info',
    'work_experience',
    'education',
    'skills',
    'languages_known',
    'certifications',
    'professional_summary',
    'cv_picture',
    'template_selection',
    'review',
    'generation',
    'completed'
);

-- Step 3: Alter the column to use the new enum
ALTER TABLE conversation_sessions
    ALTER COLUMN current_step TYPE conversation_step_new
    USING current_step::text::conversation_step_new;

-- Step 4: Drop the old enum
DROP TYPE conversation_step;

-- Step 5: Rename the new enum to the old name
ALTER TYPE conversation_step_new RENAME TO conversation_step;

-- Step 6: Re-add the default value
ALTER TABLE conversation_sessions
    ALTER COLUMN current_step SET DEFAULT 'greeting'::conversation_step;
