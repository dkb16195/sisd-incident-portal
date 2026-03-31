-- Fix 1: Update the trigger function to bypass RLS when inserting profiles
-- (SECURITY DEFINER alone isn't enough in Supabase — we need to set the role)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role public.user_role;
BEGIN
  -- Safely cast role from metadata, defaulting to 'glc'
  BEGIN
    _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'glc');
  EXCEPTION WHEN invalid_text_representation THEN
    _role := 'glc';
  END;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    _role
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 2: Replace the INSERT policy on profiles so the trigger can always insert
-- (the old policy blocked inserts when there was no existing admin profile)

DROP POLICY IF EXISTS "Admin can insert profiles" ON public.profiles;

CREATE POLICY "Admin can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if inserting own profile, OR if caller is admin
    id = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Also allow the service role to insert (used by the trigger)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY "Service role bypass"
  ON public.profiles
  TO service_role
  USING (true)
  WITH CHECK (true);
