-- Add professional_summary to the conversation_step enum
-- This migration adds the new 'professional_summary' step between 'certifications' and 'template_selection'

ALTER TYPE conversation_step ADD VALUE IF NOT EXISTS 'professional_summary' AFTER 'certifications';

-- Note: In PostgreSQL, you cannot reorder enum values after they're created.
-- The order in the enum doesn't affect functionality, only the display order.
-- The actual conversation flow order is managed by the application logic.
