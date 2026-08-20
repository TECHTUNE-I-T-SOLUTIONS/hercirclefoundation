-- ===========================================================================
-- HerCircle Foundation · Super Admin Management (023)
-- Adds explicit super_admin support to admin_users and seeds the current
-- management model with helper function/policies for super-admin-only access.
-- ===========================================================================

-- 1. Normalize the admin role values.
ALTER TABLE public.admin_users
  ALTER COLUMN role SET DEFAULT 'admin';

ALTER TABLE public.admin_users
  DROP CONSTRAINT IF EXISTS admin_users_role_check;

ALTER TABLE public.admin_users
  ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('admin', 'super_admin'));

UPDATE public.admin_users
SET role = 'admin'
WHERE role IS NULL OR role = '';

-- 2. Helper for server-side checks and RLS expressions.
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE id = p_user_id
      AND role = 'super_admin'
  );
$$;

-- 3. Make sure admin_users can be read by super admins for management screens.
DROP POLICY IF EXISTS admin_users_select ON public.admin_users;
CREATE POLICY admin_users_select ON public.admin_users
  FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS admin_users_update ON public.admin_users;
CREATE POLICY admin_users_update ON public.admin_users
  FOR UPDATE
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS admin_users_insert ON public.admin_users;
CREATE POLICY admin_users_insert ON public.admin_users
  FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

-- 4. Seed note:
-- Convert one existing trusted admin to super_admin manually in SQL if needed:
--   update public.admin_users set role = 'super_admin' where email = 'your@email.com';

