-- ============================================================
-- SISD Incident Portal — Rule of 25 incident types
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TYPE incident_type ADD VALUE IF NOT EXISTS 'rule_of_25_behaviour';
ALTER TYPE incident_type ADD VALUE IF NOT EXISTS 'rule_of_25_lates';
