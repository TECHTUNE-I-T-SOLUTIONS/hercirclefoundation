-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  reference_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (optional)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_all" ON public.notifications FOR SELECT USING (true);

-- Function to insert notification
CREATE OR REPLACE FUNCTION public.notify_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  n_type TEXT;
  n_title TEXT;
  n_body TEXT;
BEGIN
  IF TG_TABLE_NAME = 'donors' THEN
    n_type := 'donation';
    n_title := 'New Donation Received';
    n_body := CONCAT(NEW.full_name, ' donated ₦', COALESCE(NEW.donation_amount::text, '0'));
  ELSIF TG_TABLE_NAME = 'events' THEN
    n_type := 'event';
    n_title := 'New Event Created';
    n_body := NEW.title;
  ELSIF TG_TABLE_NAME = 'volunteers' THEN
    n_type := 'volunteer';
    n_title := 'New Volunteer Application';
    n_body := NEW.full_name;
  ELSIF TG_TABLE_NAME = 'gallery' THEN
    n_type := 'gallery';
    n_title := 'New Gallery Item';
    n_body := NEW.title;
  ELSE
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (type, title, body, reference_id)
  VALUES (n_type, n_title, n_body, NEW.id);

  RETURN NEW;
END;
$$;

-- Create triggers for inserts
DROP TRIGGER IF EXISTS trg_notify_donors_insert ON public.donors;
CREATE TRIGGER trg_notify_donors_insert AFTER INSERT ON public.donors
  FOR EACH ROW EXECUTE FUNCTION public.notify_insert();

DROP TRIGGER IF EXISTS trg_notify_events_insert ON public.events;
CREATE TRIGGER trg_notify_events_insert AFTER INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.notify_insert();

DROP TRIGGER IF EXISTS trg_notify_volunteers_insert ON public.volunteers;
CREATE TRIGGER trg_notify_volunteers_insert AFTER INSERT ON public.volunteers
  FOR EACH ROW EXECUTE FUNCTION public.notify_insert();

DROP TRIGGER IF EXISTS trg_notify_gallery_insert ON public.gallery;
CREATE TRIGGER trg_notify_gallery_insert AFTER INSERT ON public.gallery
  FOR EACH ROW EXECUTE FUNCTION public.notify_insert();

-- Grant rights (if needed)
GRANT SELECT, INSERT ON public.notifications TO anon;
