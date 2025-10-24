-- Create partner_requests table and a trigger to insert notifications on new requests
CREATE TABLE IF NOT EXISTS partner_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  organization text,
  message text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Insert a notification when a new partner request is created
CREATE OR REPLACE FUNCTION notify_new_partner_request() RETURNS trigger AS $$
DECLARE
  has_payload_col BOOLEAN := false;
  notif_payload JSONB;
  notif_title TEXT;
  notif_body TEXT;
BEGIN
  -- Build common payload/title/body
  notif_payload := jsonb_build_object('request_id', NEW.id, 'name', NEW.name, 'email', NEW.email, 'organization', NEW.organization);
  notif_title := 'New Partner Request';
  notif_body := COALESCE(NEW.name, '') || ' (' || COALESCE(NEW.email, '') || ')' || CASE WHEN NEW.organization IS NOT NULL THEN ' from ' || NEW.organization ELSE '' END;

  -- Detect whether notifications table has a jsonb `payload` column.
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'payload'
  ) INTO has_payload_col;

  IF has_payload_col THEN
    INSERT INTO public.notifications (id, type, payload, created_at, is_read)
    VALUES (gen_random_uuid(), 'partner_request', notif_payload, now(), false);
  ELSE
    -- Fall back to older notifications schema using title/body/reference_id
    INSERT INTO public.notifications (id, type, title, body, reference_id, created_at, is_read)
    VALUES (gen_random_uuid(), 'partner_request', notif_title, notif_body, NEW.id, now(), false);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS partner_request_after_insert ON partner_requests;
CREATE TRIGGER partner_request_after_insert
AFTER INSERT ON partner_requests
FOR EACH ROW EXECUTE FUNCTION notify_new_partner_request();
