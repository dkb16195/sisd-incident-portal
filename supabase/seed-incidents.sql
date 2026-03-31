-- ============================================================
-- SISD Incident Portal — Exemplar incident data
-- Run AFTER schema.sql + all patches
-- Uses the first admin profile as the logged_by user
-- ============================================================

DO $$
DECLARE
  admin_id UUID;
  i1 UUID; i2 UUID; i3 UUID; i4 UUID; i5 UUID;
  i6 UUID; i7 UUID; i8 UUID; i9 UUID; i10 UUID;
  i11 UUID; i12 UUID; i13 UUID; i14 UUID; i15 UUID;
  i16 UUID; i17 UUID; i18 UUID; i19 UUID; i20 UUID;
  i21 UUID; i22 UUID; i23 UUID; i24 UUID; i25 UUID;
  s1 UUID; s2 UUID; s3 UUID; s4 UUID; s5 UUID;
BEGIN

  -- Get admin user
  SELECT id INTO admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin profile found. Create an admin user first.';
  END IF;

  -- Grab a handful of real students if they exist (won't fail if absent)
  SELECT id INTO s1 FROM public.students LIMIT 1 OFFSET 0;
  SELECT id INTO s2 FROM public.students LIMIT 1 OFFSET 1;
  SELECT id INTO s3 FROM public.students LIMIT 1 OFFSET 2;
  SELECT id INTO s4 FROM public.students LIMIT 1 OFFSET 3;
  SELECT id INTO s5 FROM public.students LIMIT 1 OFFSET 4;

  -- ── INSERT INCIDENTS ──────────────────────────────────────────────────────

  INSERT INTO public.incidents (title, incident_type, description, incident_date, location, grade, status, severity, logged_by)
  VALUES ('Physical altercation in corridor B', 'physical_altercation',
    'Two students were observed fighting near the lockers in corridor B during morning break. A third student attempted to intervene. Duty teacher separated the students immediately. Both students were taken to the pastoral office. Minor injuries reported — no medical attention required.',
    CURRENT_DATE - 2, 'Corridor B, Floor 2', 'Grade 8', 'in_progress', 'high', admin_id)
  RETURNING id INTO i1;

  INSERT INTO public.incidents (title, incident_type, description, incident_date, location, grade, status, severity, logged_by)
  VALUES ('Bullying reported in Grade 7 class', 'bullying',
    'A student disclosed to their Homeroom Teacher that they had been subjected to persistent name-calling and social exclusion by a group of three classmates over a period of approximately two weeks. The incidents reportedly occurred in class, at lunch, and online. Parents of the reporting student have been informed.',
    CURRENT_DATE - 5, 'Classroom 7B and canteen', 'Grade 7', 'in_progress', 'high', admin_id)
  RETURNING id INTO i2;

  INSERT INTO public.incidents (title, incident_type, description, incident_date, location, grade, status, severity, logged_by)
  VALUES ('Vaping device found in boys toilets', 'vaping',
    'A vaping device was found by a duty teacher in the boys toilets on Floor 3 during Period 3. The device was confiscated and handed to the pastoral office. CCTV footage is being reviewed. Three students have been identified as having accessed that area during the relevant time.',
    CURRENT_DATE - 1, 'Boys toilets, Floor 3', 'Grade 10', 'open', 'critical', admin_id)
  RETURNING id INTO i3;

  INSERT INTO public.incidents (title, incident_type, description, incident_date, location, grade, status, severity, logged_by)
  VALUES ('Social media harassment between Grade 9 students', 'social_media',
    'A student reported receiving multiple hostile messages and being tagged in a mocking post on Instagram by a peer. Screenshots were provided. The content included personal insults and a manipulated image. The reporting student is visibly distressed. Parents contacted on both sides.',
    CURRENT_DATE - 7, 'Outside school / online', 'Grade 9', 'in_progress', 'high', admin_id)
  RETURNING id INTO i4;

  INSERT INTO public.incidents (title, incident_type, description, incident_date, location, grade, status, severity, logged_by)
  VALUES ('Theft of mobile phone from changing rooms', 'theft',
    'A student reported their mobile phone missing after PE class. The phone was last seen in the changing room before the lesson. A search of the changing room did not locate the device. The student''s parents have been informed and a police report may be filed. Other students in the session have been spoken to.',
    CURRENT_DATE - 10, 'PE changing rooms', 'Grade 8', 'in_progress', 'medium', admin_id)
  RETURNING id INTO i5;

  INSERT INTO public.incidents (title, incident_type, description, incident_date, location, grade, status, severity, logged_by)
  VALUES ('Verbal altercation between students at lunch', 'verbal_misconduct',
    'Two students engaged in a heated verbal exchange in the canteen during lunch. Raised voices and aggressive language were reported by a supervising teacher. The students were separated and brought to the pastoral office. Neither student was willing to discuss the cause of the dispute initially.',
    CURRENT_DATE - 3, 'Canteen', 'Grade 9', 'resolved', 'low', admin_id)
  RETURNING id INTO i6;

  INSERT INTO public.incidents (title, incident_type, description, incident_date, location, grade, status, severity, logged_by)
  VALUES ('Safeguarding concern raised by HRT', 'safeguarding',
    'A Homeroom Teacher reported significant changes in a student''s behaviour over the past three weeks, including withdrawal from peers, declining academic engagement, and two unexplained absences. The student made a brief disclosure suggesting difficulties at home. Referred immediately to the DSL in accordance with safeguarding protocol.',
    CURRENT_DATE - 4, 'Classroom 6A', 'Grade 6', 'referred', 'critical', admin_id)
  RETURNING id INTO i7;

  INSERT INTO public.incidents (title, incident_type, description, incident_date, location, grade, status, severity, logged_by)
  VALUES ('Property damage to classroom equipment', 'property_damage',
    'A student was observed deliberately breaking the screen of a school-issue Chromebook during a Science lesson. The teacher intervened and the student became verbally aggressive before leaving the room without permission. The Chromebook is beyond repair. Estimated replacement cost: 350 AED.',
    CURRENT_DATE - 8, 'Science lab, Room 204', 'Grade 8', 'resolved', 'medium', admin_id)
  RETURNING id INTO i8;

  INSERT INTO public.incidents (title, incident_type, description, incident_date, location, grade, status, severity, logged_by)
  VALUES ('Peer conflict over group project dispute', 'peer_conflict',
    'A disagreement between four students over the allocation of tasks in a group project escalated during a free period. One student accused another of taking credit for their work. Voices were raised but no physical contact occurred. Teacher mediator intervened and the group were separated for the remainder of the session.',
    CURRENT_DATE - 6, 'Library, study area', 'Grade 10', 'resolved', 'low', admin_id)
  RETURNING id INTO i9;

  INSERT INTO public.incidents (title, incident_type, description, incident_date, location, grade, status, severity, logged_by)
  VALUES ('Contraband energy drinks confiscated', 'contraband',
    'Four cans of high-caffeine energy drinks were confiscated from a student''s bag during a routine check. The student stated the drinks were for personal consumption during study periods. Parents were informed. The student was reminded of the school''s policy on prohibited items.',
    CURRENT_DATE - 9, 'Pastoral office', 'Grade 11', 'resolved', 'low', admin_id)
  RETURNING id INTO i10;

  INSERT INTO public.incidents (title, incident_type, description, incident_date, location, grade, status, severity, logged_by)
  VALUES ('Alleged bullying by older students', 'bullying',
    'Two Grade 6 students reported being intimidated by a group of older students near the sports hall entrance after school. The younger students described being told to hand over food and having their bags searched. Both students were visibly upset when disclosing. Parents contacted and CCTV reviewed.',
    CURRENT_DATE - 12, 'Sports hall entrance', 'Grade 6', 'in_progress', 'high', admin_id)
  RETURNING id INTO i11;

  INSERT INTO public.incidents (title, incident_type, description, incident_date, location, grade, status, severity, logged_by)
  VALUES ('Student found with cigarettes on school grounds', 'vaping',
    'A student was found in possession of a pack of cigarettes near the back entrance to the school building during lunchtime. The cigarettes were confiscated. The student admitted they were their own. This is a second offence for this student. Deputy Head has been informed.',
    CURRENT_DATE - 14, 'Back entrance, Building A', 'Grade 12', 'in_progress', 'high', admin_id)
  RETURNING id INTO i12;

  INSERT INTO public.incidents (title, incident_type, description, incident_date, location, grade, status, severity, logged_by)
  VALUES ('Verbal abuse directed at teaching assistant', 'verbal_misconduct',
    'A student directed repeated verbal insults at a Teaching Assistant during a support session, including language deemed offensive and aggressive. The TA left the room to seek support. The student had been asked to complete an extension task and refused. Head of Secondary has been informed.',
    CURRENT_DATE - 11, 'Support room, Floor 1', 'Grade 9', 'referred', 'critical', admin_id)
  RETURNING id INTO i13;

  INSERT INTO public.incidents (title, incident_type, description, incident_date, location, grade, status, severity, logged_by)
  VALUES ('Social media group targeting classmate', 'social_media',
    'Parents contacted the school to report a private messaging group in which their child was being mocked, with messages including offensive nicknames and fabricated rumours. The group included at least six students from the same class. Screenshots have been submitted to the pastoral team.',
    CURRENT_DATE - 15, 'Outside school / online', 'Grade 7', 'in_progress', 'high', admin_id)
  RETURNING id INTO i14;

  INSERT INTO public.incidents (title, incident_type, description, incident_date, location, grade, status, severity, logged_by)
  VALUES ('Theft of stationery and cash from locker', 'theft',
    'A student reported that their locker had been opened and items including cash (approximately 50 AED), a calculator, and coloured markers were missing. The locker does not appear to have been forced. Site management have been asked to review access logs.',
    CURRENT_DATE - 18, 'Locker bay, Floor 2', 'Grade 7', 'open', 'medium', admin_id)
  RETURNING id INTO i15;

  INSERT INTO public.incidents (title, incident_type, description, incident_date, location, grade, status, severity, logged_by)
  VALUES ('Physical pushing incident on stairwell', 'physical_altercation',
    'A student was pushed from behind on a stairwell between lessons, causing them to stumble and suffer a minor graze to their knee. A witness identified the student responsible. Both students were interviewed separately. The incident appears to have been connected to an ongoing dispute.',
    CURRENT_DATE - 20, 'Stairwell B, between Floors 1 and 2', 'Grade 8', 'resolved', 'medium', admin_id)
  RETURNING id INTO i16;

  INSERT INTO public.incidents (title, incident_type, description, incident_date, location, grade, status, severity, logged_by)
  VALUES ('Student repeatedly leaving class without permission', 'other',
    'A student has left lessons without teacher permission on five separate occasions across three subject areas over the past two weeks. On each occasion the student was found in the corridor or toilets. Subject teachers have flagged the pattern. Parents contacted. Monitoring card to be considered.',
    CURRENT_DATE - 22, 'Various classrooms', 'Grade 6', 'in_progress', 'low', admin_id)
  RETURNING id INTO i17;

  INSERT INTO public.incidents (title, incident_type, description, incident_date, location, grade, status, severity, logged_by, custom_incident_type)
  VALUES ('Student impersonating another online', 'other',
    'A student created a fake social media profile using another student''s name and photograph. The account was used to send messages to peers. The victim''s parents reported the matter to the school. Both sets of parents have been contacted. The fake account has been reported to the platform.',
    CURRENT_DATE - 25, 'Outside school / online', 'Grade 10', 'in_progress', 'high', admin_id, 'Online impersonation')
  RETURNING id INTO i18;

  INSERT INTO public.incidents (title, incident_type, description, incident_date, location, grade, status, severity, logged_by)
  VALUES ('Aggressive behaviour during sports lesson', 'physical_altercation',
    'During a football match in PE, a student became increasingly agitated after a disputed call and shoved an opposing player to the ground. The lesson was halted. The student refused to apologise and had to be removed from the sports hall. No injuries sustained.',
    CURRENT_DATE - 28, 'Sports hall', 'Grade 9', 'resolved', 'medium', admin_id)
  RETURNING id INTO i19;

  INSERT INTO public.incidents (title, incident_type, description, incident_date, location, grade, status, severity, logged_by)
  VALUES ('Peer conflict leading to temporary exclusion from group', 'peer_conflict',
    'A long-running friendship dispute between three students came to a head when one student was deliberately excluded from a group activity and had belongings hidden. The targeted student broke down in class. Pastoral mediation was arranged. All parents informed.',
    CURRENT_DATE - 30, 'Classroom 8C and playground', 'Grade 8', 'resolved', 'low', admin_id)
  RETURNING id INTO i20;

  INSERT INTO public.incidents (title, incident_type, description, incident_date, location, grade, status, severity, logged_by)
  VALUES ('Graffiti found on toilet cubicle door', 'property_damage',
    'Offensive graffiti was found written in marker pen inside a toilet cubicle. The content included a named student and offensive language. Site management have been informed and the graffiti removed. Investigation ongoing to identify the responsible student.',
    CURRENT_DATE - 32, 'Girls toilets, Floor 2', 'Grade 11', 'open', 'medium', admin_id)
  RETURNING id INTO i21;

  INSERT INTO public.incidents (title, incident_type, description, incident_date, location, grade, status, severity, logged_by)
  VALUES ('Student in possession of prohibited item', 'contraband',
    'During a bag check, a student was found in possession of a laser pointer pen, which is a prohibited item under school policy due to safety concerns. The item was confiscated and the student''s parents were informed. First offence.',
    CURRENT_DATE - 35, 'Pastoral office', 'Grade 7', 'resolved', 'low', admin_id)
  RETURNING id INTO i22;

  INSERT INTO public.incidents (title, incident_type, description, incident_date, location, grade, status, severity, logged_by)
  VALUES ('Safeguarding referral following disclosure of family difficulties', 'safeguarding',
    'During a one-to-one pastoral check-in, a student disclosed that their parent had been absent from the home for several weeks and that an older sibling was currently responsible for their care. The student appeared underfed and was wearing the same uniform for the third consecutive day. DSL informed and referral made.',
    CURRENT_DATE - 38, 'Pastoral office', 'Grade 6', 'referred', 'critical', admin_id)
  RETURNING id INTO i23;

  INSERT INTO public.incidents (title, incident_type, description, incident_date, location, grade, status, severity, logged_by)
  VALUES ('Threatening message sent via student email', 'verbal_misconduct',
    'A student received a threatening message via their school email account from another student. The message contained a specific threat regarding an after-school incident. IT Services have retrieved the email and the sending account has been identified. Both sets of parents contacted. Deputy Head informed.',
    CURRENT_DATE - 40, 'Outside school / online', 'Grade 11', 'in_progress', 'critical', admin_id)
  RETURNING id INTO i24;

  INSERT INTO public.incidents (title, incident_type, description, incident_date, location, grade, status, severity, logged_by)
  VALUES ('Repeated low-level disruption forming pattern', 'verbal_misconduct',
    'Multiple subject teachers have reported the same student for persistent low-level disruption across four different lessons over two weeks: talking over the teacher, making noise, and refusing to comply with simple instructions. Individual sanctions have had no effect. Pastoral meeting with student and parents required.',
    CURRENT_DATE - 42, 'Various classrooms', 'Grade 9', 'open', 'low', admin_id)
  RETURNING id INTO i25;

  -- ── LINK SOME STUDENTS (if students exist in DB) ──────────────────────────

  IF s1 IS NOT NULL THEN
    INSERT INTO public.incident_students (incident_id, student_id, role) VALUES (i1, s1, 'perpetrator') ON CONFLICT DO NOTHING;
    INSERT INTO public.incident_students (incident_id, student_id, role) VALUES (i2, s1, 'victim') ON CONFLICT DO NOTHING;
  END IF;
  IF s2 IS NOT NULL THEN
    INSERT INTO public.incident_students (incident_id, student_id, role) VALUES (i1, s2, 'victim') ON CONFLICT DO NOTHING;
    INSERT INTO public.incident_students (incident_id, student_id, role) VALUES (i4, s2, 'perpetrator') ON CONFLICT DO NOTHING;
  END IF;
  IF s3 IS NOT NULL THEN
    INSERT INTO public.incident_students (incident_id, student_id, role) VALUES (i2, s3, 'perpetrator') ON CONFLICT DO NOTHING;
    INSERT INTO public.incident_students (incident_id, student_id, role) VALUES (i6, s3, 'involved') ON CONFLICT DO NOTHING;
  END IF;
  IF s4 IS NOT NULL THEN
    INSERT INTO public.incident_students (incident_id, student_id, role) VALUES (i3, s4, 'involved') ON CONFLICT DO NOTHING;
    INSERT INTO public.incident_students (incident_id, student_id, role) VALUES (i11, s4, 'victim') ON CONFLICT DO NOTHING;
  END IF;
  IF s5 IS NOT NULL THEN
    INSERT INTO public.incident_students (incident_id, student_id, role) VALUES (i5, s5, 'victim') ON CONFLICT DO NOTHING;
    INSERT INTO public.incident_students (incident_id, student_id, role) VALUES (i14, s5, 'victim') ON CONFLICT DO NOTHING;
  END IF;

  -- ── UPDATE SOME CHECKLISTS (resolved incidents should have progress) ──────

  UPDATE public.investigation_checklist SET
    statements_taken = true, statements_taken_date = CURRENT_DATE - 8,
    parents_contacted = true, parents_contacted_date = CURRENT_DATE - 8,
    sanctions_applied = true, sanctions_applied_date = CURRENT_DATE - 7,
    sanctions_applied_type = 'after_school_reflection',
    follow_up_scheduled = true, follow_up_scheduled_date = CURRENT_DATE - 5
  WHERE incident_id = i6;

  UPDATE public.investigation_checklist SET
    statements_taken = true, statements_taken_date = CURRENT_DATE - 7,
    parents_contacted = true, parents_contacted_date = CURRENT_DATE - 7,
    referred_to_deputy = true, referred_to_deputy_date = CURRENT_DATE - 6,
    sanctions_applied = true, sanctions_applied_date = CURRENT_DATE - 6,
    sanctions_applied_type = 'internal_reflection_day',
    follow_up_scheduled = true, follow_up_scheduled_date = CURRENT_DATE - 3
  WHERE incident_id = i8;

  UPDATE public.investigation_checklist SET
    statements_taken = true, statements_taken_date = CURRENT_DATE - 27,
    parents_contacted = true, parents_contacted_date = CURRENT_DATE - 27,
    sanctions_applied = true, sanctions_applied_date = CURRENT_DATE - 26,
    sanctions_applied_type = 'lunchtime_reflection',
    follow_up_scheduled = true, follow_up_scheduled_date = CURRENT_DATE - 25
  WHERE incident_id = i16;

  UPDATE public.investigation_checklist SET
    statements_taken = true, statements_taken_date = CURRENT_DATE - 29,
    parents_contacted = true, parents_contacted_date = CURRENT_DATE - 28,
    sanctions_applied = true, sanctions_applied_date = CURRENT_DATE - 28,
    sanctions_applied_type = 'monitoring_card',
    follow_up_scheduled = true, follow_up_scheduled_date = CURRENT_DATE - 26
  WHERE incident_id = i19;

  UPDATE public.investigation_checklist SET
    statements_taken = true, statements_taken_date = CURRENT_DATE - 8,
    parents_contacted = true, parents_contacted_date = CURRENT_DATE - 8,
    sanctions_applied = true, sanctions_applied_date = CURRENT_DATE - 7,
    sanctions_applied_type = 'warning_applied'
  WHERE incident_id = i9;

  UPDATE public.investigation_checklist SET
    statements_taken = true, statements_taken_date = CURRENT_DATE - 1,
    parents_contacted = true, parents_contacted_date = CURRENT_DATE - 1,
    referred_to_deputy = true, referred_to_deputy_date = CURRENT_DATE - 1
  WHERE incident_id = i3;

  UPDATE public.investigation_checklist SET
    statements_taken = true, statements_taken_date = CURRENT_DATE - 4,
    parents_contacted = true, parents_contacted_date = CURRENT_DATE - 3,
    referred_to_deputy = true, referred_to_deputy_date = CURRENT_DATE - 4
  WHERE incident_id = i7;

  UPDATE public.investigation_checklist SET
    statements_taken = true, statements_taken_date = CURRENT_DATE - 34,
    parents_contacted = true, parents_contacted_date = CURRENT_DATE - 34,
    sanctions_applied = true, sanctions_applied_date = CURRENT_DATE - 33,
    sanctions_applied_type = 'intervention_isams',
    follow_up_scheduled = true, follow_up_scheduled_date = CURRENT_DATE - 30
  WHERE incident_id = i22;

  RAISE NOTICE '25 exemplar incidents inserted successfully.';
END;
$$;
