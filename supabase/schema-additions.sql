-- ============================================================
-- SISD Incident Portal — Schema additions
-- Run in Supabase SQL Editor AFTER schema.sql + fix-trigger-rls.sql + rls-patch.sql
-- ============================================================

-- 1. Add new incident types to the enum
ALTER TYPE incident_type ADD VALUE IF NOT EXISTS 'vaping';
ALTER TYPE incident_type ADD VALUE IF NOT EXISTS 'contraband';

-- 2. Add custom_incident_type to incidents
--    Stores the free-text value when incident_type = 'other'
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS custom_incident_type TEXT;

-- 3. Add sanctions_applied_type to investigation_checklist
--    Stores the selected sanction from the predefined list (or 'other')
ALTER TABLE public.investigation_checklist
  ADD COLUMN IF NOT EXISTS sanctions_applied_type TEXT;
