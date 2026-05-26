-- ==============================================================================
-- SQL Script for Admin User Creation & Bug Fixes
-- Run this script in your Supabase SQL Editor.
-- ==============================================================================

-- 1. Fix Foreign Keys for deleting organizations
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_organization_id_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_organization_id_fkey;
ALTER TABLE public.tickets ADD CONSTRAINT tickets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 2. Update is_admin function (just in case)
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Add 'phone' column to profiles if it doesn't exist yet
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- 4. Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 5. Create the RPC function to create a user bypassng email confirmations
CREATE OR REPLACE FUNCTION create_user_by_admin(
  p_email text,
  p_password text,
  p_role user_role,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_org_id uuid
) RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
  v_caller_role user_role;
  v_encrypted_password text;
BEGIN
  -- Fetch caller's role
  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- Any user with role 'admin' is a global admin and can create users anywhere
  IF v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Non autorisé: permissions insuffisantes pour créer cet utilisateur.';
  END IF;

  v_user_id := gen_random_uuid();
  v_encrypted_password := crypt(p_password, gen_salt('bf'));

  -- Insert directly into auth.users to bypass email verification
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    p_email,
    v_encrypted_password,
    now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object(
      'first_name', p_first_name,
      'last_name', p_last_name,
      'phone', p_phone
    ),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- Wait for the trigger 'handle_new_user' to execute.
  -- We update it immediately to the correct role and organization.
  UPDATE public.profiles 
  SET 
    role = p_role,
    organization_id = p_org_id,
    first_name = p_first_name,
    last_name = p_last_name,
    phone = p_phone
  WHERE id = v_user_id;

  RETURN v_user_id;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '%', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create RPC to properly delete a user from auth.users (cascades to profiles)
CREATE OR REPLACE FUNCTION delete_user_by_admin(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_caller_role user_role;
BEGIN
  -- Verify caller
  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- Any user with role 'admin' can delete users
  IF v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Non autorisé: Vous ne pouvez pas supprimer cet utilisateur.';
  END IF;

  -- Delete from auth.users. 
  -- NOTE: This will cascade and delete the profile. 
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
