-- Create admin_users table for admin authentication
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create volunteers table
CREATE TABLE IF NOT EXISTS public.volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  skills TEXT,
  availability TEXT,
  motivation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create donors table
CREATE TABLE IF NOT EXISTS public.donors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  donation_amount DECIMAL(10, 2),
  donation_type TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  image_url TEXT,
  event_type TEXT,
  status TEXT DEFAULT 'upcoming',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create gallery table
CREATE TABLE IF NOT EXISTS public.gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  media_url TEXT NOT NULL,
  media_type TEXT,
  category TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_users (only admins can view/manage)
CREATE POLICY "admin_users_select" ON public.admin_users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "admin_users_update" ON public.admin_users FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for volunteers (public read, authenticated write)
CREATE POLICY "volunteers_select_all" ON public.volunteers FOR SELECT USING (true);
CREATE POLICY "volunteers_insert" ON public.volunteers FOR INSERT WITH CHECK (true);

-- RLS Policies for donors (public read, authenticated write)
CREATE POLICY "donors_select_all" ON public.donors FOR SELECT USING (true);
CREATE POLICY "donors_insert" ON public.donors FOR INSERT WITH CHECK (true);

-- RLS Policies for events (public read, admin write)
CREATE POLICY "events_select_all" ON public.events FOR SELECT USING (true);
CREATE POLICY "events_insert" ON public.events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "events_update" ON public.events FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "events_delete" ON public.events FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for gallery (public read, admin write)
CREATE POLICY "gallery_select_all" ON public.gallery FOR SELECT USING (true);
CREATE POLICY "gallery_insert" ON public.gallery FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "gallery_update" ON public.gallery FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "gallery_delete" ON public.gallery FOR DELETE USING (auth.uid() = created_by);
