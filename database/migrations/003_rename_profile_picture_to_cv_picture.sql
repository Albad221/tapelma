-- Rename profile_picture to cv_picture in the conversation_step enum
-- This migration updates the step name from 'profile_picture' to 'cv_picture'

-- Step 1: Remove the default temporarily
ALTER TABLE conversation_sessions
    ALTER COLUMN current_step DROP DEFAULT;

-- Step 2: Create a new enum with cv_picture instead of profile_picture
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

-- Step 3: Update all existing records that have 'profile_picture' to NULL temporarily
-- (We'll set them to 'cv_picture' after the type change)
UPDATE conversation_sessions
SET current_step = NULL
WHERE current_step::text = 'profile_picture';

-- Step 4: Alter the column to use the new enum
ALTER TABLE conversation_sessions
    ALTER COLUMN current_step TYPE conversation_step_new
    USING CASE
        WHEN current_step IS NULL THEN 'cv_picture'::conversation_step_new
        ELSE current_step::text::conversation_step_new
    END;

-- Step 5: Drop the old enum
DROP TYPE conversation_step;

-- Step 6: Rename the new enum to the old name
ALTER TYPE conversation_step_new RENAME TO conversation_step;

-- Step 7: Re-add the default value
ALTER TABLE conversation_sessions
    ALTER COLUMN current_step SET DEFAULT 'greeting'::conversation_step;
